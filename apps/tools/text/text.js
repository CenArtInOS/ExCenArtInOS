
/* =========================================
   TEXT APP
   Standalone native HTML editor
   No external libraries or dependencies
========================================= */

(() => {
    "use strict";

    /* =====================================
       ELEMENT REFERENCES
    ===================================== */

    const editor = document.getElementById("editor");
    const editorArea = document.getElementById("editorArea");

    const alignment = document.getElementById("alignment");
    const listOptions = document.getElementById("listOptions");

    const textColor = document.getElementById("textColor");
    const pageColor = document.getElementById("pageColor");
    const watermarkInput = document.getElementById("watermarkInput");

    const watermarkDisplay = document.getElementById("watermarkDisplay");

    const previewScreen = document.getElementById("previewScreen");
    const previewArea = document.getElementById("previewArea");
    const previewWatermark = document.getElementById("previewWatermark");
    const previewContent = document.getElementById("previewContent");

    const saveStatus = document.getElementById("saveStatus");

    const STORAGE_KEY = "exos_text_document_v3";
    const SETTINGS_KEY = "exos_text_settings_v2";

    let savedRange = null;
    let saveTimer = null;


    /* =====================================
       SELECTION PRESERVATION

       Remember the editor selection before
       the user interacts with the toolbar.
    ===================================== */

    function saveSelection() {
        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (editor.contains(range.commonAncestorContainer)) {
            savedRange = range.cloneRange();
        }
    }

    function restoreSelection() {
        if (!savedRange) {
            editor.focus();
            return false;
        }

        try {
            const selection = window.getSelection();

            selection.removeAllRanges();
            selection.addRange(savedRange);

            editor.focus();

            return true;

        } catch (error) {
            editor.focus();
            return false;
        }
    }

    document.addEventListener("selectionchange", () => {
        saveSelection();
        updateToolbarState();
    });

    editor.addEventListener("keyup", saveSelection);
    editor.addEventListener("mouseup", saveSelection);
    editor.addEventListener("touchend", saveSelection);
    editor.addEventListener("input", saveSelection);


    /* =====================================
       NATIVE EDITING COMMAND
    ===================================== */

    function runCommand(command, value = null) {
        restoreSelection();

        try {
            document.execCommand(
                "styleWithCSS",
                false,
                true
            );
        } catch (error) {
            // Continue with the browser's default formatting.
        }

        try {
            document.execCommand(
                command,
                false,
                value
            );

            saveSelection();
            scheduleSave();
            updateToolbarState();

        } catch (error) {
            setStatus("Formatting unavailable");
        }

        editor.focus();
    }


    /* =====================================
       BOLD, ITALIC AND UNDERLINE
    ===================================== */

    document.querySelectorAll("[data-command]").forEach((button) => {

        button.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            saveSelection();
        });

        button.addEventListener("click", () => {
            const command = button.dataset.command;
            runCommand(command);
        });

    });


    /* =====================================
       UNDO AND REDO
    ===================================== */

    const undoButton = document.querySelector('[data-action="undo"]');
    const redoButton = document.querySelector('[data-action="redo"]');

    undoButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        saveSelection();
    });

    redoButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        saveSelection();
    });

    undoButton.addEventListener("click", () => {
        runCommand("undo");
    });

    redoButton.addEventListener("click", () => {
        runCommand("redo");
    });


    /* =====================================
       ALIGNMENT
    ===================================== */

    alignment.addEventListener("pointerdown", saveSelection);
    alignment.addEventListener("focus", saveSelection);

    alignment.addEventListener("change", () => {
        runCommand(alignment.value);
    });


    /* =====================================
       LIST OPTIONS
    ===================================== */

    listOptions.addEventListener("pointerdown", saveSelection);
    listOptions.addEventListener("focus", saveSelection);

    listOptions.addEventListener("change", () => {

        if (!listOptions.value) {
            editor.focus();
            return;
        }

        runCommand(listOptions.value);

        listOptions.value = "";
    });


    /* =====================================
       TEXT COLOUR
    ===================================== */

    textColor.addEventListener("pointerdown", saveSelection);

    textColor.addEventListener("change", () => {
        runCommand("foreColor", textColor.value);
    });


    /* =====================================
       PAGE BACKGROUND COLOUR
    ===================================== */

    function applyPageColor(color) {
        editorArea.style.backgroundColor = color;
        previewArea.style.backgroundColor = color;
    }

    pageColor.addEventListener("input", () => {
        applyPageColor(pageColor.value);
        saveSettings();
    });


    /* =====================================
       WATERMARK
    ===================================== */

    function applyWatermark(value) {
        const text = value.trim();

        watermarkDisplay.textContent = text;
        previewWatermark.textContent = text;

        watermarkDisplay.style.display = text ? "flex" : "none";
        previewWatermark.style.display = text ? "flex" : "none";
    }

    watermarkInput.addEventListener("input", () => {
        applyWatermark(watermarkInput.value);
        saveSettings();
    });


    /* =====================================
       SAVE STATUS
    ===================================== */

    function setStatus(message) {
        saveStatus.textContent = message;
    }


    /* =====================================
       AUTOMATIC LOCAL DOCUMENT SAVING
    ===================================== */

    function scheduleSave() {
        clearTimeout(saveTimer);

        setStatus("Saving...");

        saveTimer = setTimeout(saveDocument, 400);
    }

    function saveDocument() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                editor.innerHTML
            );

            setStatus("Saved locally");

        } catch (error) {
            setStatus("Unable to save document");
        }
    }

    function saveSettings() {
        try {
            const settings = {
                pageColor: pageColor.value,
                textColor: textColor.value,
                watermark: watermarkInput.value
            };

            localStorage.setItem(
                SETTINGS_KEY,
                JSON.stringify(settings)
            );

        } catch (error) {
            setStatus("Unable to save settings");
        }
    }

    editor.addEventListener("input", scheduleSave);


    /* =====================================
       LOAD DOCUMENT
    ===================================== */

    function loadDocument() {
        try {
            let stored = localStorage.getItem(STORAGE_KEY);

            // Migrate an older HTML document if available.
            if (!stored) {
                const oldDocument = localStorage.getItem(
                    "exos_text_document_v2"
                );

                if (oldDocument) {
                    try {
                        const parsed = JSON.parse(oldDocument);

                        // Do not treat a Quill Delta as HTML.
                        if (parsed && Array.isArray(parsed.ops)) {
                            stored = "";
                        } else {
                            stored = oldDocument;
                        }

                    } catch (error) {
                        stored = oldDocument;
                    }
                }
            }

            if (stored) {
                editor.innerHTML = stored;
            }

        } catch (error) {
            setStatus("Could not load saved document");
        }
    }


    /* =====================================
       LOAD SETTINGS
    ===================================== */

    function loadSettings() {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY);

            if (stored) {
                const settings = JSON.parse(stored);

                if (settings.pageColor) {
                    pageColor.value = settings.pageColor;
                }

                if (settings.textColor) {
                    textColor.value = settings.textColor;
                }

                if (typeof settings.watermark === "string") {
                    watermarkInput.value = settings.watermark;
                }
            }

        } catch (error) {
            // Use the default settings.
        }

        applyPageColor(pageColor.value);
        applyWatermark(watermarkInput.value);
    }


    /* =====================================
       PREVIEW
    ===================================== */

    document.getElementById("previewButton").addEventListener("click", () => {

        saveDocument();

        previewContent.innerHTML = editor.innerHTML;

        previewArea.style.backgroundColor = pageColor.value;

        previewWatermark.textContent = watermarkInput.value.trim();

        previewWatermark.style.display =
            watermarkInput.value.trim() ? "flex" : "none";

        previewScreen.hidden = false;
    });

    document.getElementById("closePreview").addEventListener("click", () => {
        previewScreen.hidden = true;
    });


    /* =====================================
       DOWNLOAD PLAIN TEXT
    ===================================== */

    document.getElementById("downloadButton").addEventListener("click", () => {

        const plainText = editor.innerText || editor.textContent || "";

        const blob = new Blob(
            [plainText],
            { type: "text/plain;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "document.txt";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });


    /* =====================================
       TOOLBAR ACTIVE STATES
    ===================================== */

    function updateToolbarState() {
        if (!editor.contains(document.activeElement) &&
            !savedRange) {
            return;
        }

        document.querySelectorAll("[data-command]").forEach((button) => {

            const command = button.dataset.command;

            try {
                button.classList.toggle(
                    "active",
                    document.queryCommandState(command)
                );
            } catch (error) {
                button.classList.remove("active");
            }

        });

        try {
            const currentAlignment = document.queryCommandValue("justifyLeft");

            if (currentAlignment === "true") {
                alignment.value = "justifyLeft";
            }
        } catch (error) {
            // Keep the current selection.
        }
    }


    /* =====================================
       KEYBOARD SHORTCUTS
    ===================================== */

    editor.addEventListener("keydown", (event) => {

        if ((event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "s") {

            event.preventDefault();
            saveDocument();
        }

    });


    /* =====================================
       INITIALISE APP
    ===================================== */

    loadSettings();
    loadDocument();

    setStatus("Saved locally");

})();
