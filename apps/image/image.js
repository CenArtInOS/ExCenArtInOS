
/* =====================================
   ExCenArtInOS Image Viewer
   Zoom, rotation, flip and image panning
===================================== */

(() => {
    "use strict";

    const imageSearch = document.getElementById("imageSearch");
    const imageInput = document.getElementById("imageInput");
    const folderInput = document.getElementById("folderInput");

    const folderBtn = document.getElementById("folderBtn");
    const imageBtn = document.getElementById("imageBtn");
    const emptyAddBtn = document.getElementById("emptyAddBtn");

    const thumbnailList = document.getElementById("thumbnailList");
    const viewer = document.querySelector(".viewer");
    const mainImage = document.getElementById("mainImage");
    const emptyState = document.getElementById("emptyState");

    const imageInfo = document.getElementById("imageInfo");
    const imageName = document.getElementById("imageName");

    const rotateSlider = document.getElementById("rotateSlider");
    const rotateValue = document.getElementById("rotateValue");
    const flipBtn = document.getElementById("flipBtn");

    const zoomOut = document.getElementById("zoomOut");
    const zoomIn = document.getElementById("zoomIn");
    const zoomValue = document.getElementById("zoomValue");

    let images = [];
    let selectedIndex = -1;

    let rotation = 0;
    let zoom = 100;
    let flipped = false;

    const MIN_ZOOM = 25;
    const MAX_ZOOM = 400;
    const ZOOM_STEP = 10;

    let baseWidth = 0;
    let baseHeight = 0;

    let dragPointerId = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let scrollStartLeft = 0;
    let scrollStartTop = 0;

    /* Add image files */
    function addFiles(fileList) {
        const files = Array.from(fileList).filter(file =>
            file.type.startsWith("image/")
        );

        if (!files.length) return;

        files.forEach(file => {
            images.push({
                name: file.name,
                file,
                url: URL.createObjectURL(file)
            });
        });

        renderThumbnails();

        if (selectedIndex === -1) {
            selectImage(0);
        }
    }

    /* File pickers */
    imageBtn.addEventListener("click", () => imageInput.click());
    emptyAddBtn.addEventListener("click", () => imageInput.click());
    folderBtn.addEventListener("click", () => folderInput.click());

    imageInput.addEventListener("change", event => {
        addFiles(event.target.files);
        event.target.value = "";
    });

    folderInput.addEventListener("change", event => {
        addFiles(event.target.files);
        event.target.value = "";
    });

    /* Render thumbnails */
    function renderThumbnails() {
        thumbnailList.innerHTML = "";

        const search = imageSearch.value.trim().toLowerCase();

        const visibleImages = images
            .map((image, index) => ({ image, index }))
            .filter(item => item.image.name.toLowerCase().includes(search));

        if (!visibleImages.length) {
            const empty = document.createElement("div");
            empty.className = "empty-thumbnails";
            empty.textContent = images.length
                ? "No matching images"
                : "No images";

            thumbnailList.appendChild(empty);
            return;
        }

        visibleImages.forEach(({ image, index }) => {
            const thumbnail = document.createElement("div");
            thumbnail.className = "thumbnail";

            if (index === selectedIndex) {
                thumbnail.classList.add("active");
            }

            const img = document.createElement("img");
            img.src = image.url;
            img.alt = image.name;

            thumbnail.appendChild(img);

            thumbnail.addEventListener("click", () => {
                selectImage(index);
            });

            thumbnailList.appendChild(thumbnail);
        });
    }

    imageSearch.addEventListener("input", renderThumbnails);

    /* Select image */
    function selectImage(index) {
        if (index < 0 || index >= images.length) return;

        selectedIndex = index;

        rotation = 0;
        zoom = 100;
        flipped = false;

        mainImage.src = images[index].url;
        mainImage.hidden = false;

        emptyState.hidden = true;
        imageInfo.hidden = false;
        imageName.textContent = images[index].name;

        updateControls();
        renderThumbnails();

        viewer.scrollLeft = 0;
        viewer.scrollTop = 0;
    }

    /* Get the image's normal fitted size */
    function calculateBaseSize() {
        const imageWidth = mainImage.naturalWidth;
        const imageHeight = mainImage.naturalHeight;

        if (!imageWidth || !imageHeight) return;

        const availableWidth = Math.max(1, viewer.clientWidth - 16);
        const availableHeight = Math.max(1, viewer.clientHeight - 16);

        const fitScale = Math.min(
            availableWidth / imageWidth,
            availableHeight / imageHeight,
            1
        );

        baseWidth = imageWidth * fitScale;
        baseHeight = imageHeight * fitScale;
    }

    /* Size the image surface to allow scrolling */
    function updateImageSize() {
        if (!mainImage.naturalWidth) return;

        calculateBaseSize();

        const radians = rotation * Math.PI / 180;
        const cos = Math.abs(Math.cos(radians));
        const sin = Math.abs(Math.sin(radians));

        const scaledWidth = baseWidth * zoom / 100;
        const scaledHeight = baseHeight * zoom / 100;

        const rotatedWidth = scaledWidth * cos + scaledHeight * sin;
        const rotatedHeight = scaledWidth * sin + scaledHeight * cos;

        mainImage.style.width = `${baseWidth}px`;
        mainImage.style.height = `${baseHeight}px`;

        mainImage.style.maxWidth = "none";
        mainImage.style.maxHeight = "none";

        const flipScale = flipped ? -1 : 1;

        mainImage.style.transform =
            `rotate(${rotation}deg) scale(${zoom / 100 * flipScale}, ${zoom / 100})`;

        /* The image element's layout box becomes the full zoomed bounds */
        const surfaceWidth = Math.max(
            viewer.clientWidth - 16,
            Math.ceil(rotatedWidth)
        );

        const surfaceHeight = Math.max(
            viewer.clientHeight - 16,
            Math.ceil(rotatedHeight)
        );

        mainImage.style.width = `${surfaceWidth}px`;
        mainImage.style.height = `${surfaceHeight}px`;

        mainImage.style.objectFit = "contain";
    }

    /* Update controls and image */
    function updateControls() {
        rotateSlider.value = rotation;
        rotateValue.value = rotation;
        zoomValue.value = zoom;

        updateImageSize();
    }

    /* Rotation slider */
    rotateSlider.addEventListener("input", () => {
        rotation = Number(rotateSlider.value);
        updateControls();
    });

    /* Type rotation */
    function applyTypedRotation() {
        const value = Number(rotateValue.value);

        if (!Number.isFinite(value)) {
            rotateValue.value = rotation;
            return;
        }

        rotation = Math.max(-180, Math.min(180, value));
        updateControls();
    }

    rotateValue.addEventListener("change", applyTypedRotation);

    rotateValue.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            applyTypedRotation();
            rotateValue.blur();
        }
    });

    /* Horizontal flip */
    flipBtn.addEventListener("click", () => {
        flipped = !flipped;
        updateImageSize();
    });

    /* Zoom */
    function setZoom(value) {
        if (!Number.isFinite(value)) return;

        const oldZoom = zoom;

        zoom = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, value)
        );

        if (zoom === oldZoom) return;

        const centerX = (viewer.scrollLeft + viewer.clientWidth / 2);
        const centerY = (viewer.scrollTop + viewer.clientHeight / 2);

        const ratio = zoom / oldZoom;

        updateControls();

        /* Keep the viewing position near the same image point */
        requestAnimationFrame(() => {
            viewer.scrollLeft = centerX * ratio - viewer.clientWidth / 2;
            viewer.scrollTop = centerY * ratio - viewer.clientHeight / 2;
        });
    }

    zoomIn.addEventListener("click", () => {
        setZoom(zoom + ZOOM_STEP);
    });

    zoomOut.addEventListener("click", () => {
        setZoom(zoom - ZOOM_STEP);
    });

    /* Typed zoom percentage */
    function applyTypedZoom() {
        const value = Number(zoomValue.value);

        if (!Number.isFinite(value)) {
            zoomValue.value = zoom;
            return;
        }

        setZoom(value);
    }

    zoomValue.addEventListener("change", applyTypedZoom);

    zoomValue.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            applyTypedZoom();
            zoomValue.blur();
        }
    });

    /* Drag to pan */
    mainImage.addEventListener("pointerdown", event => {
        if (zoom <= 100) return;

        dragPointerId = event.pointerId;

        dragStartX = event.clientX;
        dragStartY = event.clientY;

        scrollStartLeft = viewer.scrollLeft;
        scrollStartTop = viewer.scrollTop;

        mainImage.classList.add("dragging");

        mainImage.setPointerCapture(event.pointerId);
    });

    mainImage.addEventListener("pointermove", event => {
        if (dragPointerId !== event.pointerId) return;

        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;

        viewer.scrollLeft = scrollStartLeft - dx;
        viewer.scrollTop = scrollStartTop - dy;
    });

    function finishDrag(event) {
        if (dragPointerId !== event.pointerId) return;

        dragPointerId = null;
        mainImage.classList.remove("dragging");
    }

    mainImage.addEventListener("pointerup", finishDrag);
    mainImage.addEventListener("pointercancel", finishDrag);

    mainImage.addEventListener("lostpointercapture", () => {
        dragPointerId = null;
        mainImage.classList.remove("dragging");
    });

    /* Recalculate when viewer size changes */
    window.addEventListener("resize", () => {
        if (selectedIndex === -1) return;

        updateImageSize();
    });

    /* Release image URLs */
    window.addEventListener("beforeunload", () => {
        images.forEach(image => URL.revokeObjectURL(image.url));
    });

    /* Recalculate after image loads */
    mainImage.addEventListener("load", () => {
        updateControls();
        viewer.scrollLeft = 0;
        viewer.scrollTop = 0;
    });

})();
