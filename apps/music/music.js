
(() => {
    "use strict";

    // =========================================================
    // 1. ELEMENT REFERENCES
    // =========================================================

    const $ = id => document.getElementById(id);

    const audio = $("audio-player");
    const libraryList = $("library-list");

    const folderInput = $("folder-input");
    const musicFilesInput = $("music-files-input");
    const musicSearch = $("music-search");

    const albumArt = $("album-art");
    const artworkPlaceholder = $("artwork-placeholder");

    const trackTitle = $("track-title");
    const trackArtist = $("track-artist");

    const seekBar = $("seek-bar");
    const currentTimeDisplay = $("current-time");
    const totalTimeDisplay = $("total-time");

    const playButton = $("play-button");
    const previousButton = $("previous-button");
    const nextButton = $("next-button");
    const shuffleButton = $("shuffle-button");
    const repeatButton = $("repeat-button");
    const volumeBar = $("volume-bar");

    // =========================================================
    // 2. MUSIC LIBRARY AND PLAYER STATE
    // =========================================================

    let songs = [];
    let currentSong = null;

    let shuffle = false;
    let repeat = "off"; // off, all, one

    let audioContext = null;
    let audioSource = null;
    let equalizerFilters = [];
    let equalizerInitialized = false;

    let currentEQ = [0, 0, 0, 0, 0, 0, 0];

    const frequencies = [
        60, 150, 400, 1000, 2400, 6000, 14000
    ];

    const presets = {
        "Flat": [0, 0, 0, 0, 0, 0, 0],
        "Bass Boost": [8, 6, 3, 0, -1, -2, -2],
        "Vocal": [-3, -2, 0, 5, 6, 3, 0],
        "Treble": [-4, -3, -1, 1, 4, 7, 8],
        "Heavy": [7, 5, 3, 0, 2, 4, 3],
        "Light": [-3, -2, 0, 1, 2, 2, 1],
        "Instrument": [3, 3, 1, -2, 3, 5, 3],
        "Voice + Bass": [6, 4, 0, 5, 6, 2, 0],
        "Acoustic": [2, 2, 1, 2, 3, 2, 1]
    };

    const allowedExtensions = [
        "mp3", "wav", "ogg", "m4a",
        "aac", "flac", "opus", "wma",
        "aiff", "aif", "alac"
    ];

    // =========================================================
    // 3. GENERAL UTILITIES
    // =========================================================

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "00:00";
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remainingSeconds).padStart(2, "0")
        );
    }

    function getExtension(file) {
        return file.name.split(".").pop().toLowerCase();
    }

    function isAudioFile(file) {
        if (!file) return false;

        return (
            file.type.startsWith("audio/") ||
            allowedExtensions.includes(getExtension(file))
        );
    }

    function fileIdentity(file) {
        return [
            file.name,
            file.size,
            file.lastModified
        ].join("_");
    }

    function getSortGroup(title) {
        const first = (title || "").trim().charAt(0).toUpperCase();

        if (/[A-Z]/.test(first)) return first;
        if (/[0-9]/.test(first)) return "#";

        return "#";
    }

    function sortSongs() {
        songs.sort((a, b) => {
            const groupA = getSortGroup(a.title);
            const groupB = getSortGroup(b.title);

            if (groupA !== groupB) {
                if (groupA === "#") return 1;
                if (groupB === "#") return -1;
                return groupA.localeCompare(groupB);
            }

            return (a.title || "").localeCompare(
                b.title || "",
                undefined,
                { sensitivity: "base" }
            );
        });
    }

    // =========================================================
    // 4. ADD MUSIC: FOLDER AND INDIVIDUAL FILES
    // =========================================================

    const folderButton = $("scan-music");
    const addMusicButton = $("add-music-files");

    if (folderButton) {
        folderButton.addEventListener("click", async () => {

            // Modern browser folder picker
            if ("showDirectoryPicker" in window) {
                try {
                    const directory = await window.showDirectoryPicker();

                    const selectedFiles = [];

                    async function scanDirectory(handle) {
                        for await (const entry of handle.values()) {

                            if (entry.kind === "file") {
                                const file = await entry.getFile();

                                if (isAudioFile(file)) {
                                    selectedFiles.push(file);
                                }

                            } else if (entry.kind === "directory") {
                                await scanDirectory(entry);
                            }
                        }
                    }

                    await scanDirectory(directory);

                    const added = addFiles(selectedFiles);

                    if (added === 0) {
                        alert("No new supported music files were found.");
                    }

                    return;

                } catch (error) {
                    if (error.name === "AbortError") return;

                    console.warn(
                        "Folder picker unavailable. Trying fallback.",
                        error
                    );
                }
            }

            // Browser fallback
            if (folderInput) {
                folderInput.click();
            }
        });
    }

    // Individual or multiple music files
    if (addMusicButton && musicFilesInput) {
        addMusicButton.addEventListener("click", () => {
            musicFilesInput.click();
        });
    }

    if (folderInput) {
        folderInput.addEventListener("change", () => {
            addFiles(folderInput.files);
            folderInput.value = "";
        });
    }

    if (musicFilesInput) {
        musicFilesInput.addEventListener("change", () => {
            addFiles(musicFilesInput.files);
            musicFilesInput.value = "";
        });
    }

    // =========================================================
    // 5. ADD FILES TO THE LIBRARY
    // =========================================================

    function addFiles(fileCollection) {
        const files = Array.from(fileCollection || [])
            .filter(isAudioFile);

        let added = 0;

        files.forEach(file => {
            const identity = fileIdentity(file);

            // Avoid adding the same file twice
            if (songs.some(song => song.identity === identity)) {
                return;
            }

            const song = {
                file,
                identity,
                url: URL.createObjectURL(file),

                title: file.name.replace(/\.[^.]+$/, ""),
                artist: "",
                album: "",
                genre: "",
                year: "",

                artwork: null,
                artworkUrl: null,

                duration: 0,
                metadataRead: false
            };

            songs.push(song);
            added++;

            readMetadata(song);
        });

        sortSongs();

        if (!currentSong && songs.length > 0) {
            selectSong(songs[0], false);
        }

        renderLibrary();

        return added;
    }

    // =========================================================
    // 6. MUSIC SEARCH AND LIBRARY DISPLAY
    // =========================================================

    function getUpcomingSongs() {
        if (!currentSong) {
            return songs.slice(0, 3);
        }

        const currentIndex = songs.indexOf(currentSong);

        if (currentIndex === -1) {
            return songs.slice(0, 3);
        }

        const upcoming = [];

        for (let i = 1; i <= 3; i++) {
            let nextIndex = currentIndex + i;

            if (nextIndex >= songs.length) {
                if (repeat === "all") {
                    nextIndex %= songs.length;
                } else {
                    break;
                }
            }

            const song = songs[nextIndex];

            if (song && !upcoming.includes(song)) {
                upcoming.push(song);
            }
        }

        return upcoming;
    }

    function renderLibrary() {
        if (!libraryList) return;

        libraryList.innerHTML = "";

        const searchText = musicSearch
            ? musicSearch.value.trim().toLowerCase()
            : "";

        // Search only filters display.
        // It does not change the main songs array or playback queue.
        const filteredSongs = songs.filter(song => {
            const searchableText = [
                song.title,
                song.artist,
                song.album,
                song.genre,
                song.year,
                song.file.name
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchableText.includes(searchText);
        });

        if (filteredSongs.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";

            const symbol = document.createElement("span");
            symbol.textContent = "♫";

            const message = document.createElement("p");
            message.textContent = songs.length
                ? "No matching songs"
                : "No music loaded";

            const hint = document.createElement("small");
            hint.textContent = songs.length
                ? "Try another search."
                : "Select + Folder or + Music to add songs.";

            empty.append(symbol, message, hint);
            libraryList.appendChild(empty);

            return;
        }

        // Keep the original library order for playback.
        // Upcoming tracks are only a display arrangement.
        const upcoming = getUpcomingSongs();

        let orderedSongs = currentSong
            ? [
                ...upcoming,
                currentSong,
                ...songs.filter(song =>
                    song !== currentSong &&
                    !upcoming.includes(song)
                )
            ]
            : [...songs];

        orderedSongs = orderedSongs.filter(song =>
            filteredSongs.includes(song)
        );

        orderedSongs.forEach(song => {
            const originalIndex = songs.indexOf(song);

            const row = document.createElement("button");
            row.type = "button";
            row.className = "track-row";

            if (song === currentSong) {
                row.classList.add("selected");
            }

            const index = document.createElement("span");
            index.className = "track-index";
            index.textContent = String(originalIndex + 1);

            const details = document.createElement("span");
            details.className = "track-details";

            const name = document.createElement("span");
            name.className = "track-name";
            name.textContent = song.title || "Unknown title";

            const singer = document.createElement("span");
            singer.className = "track-singer";
            singer.textContent = song.artist || "Unknown artist";

            details.append(name, singer);

            const status = document.createElement("span");
            status.className = "track-status";
            status.textContent = song.duration
                ? formatTime(song.duration)
                : "";

            row.append(index, details, status);

            row.addEventListener("click", () => {
                selectSong(song, true);
            });

            libraryList.appendChild(row);
        });
    }

    if (musicSearch) {
        musicSearch.addEventListener("input", renderLibrary);
    }

    // =========================================================
    // 7. READ SONG METADATA AND ALBUM ARTWORK
    // =========================================================

    function readMetadata(song) {
        if (
            typeof window.jsmediatags === "undefined" ||
            !window.jsmediatags.read
        ) {
            song.metadataRead = true;
            return;
        }

        window.jsmediatags.read(song.file, {

            onSuccess: result => {
                const tags = result.tags || {};

                song.title = tags.title || song.title;
                song.artist = tags.artist || "";
                song.album = tags.album || "";
                song.genre = tags.genre || "";
                song.year = tags.year || "";

                if (tags.picture) {
                    try {
                        const picture = tags.picture;

                        const byteArray = new Uint8Array(
                            picture.data
                        );

                        const blob = new Blob(
                            [byteArray],
                            { type: picture.format || "image/jpeg" }
                        );

                        if (song.artworkUrl) {
                            URL.revokeObjectURL(song.artworkUrl);
                        }

                        song.artwork = blob;
                        song.artworkUrl = URL.createObjectURL(blob);

                    } catch (error) {
                        console.warn("Artwork could not be read:", error);
                    }
                }

                song.metadataRead = true;

                sortSongs();
                renderLibrary();

                if (song === currentSong) {
                    updateTrackInformation();
                    updateArtwork();
                }
            },

            onError: error => {
                console.warn(
                    "Metadata could not be read:",
                    song.file.name,
                    error
                );

                song.metadataRead = true;
            }
        });
    }

    // =========================================================
    // 8. SELECT AND DISPLAY CURRENT TRACK
    // =========================================================

    function selectSong(song, shouldPlay = true) {
        if (!song) return;

        currentSong = song;

        audio.src = song.url;
        audio.load();

        updateTrackInformation();
        updateArtwork();
        renderLibrary();

        if (shouldPlay) {
            playAudio();
        } else {
            updatePlayButton();
        }
    }

    function updateTrackInformation() {
        if (!currentSong) return;

        if (trackTitle) {
            trackTitle.textContent =
                currentSong.title || "Unknown title";
        }

        if (trackArtist) {
            trackArtist.textContent =
                currentSong.artist || "Unknown artist";
        }
    }

    function updateArtwork() {
        if (!albumArt || !artworkPlaceholder) return;

        if (
            currentSong &&
            currentSong.artworkUrl &&
            !audio.paused
        ) {
            albumArt.src = currentSong.artworkUrl;
            albumArt.hidden = false;
            artworkPlaceholder.hidden = true;

        } else {
            albumArt.hidden = true;
            albumArt.removeAttribute("src");
            artworkPlaceholder.hidden = false;
        }
    }

    // =========================================================
    // 9. SEVEN-BAND AUDIO EQUALIZER
    // =========================================================

    function initializeEqualizer() {
        if (equalizerInitialized) {
            return true;
        }

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return false;
        }

        try {
            audioContext = new AudioContextClass();

            // Create the media source only once.
            audioSource =
                audioContext.createMediaElementSource(audio);

            let previousNode = audioSource;

            frequencies.forEach((frequency, index) => {
                const filter = audioContext.createBiquadFilter();

                filter.type = "peaking";
                filter.frequency.value = frequency;
                filter.Q.value = 1.1;
                filter.gain.value = currentEQ[index];

                previousNode.connect(filter);
                previousNode = filter;

                equalizerFilters.push(filter);
            });

            previousNode.connect(audioContext.destination);

            equalizerInitialized = true;

            return true;

        } catch (error) {
            console.warn("Equalizer initialization failed:", error);

            // Do not create another MediaElementSource.
            // The audio element remains available for playback.
            return false;
        }
    }

    function applyEqualizer(values) {
        currentEQ = [...values];

        if (!equalizerInitialized) return;

        equalizerFilters.forEach((filter, index) => {
            filter.gain.setTargetAtTime(
                values[index],
                audioContext.currentTime,
                0.04
            );
        });
    }

    function selectPreset(name) {
        const values = presets[name];

        if (!values) return;

        applyEqualizer(values);

        document.querySelectorAll("[data-preset]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.preset === name
            );
        });

        const status = $("eq-status");

        if (status) {
            status.textContent = name + " preset";
        }
    }

    document.querySelectorAll("[data-preset]").forEach(button => {
        button.addEventListener("click", () => {
            selectPreset(button.dataset.preset);
        });
    });

    // =========================================================
    // 10. PLAYBACK SPEED
    // =========================================================

    function setSpeed(speed) {
        const value = Number(speed);

        if (!Number.isFinite(value)) return;

        audio.playbackRate = value;

        document.querySelectorAll("[data-speed]").forEach(button => {
            button.classList.toggle(
                "active",
                Number(button.dataset.speed) === value
            );
        });
    }

    document.querySelectorAll("[data-speed]").forEach(button => {
        button.addEventListener("click", () => {
            setSpeed(button.dataset.speed);
        });
    });

    // =========================================================
    // 11. PLAY AND PAUSE
    // =========================================================

    async function playAudio() {
        if (!currentSong) return;

        initializeEqualizer();

        if (audioContext && audioContext.state === "suspended") {
            try {
                await audioContext.resume();
            } catch (error) {
                console.warn("Audio context could not resume:", error);
            }
        }

        try {
            await audio.play();
        } catch (error) {
            console.warn("Playback could not start:", error);
            updatePlayButton();
        }
    }

    function pauseAudio() {
        audio.pause();
    }

    function updatePlayButton() {
        if (!playButton) return;

        const playing = !audio.paused;

        playButton.textContent = playing ? "Ⅱ" : "▶";
        playButton.title = playing ? "Pause" : "Play";
        playButton.setAttribute(
            "aria-label",
            playing ? "Pause" : "Play"
        );

        updateArtwork();
    }

    if (playButton) {
        playButton.addEventListener("click", () => {
            if (audio.paused) {
                playAudio();
            } else {
                pauseAudio();
            }
        });
    }

    audio.addEventListener("play", updatePlayButton);
    audio.addEventListener("pause", updatePlayButton);
    audio.addEventListener("ended", handleTrackEnded);

    // =========================================================
    // 12. NEXT AND PREVIOUS TRACK
    // =========================================================

    function nextSong() {
        if (!songs.length || !currentSong) return;

        let nextIndex;

        if (shuffle && songs.length > 1) {
            do {
                nextIndex = Math.floor(Math.random() * songs.length);
            } while (songs[nextIndex] === currentSong);

        } else {
            const currentIndex = songs.indexOf(currentSong);
            nextIndex = currentIndex + 1;

            if (nextIndex >= songs.length) {
                if (repeat === "all") {
                    nextIndex = 0;
                } else {
                    audio.pause();
                    audio.currentTime = 0;
                    updatePlayButton();
                    return;
                }
            }
        }

        selectSong(songs[nextIndex], true);
    }

    function previousSong() {
        if (!songs.length || !currentSong) return;

        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            return;
        }

        const currentIndex = songs.indexOf(currentSong);

        let previousIndex = currentIndex - 1;

        if (shuffle && songs.length > 1) {
            do {
                previousIndex = Math.floor(Math.random() * songs.length);
            } while (songs[previousIndex] === currentSong);

        } else if (previousIndex < 0) {
            previousIndex = repeat === "all"
                ? songs.length - 1
                : 0;
        }

        selectSong(songs[previousIndex], true);
    }

    function handleTrackEnded() {
        if (repeat === "one") {
            audio.currentTime = 0;
            playAudio();
            return;
        }

        nextSong();
    }

    if (nextButton) {
        nextButton.addEventListener("click", nextSong);
    }

    if (previousButton) {
        previousButton.addEventListener("click", previousSong);
    }

    // =========================================================
    // 13. SHUFFLE AND REPEAT
    // =========================================================

    if (shuffleButton) {
        shuffleButton.addEventListener("click", () => {
            shuffle = !shuffle;

            shuffleButton.classList.toggle("active", shuffle);
            shuffleButton.title = shuffle
                ? "Shuffle on"
                : "Shuffle off";
        });
    }

    if (repeatButton) {
        repeatButton.addEventListener("click", () => {

            if (repeat === "off") {
                repeat = "all";
            } else if (repeat === "all") {
                repeat = "one";
            } else {
                repeat = "off";
            }

            repeatButton.classList.toggle(
                "active",
                repeat !== "off"
            );

            repeatButton.title = {
                off: "Repeat off",
                all: "Repeat all",
                one: "Repeat one"
            }[repeat];

            repeatButton.textContent =
                repeat === "one" ? "↻¹" : "↻";

            renderLibrary();
        });
    }

    // =========================================================
    // 14. VOLUME CONTROL
    // =========================================================

    if (volumeBar) {
        audio.volume = Number(volumeBar.value) / 100;

        volumeBar.addEventListener("input", () => {
            audio.volume = Number(volumeBar.value) / 100;
        });
    }

    // =========================================================
    // 15. SEEK BAR AND TRACK TIMING
    // =========================================================

    audio.addEventListener("loadedmetadata", () => {
    if (currentSong && Number.isFinite(audio.duration)) {
        currentSong.duration = audio.duration;
        renderLibrary();
    }

    updateTiming();
});
    audio.addEventListener("durationchange", updateTiming);
    audio.addEventListener("timeupdate", updateTiming);

    function updateTiming() {
        const duration = audio.duration;
        const current = audio.currentTime;

        if (currentTimeDisplay) {
            currentTimeDisplay.textContent = formatTime(current);
        }

        if (totalTimeDisplay) {
            totalTimeDisplay.textContent = formatTime(duration);
        }

        if (
            seekBar &&
            Number.isFinite(duration) &&
            duration > 0
        ) {
            seekBar.value = String(
                Math.round((current / duration) * 1000)
            );
        } else if (seekBar) {
            seekBar.value = "0";
        }
    }

    if (seekBar) {
        seekBar.addEventListener("input", () => {
            if (
                Number.isFinite(audio.duration) &&
                audio.duration > 0
            ) {
                audio.currentTime =
                    (Number(seekBar.value) / 1000) *
                    audio.duration;
            }
        });
    }

    // =========================================================
    // 16. AUDIO ERRORS
    // =========================================================

    audio.addEventListener("error", () => {
        console.warn(
            "Unable to play this audio file:",
            currentSong ? currentSong.file.name : "Unknown file"
        );

        updatePlayButton();
    });

    // =========================================================
    // 17. INITIAL PLAYER SETTINGS
    // =========================================================

    selectPreset("Flat");
    setSpeed(1);

    if (volumeBar) {
        audio.volume = Number(volumeBar.value) / 100;
    } else {
        audio.volume = 0.8;
    }

    updatePlayButton();
    renderLibrary();

})();
