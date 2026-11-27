
/* =========================================
   ExCenArtInOS Video Player
   Library, playback and cinema mode
========================================= */

"use strict";

/* Elements */

const app = document.getElementById("video-app");
const video = document.getElementById("video-element");
const videoList = document.getElementById("video-list");

const videoInput = document.getElementById("video-files");
const folderInput = document.getElementById("folder-files");
const searchInput = document.getElementById("video-search");

const videoTitle = document.getElementById("video-title");
const videoDetails = document.getElementById("video-details");
const videoInformation = document.getElementById("video-information");
const placeholder = document.getElementById("video-placeholder");

const playButton = document.getElementById("play-button");
const previousButton = document.getElementById("previous-button");
const nextButton = document.getElementById("next-button");
const muteButton = document.getElementById("mute-button");

const seekBar = document.getElementById("video-seek");
const currentTimeText = document.getElementById("current-time");
const totalTimeText = document.getElementById("total-time");

const orientationButton = document.getElementById("orientation-toggle");
const cinemaExitButton = document.getElementById("cinema-exit");
const controlsToggleButton = document.getElementById("controls-toggle");

const speedButtons = document.querySelectorAll(".speed-button");

/* Library state */

let library = [];
let currentIndex = -1;
let currentObjectURL = null;
let informationTimer = null;


/* =========================================
   Helpers
========================================= */

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "00:00";

    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) {
        return (
            String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(secs).padStart(2, "0")
        );
    }

    return (
        String(minutes).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0")
    );
}

function isVideoFile(file) {
    if (file.type && file.type.startsWith("video/")) return true;

    return /\.(mp4|m4v|webm|ogv|mov|mkv|avi|3gp|mpeg|mpg)$/i.test(file.name);
}

function getFileKey(file) {
    return [file.name, file.size, file.lastModified].join("_");
}


/* =========================================
   Cinema / landscape mode
========================================= */

function notifyLauncher(active) {
    if (window.parent !== window) {
        window.parent.postMessage({
            type: "EXCENARTINOS_VIDEO_CINEMA",
            active: active
        }, "*");
    }
}

function enterCinemaMode() {
    app.classList.add("cinema-mode");
    app.classList.remove("controls-hidden");

    controlsToggleButton.textContent = "×";
    controlsToggleButton.title = "Hide controls";

    notifyLauncher(true);
}

function exitCinemaMode() {
    app.classList.remove("cinema-mode", "controls-hidden");

    controlsToggleButton.textContent = "×";
    controlsToggleButton.title = "Hide controls";

    notifyLauncher(false);
}

orientationButton.addEventListener("click", enterCinemaMode);
cinemaExitButton.addEventListener("click", exitCinemaMode);


/* =========================================
   Show / hide playback controls
========================================= */

function toggleControls() {
    if (!app.classList.contains("cinema-mode")) return;

    const hidden = app.classList.toggle("controls-hidden");

    controlsToggleButton.textContent = hidden ? "☰" : "×";

    controlsToggleButton.title = hidden
        ? "Show controls"
        : "Hide controls";
}

controlsToggleButton.addEventListener("click", toggleControls);


/* =========================================
   Filename overlay
========================================= */

function showVideoInformation() {
    clearTimeout(informationTimer);
    videoInformation.classList.remove("is-hidden");
}

function hideVideoInformationAfterDelay() {
    clearTimeout(informationTimer);

    informationTimer = setTimeout(() => {
        if (!video.paused && !video.ended) {
            videoInformation.classList.add("is-hidden");
        }
    }, 3000);
}


/* =========================================
   Library
========================================= */

function addFiles(files) {
    const existing = new Set(library.map(item => item.key));

    Array.from(files).forEach(file => {
        if (!isVideoFile(file)) return;

        const key = getFileKey(file);
        if (existing.has(key)) return;

        existing.add(key);

        library.push({
            file,
            key,
            name: file.name,
            duration: 0,
            thumbnail: null,
            thumbnailLoading: false
        });
    });

    library.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base"
        })
    );

    renderLibrary();
    generateThumbnails();
}

function renderLibrary() {
    const query = searchInput.value.trim().toLowerCase();

    const filtered = library
        .map((item, index) => ({ item, index }))
        .filter(entry => entry.item.name.toLowerCase().includes(query));

    videoList.innerHTML = "";

    if (!filtered.length) {
        const empty = document.createElement("div");

        empty.className = "empty-library";
        empty.textContent = library.length
            ? "No matching videos"
            : "Select a folder or add videos";

        videoList.appendChild(empty);
        return;
    }

    filtered.forEach(({ item, index }) => {
        const row = document.createElement("div");
        row.className = "video-item";

        if (index === currentIndex) {
            row.classList.add("active");
        }

        if (item.thumbnail) {
            const image = document.createElement("img");

            image.className = "video-thumbnail";
            image.src = item.thumbnail;
            image.alt = "";

            row.appendChild(image);
        } else {
            const image = document.createElement("div");

            image.className = "video-thumbnail-placeholder";
            image.textContent = "▶";

            row.appendChild(image);
        }

        const info = document.createElement("div");
        info.className = "video-item-info";

        const title = document.createElement("div");
        title.className = "video-item-title";
        title.textContent = item.name;

        const duration = document.createElement("div");
        duration.className = "video-item-duration";
        duration.textContent = item.duration
            ? formatTime(item.duration)
            : "Video";

        info.append(title, duration);
        row.appendChild(info);

        row.addEventListener("click", () => playVideo(index));

        videoList.appendChild(row);
    });
}


/* =========================================
   Thumbnail generation
========================================= */

function generateThumbnails() {
    library.forEach(item => {
        if (item.thumbnail || item.thumbnailLoading) return;

        item.thumbnailLoading = true;

        const temporaryURL = URL.createObjectURL(item.file);
        const temporaryVideo = document.createElement("video");

        temporaryVideo.preload = "metadata";
        temporaryVideo.muted = true;
        temporaryVideo.src = temporaryURL;

        let finished = false;

        function cleanup() {
            if (finished) return;

            finished = true;
            item.thumbnailLoading = false;

            URL.revokeObjectURL(temporaryURL);

            temporaryVideo.removeAttribute("src");
            temporaryVideo.load();
        }

        temporaryVideo.addEventListener("loadedmetadata", () => {
            item.duration = temporaryVideo.duration || 0;

            temporaryVideo.currentTime = Math.min(
                1,
                Math.max(0, (temporaryVideo.duration || 0) / 4)
            );
        }, { once: true });

        temporaryVideo.addEventListener("seeked", () => {
            try {
                const canvas = document.createElement("canvas");

                canvas.width = 160;
                canvas.height = 90;

                const context = canvas.getContext("2d");
                context.drawImage(temporaryVideo, 0, 0, 160, 90);

                item.thumbnail = canvas.toDataURL("image/jpeg", 0.65);
            } catch (error) {
                console.warn("Thumbnail unavailable:", error);
            }

            cleanup();
            renderLibrary();
        }, { once: true });

        temporaryVideo.addEventListener("error", () => {
            cleanup();
            renderLibrary();
        }, { once: true });

        setTimeout(() => {
            if (!finished) {
                cleanup();
                renderLibrary();
            }
        }, 10000);
    });
}


/* =========================================
   Play video
========================================= */

function playVideo(index) {
    if (index < 0 || index >= library.length) return;

    currentIndex = index;

    const item = library[index];

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
    }

    currentObjectURL = URL.createObjectURL(item.file);

    video.pause();
    video.src = currentObjectURL;
    video.load();

    video.classList.add("is-visible");
    placeholder.classList.add("hidden");

    videoTitle.textContent = item.name;

    videoDetails.textContent = item.duration
        ? formatTime(item.duration)
        : "Loading video";

    showVideoInformation();

    video.play().catch(() => {
        playButton.textContent = "▶";
        showVideoInformation();
    });

    renderLibrary();
}

function playNext() {
    if (!library.length) return;

    playVideo((currentIndex + 1) % library.length);
}

function playPrevious() {
    if (!library.length) return;

    playVideo(
        (currentIndex - 1 + library.length) % library.length
    );
}


/* =========================================
   File and folder selection
========================================= */

document.getElementById("video-button").addEventListener("click", () => {
    videoInput.click();
});

document.getElementById("folder-button").addEventListener("click", async () => {
    if (window.showDirectoryPicker) {
        try {
            const directory = await window.showDirectoryPicker();
            const files = [];

            async function readDirectory(handle) {
                for await (const entry of handle.values()) {
                    if (entry.kind === "file") {
                        files.push(await entry.getFile());
                    } else if (entry.kind === "directory") {
                        await readDirectory(entry);
                    }
                }
            }

            await readDirectory(directory);
            addFiles(files);

        } catch (error) {
            if (error.name !== "AbortError") {
                folderInput.click();
            }
        }
    } else {
        folderInput.click();
    }
});

videoInput.addEventListener("change", event => {
    addFiles(event.target.files);
    event.target.value = "";
});

folderInput.addEventListener("change", event => {
    addFiles(event.target.files);
    event.target.value = "";
});

searchInput.addEventListener("input", renderLibrary);


/* =========================================
   Playback buttons
========================================= */

playButton.addEventListener("click", () => {
    if (!video.src) return;

    if (video.paused) {
        video.play().catch(() => {});
    } else {
        video.pause();
    }
});

previousButton.addEventListener("click", playPrevious);
nextButton.addEventListener("click", playNext);

video.addEventListener("play", () => {
    playButton.textContent = "Ⅱ";

    showVideoInformation();
    hideVideoInformationAfterDelay();
});

video.addEventListener("pause", () => {
    playButton.textContent = "▶";

    clearTimeout(informationTimer);
    showVideoInformation();
});

video.addEventListener("ended", () => {
    playButton.textContent = "▶";
    showVideoInformation();

    playNext();
});


/* =========================================
   Timeline
========================================= */

video.addEventListener("loadedmetadata", () => {
    totalTimeText.textContent = formatTime(video.duration);

    if (currentIndex >= 0) {
        library[currentIndex].duration = video.duration || 0;

        videoDetails.textContent = formatTime(video.duration);

        renderLibrary();
    }
});

video.addEventListener("timeupdate", () => {
    currentTimeText.textContent = formatTime(video.currentTime);

    if (Number.isFinite(video.duration) && video.duration > 0) {
        seekBar.value = (video.currentTime / video.duration) * 1000;
    }
});

seekBar.addEventListener("input", () => {
    if (video.duration > 0) {
        video.currentTime =
            (Number(seekBar.value) / 1000) * video.duration;
    }
});


/* =========================================
   Mute / unmute
========================================= */

video.volume = 1;

muteButton.addEventListener("click", () => {
    video.muted = !video.muted;

    muteButton.textContent = video.muted ? "Sound" : "Mute";
    muteButton.title = video.muted ? "Unmute" : "Mute";
});


/* =========================================
   Playback speed
========================================= */

speedButtons.forEach(button => {
    button.addEventListener("click", () => {
        const speed = Number(button.dataset.speed);

        video.playbackRate = speed;

        speedButtons.forEach(item => {
            item.classList.toggle("active", item === button);
        });
    });
});


/* =========================================
   Keyboard shortcuts
========================================= */

document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName;

    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        return;
    }

    if (event.code === "Space") {
        event.preventDefault();
        playButton.click();
    }

    if (event.code === "ArrowRight") {
        video.currentTime = Math.min(
            video.duration || 0,
            video.currentTime + 5
        );
    }

    if (event.code === "ArrowLeft") {
        video.currentTime = Math.max(0, video.currentTime - 5);
    }

    if (event.key === "Escape" &&
        app.classList.contains("cinema-mode")) {
        exitCinemaMode();
    }
});


/* =========================================
   Cleanup
========================================= */

window.addEventListener("pagehide", () => {
    clearTimeout(informationTimer);

    notifyLauncher(false);

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }
});
