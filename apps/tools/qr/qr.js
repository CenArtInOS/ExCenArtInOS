
// =========================================
// EXCENARTINOS QR GENERATOR
// QR creation, validation and PNG download
// =========================================

const qrInput = document.getElementById("qrInput");
const qrBox = document.getElementById("qrBox");
const qrPlaceholder = document.getElementById("qrPlaceholder");

const info = document.getElementById("info");
const qrStatus = document.getElementById("qrStatus");
const characterCount = document.getElementById("characterCount");

const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearInput");
const regenerateButton = document.getElementById("regenerateButton");

const MAX_LENGTH = 300;
const QR_SIZE = 160;

let qrInstance = null;
let generatedContent = "";

// -----------------------------------------
// Status messages
// -----------------------------------------

function setInfo(message, type = "") {
    info.textContent = message;
    info.className = "qr-info";

    if (type) {
        info.classList.add(type);
    }
}

function setStatus(message) {
    qrStatus.textContent = message;
}

// -----------------------------------------
// Character counter
// -----------------------------------------

function updateCharacterCount() {
    const length = Array.from(qrInput.value).length;

    characterCount.textContent =
        length + " / " + MAX_LENGTH + " characters";

    characterCount.style.color =
        length >= MAX_LENGTH ? "#ff8585" : "#777777";
}

qrInput.addEventListener("input", updateCharacterCount);

// -----------------------------------------
// Clear QR preview
// -----------------------------------------

function clearQRPreview() {
    qrBox.replaceChildren();
    qrBox.classList.remove("visible");

    qrPlaceholder.style.display = "flex";

    qrInstance = null;
    generatedContent = "";

    downloadButton.disabled = true;
    copyButton.disabled = true;
    regenerateButton.disabled = true;

    setStatus("Waiting for input");
}

// -----------------------------------------
// Validate input
// -----------------------------------------

function validateInput() {
    const input = qrInput.value.trim();
    const length = Array.from(input).length;

    if (!input) {
        setInfo("Input cannot be empty or contain only spaces.", "error");
        setStatus("Empty input");
        return null;
    }

    if (length > MAX_LENGTH) {
        setInfo(
            "Maximum limit exceeded. Only 300 characters are allowed.",
            "error"
        );

        setStatus("Input too long");
        return null;
    }

    return input;
}

// -----------------------------------------
// Generate QR code
// -----------------------------------------

function generateQR() {
    const input = validateInput();

    if (input === null) {
        return;
    }

    if (typeof QRCode === "undefined") {
        setInfo(
            "QR library could not load. Check your internet connection and reload the tool.",
            "error"
        );

        setStatus("Library unavailable");
        return;
    }

    // Remove previous QR code
    clearQRPreview();

    try {
        qrInstance = new QRCode(qrBox, {
            text: input,
            width: QR_SIZE,
            height: QR_SIZE,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        generatedContent = input;

        qrBox.classList.add("visible");
        qrPlaceholder.style.display = "none";

        downloadButton.disabled = false;
        copyButton.disabled = false;
        regenerateButton.disabled = false;

        setInfo("QR code generated successfully.", "success");
        setStatus("Generated");

    } catch (error) {
        clearQRPreview();

        setInfo(
            "Unable to generate this QR code. Try shorter or simpler content.",
            "error"
        );

        setStatus("Generation failed");
    }
}

// -----------------------------------------
// Download QR as PNG
// -----------------------------------------

function downloadQR() {
    if (!generatedContent || !qrInstance) {
        setInfo("Generate a QR code before downloading.", "error");
        return;
    }

    try {
        const canvas = qrBox.querySelector("canvas");
        const image = qrBox.querySelector("img");

        let imageURL;

        if (canvas) {
            imageURL = canvas.toDataURL("image/png");
        } else if (image && image.src) {
            imageURL = image.src;
        } else {
            setInfo("QR image is not ready yet. Try again.", "error");
            return;
        }

        const link = document.createElement("a");

        link.href = imageURL;
        link.download = "excenartinos-qr.png";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setInfo("QR code PNG download started.", "success");

    } catch (error) {
        setInfo(
            "Unable to download the QR image on this device.",
            "error"
        );
    }
}

// -----------------------------------------
// Copy input content
// -----------------------------------------

async function copyContent() {
    if (!generatedContent) {
        setInfo("Generate a QR code first.", "error");
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(generatedContent);
        } else {
            const temporaryInput = document.createElement("textarea");

            temporaryInput.value = generatedContent;
            temporaryInput.style.position = "fixed";
            temporaryInput.style.opacity = "0";

            document.body.appendChild(temporaryInput);

            temporaryInput.select();

            const successful = document.execCommand("copy");

            temporaryInput.remove();

            if (!successful) {
                throw new Error("Copy failed");
            }
        }

        setInfo("Content copied to clipboard.", "success");

    } catch (error) {
        setInfo(
            "Clipboard access is unavailable. Select and copy the text manually.",
            "error"
        );
    }
}

// -----------------------------------------
// Clear input and generated QR
// -----------------------------------------

function clearInput() {
    qrInput.value = "";

    updateCharacterCount();
    clearQRPreview();

    setInfo("Enter your content and generate a QR code.");
    qrInput.focus();
}

// -----------------------------------------
// Event listeners
// -----------------------------------------

generateButton.addEventListener("click", generateQR);

downloadButton.addEventListener("click", downloadQR);

copyButton.addEventListener("click", copyContent);

clearButton.addEventListener("click", clearInput);

regenerateButton.addEventListener("click", generateQR);

// Ctrl + Enter generates QR
qrInput.addEventListener("keydown", function(event) {
    if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        generateQR();
    }
});

// -----------------------------------------
// Initial state
// -----------------------------------------

updateCharacterCount();
clearQRPreview();
