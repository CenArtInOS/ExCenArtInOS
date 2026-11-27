
/* =========================================
   ExCenArtInOS - Homepage controller
========================================= */

"use strict";

/* =========================================
   Application registry
========================================= */


const APP_REGISTRY = {
    "Directory": {
        path: "apps/directory/directory.html",
        description: "Browse directories and connected locations."
    },

    "Social": {
        path: "apps/social/social.html",
        description: "Communication and community."
    },

    "Files": {
        path: "apps/files/files.html",
        description: "Browse and manage device files."
    },

    "Image": {
        path: "apps/image/image.html",
        description: "Image viewing and editing."
    },

    "Music": {
        path: "apps/music/music.html",
        description: "Music playback and audio tools."
    },

    "Video": {
        path: "apps/video/video.html",
        description: "Video playback."
    },

    "Tools": {
        path: "apps/tools/tools.html",
        description: "Utilities and productivity."
    },

    "Game": {
        path: "apps/game/game.html",
        description: "Games and interactive applications."
    }
};


const BUILT_IN_APPS = {
    "Clock": "Live device time and date.",
    "Calendar": "Calendar and date navigation.",
    "Calculator": "Basic arithmetic calculator.",
    "Device Info": "Device and browser information.",
    "Device Access": "Browser-supported permissions.",
    "Security": "Password and screen locking.",
    "Support": "Project information."
};

const $ = id => document.getElementById(id);

const viewPanel = $("view-panel");
const viewTitle = $("view-title");
const viewContent = $("view-content");

let navigationHistory = [];

/* Nested iframe navigation history */
let iframeHistory = [];
let activeIframe = null;

let calendarDate = new Date();
let deviceBattery = null;


/* =========================================
   Date and time
========================================= */

function updateDateTime() {

    const now = new Date();

    const time = now.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });

    const parts = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).formatToParts(now);

    const getPart = type =>
        parts.find(item => item.type === type)?.value || "";

    const date =
        `${getPart("day")}-${getPart("month")}-${getPart("year")}`;

    const weekday = now.toLocaleDateString("en-GB", {
        weekday: "short"
    });

    $("date-time").textContent =
        `${time} ${date} ${weekday}`;

    if (!$("lock-screen").hidden) {
        $("lock-time").textContent = time;
        $("lock-date").textContent = `${date} ${weekday}`;
    }

    const clock = $("live-clock");

    if (clock) {
        clock.textContent =
            now.toLocaleTimeString("en-GB");
    }

    const clockDate = $("live-clock-date");

    if (clockDate) {
        clockDate.textContent = now.toDateString();
    }
}


/* =========================================
   Battery status
========================================= */

function renderBattery() {

    const display = $("battery");

    if (!deviceBattery) {
        display.textContent = "Battery | N/A";
        return;
    }

    const percentage =
        Math.round(deviceBattery.level * 100);

    const charging =
        deviceBattery.charging ? " ⚡" : "";

    display.textContent =
        `Battery | ${percentage}%${charging}`;
}

async function initializeBattery() {

    if (typeof navigator.getBattery !== "function") {
        $("battery").textContent = "Battery | N/A";
        return;
    }

    try {

        deviceBattery = await navigator.getBattery();

        renderBattery();

        deviceBattery.addEventListener(
            "levelchange",
            renderBattery
        );

        deviceBattery.addEventListener(
            "chargingchange",
            renderBattery
        );

    } catch (error) {

        $("battery").textContent = "Battery | N/A";

    }
}


/* =========================================
   Network status
========================================= */

function updateNetwork() {

    const display = $("network");

    if (!navigator.onLine) {

        display.textContent = "Network | Offline";
        return;

    }

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    if (!connection) {

        display.textContent = "Network | Online";
        return;

    }

    const type =
        connection.effectiveType ||
        connection.type ||
        "Online";

    const speed =
        typeof connection.downlink === "number"
            ? ` | ${connection.downlink} Mbps`
            : "";

    display.textContent =
        `Network | ${type}${speed}`;
}


/* =========================================
   Initialize device status
========================================= */

updateDateTime();
updateNetwork();
initializeBattery();

setInterval(updateDateTime, 1000);
setInterval(updateNetwork, 15000);

window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

const networkConnection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

if (networkConnection?.addEventListener) {
    networkConnection.addEventListener("change", updateNetwork);
}


/* =========================================
   HTML escaping helper
========================================= */

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, character => ({

        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"

    })[character]);

}


/* =========================================
   Navigation
========================================= */

/*
   Every normal homepage view is saved in the
   navigation history.

   Nested iframe information is also saved so
   Back can restore the previous application.
*/

function showView(title, html, remember = true) {

    if (remember) {

        if (viewPanel.hidden) {

            navigationHistory.push({
                home: true
            });

        } else {

            navigationHistory.push({
                home: false,
                title: viewTitle.textContent,
                html: viewContent.innerHTML,

                activeIframe: activeIframe
                    ? { ...activeIframe }
                    : null,

                iframeHistory: iframeHistory.map(item => ({
                    ...item
                }))
            });

        }
    }

    // A normal homepage view starts a new
    // top-level navigation context.
    activeIframe = null;
    iframeHistory = [];

    viewTitle.textContent = title;
    viewContent.innerHTML = html;

    viewPanel.hidden = false;

    viewContent.scrollTop = 0;
}


/* =========================================
   Approved workspace pages
========================================= */

/*
   Only these registered paths can be opened
   through messages from category applications.
*/


const WORKSPACE_PAGES = {

    // Game category
    "apps/game/game.html": "Game",

    // Individual games
    "apps/game/adventure/adventure.html": "Adventure Rush",
    "apps/game/racing/racing.html": "Car Racing",
    "apps/game/space/space.html": "Space Combat",
    "apps/game/snake/snake.html": "Snake",
    "apps/game/block/block.html": "Block Puzzle",
    "apps/game/bike/bike.html": "Motorcycle Off-road",

    // Tools category
    "apps/tools/tools.html": "Tools",

    // Individual tools
    "apps/tools/text/text.html": "Text",
    "apps/tools/calculator/calculator.html": "Calculator",
    "apps/tools/calendar/calendar.html": "Calendar",
    "apps/tools/alarm/alarm.html": "Alarm Clock",
    "apps/tools/qr/qr.html": "QR Generator"

};



/* =========================================
   Render an application iframe
========================================= */

function renderWorkspaceFrame(name, path) {

    viewTitle.textContent = name;

    viewContent.innerHTML = `

        <iframe
            class="app-frame"
            src="${path}"
            title="ExCenArtInOS ${escapeHTML(name)}"
            allow="autoplay; fullscreen"
            loading="eager">
        </iframe>

    `;

    viewPanel.hidden = false;

    viewContent.scrollTop = 0;
}


/* =========================================
   Open a nested application
========================================= */

function openWorkspacePage(name, path) {

    /*
       Validate the requested path and its
       registered application name.
    */

    if (
        !Object.prototype.hasOwnProperty.call(
            WORKSPACE_PAGES,
            path
        )
    ) {
        console.warn("Application path not allowed:", path);
        return;
    }

    if (WORKSPACE_PAGES[path] !== name) {
        console.warn("Application name does not match path.");
        return;
    }

    /*
       Save the currently displayed iframe.

       Example:
       Game Category -> Adventure Rush
    */

    if (activeIframe) {

        iframeHistory.push({
            name: activeIframe.name,
            path: activeIframe.path
        });

    }

    activeIframe = {
        name: name,
        path: path
    };

    renderWorkspaceFrame(name, path);
}



/* =========================================
   SHARED APPLICATION NAVIGATION
   Handles Games, Tools and future categories
========================================= */

window.addEventListener("message", function (event) {

    // Identify the currently active iframe.
    const currentFrame =
        viewContent.querySelector(".app-frame");

    // Reject messages from other frames.
    if (
        !currentFrame ||
        event.source !== currentFrame.contentWindow
    ) {
        return;
    }

    const data = event.data;

    // Validate message format.
    if (
        !data ||
        data.type !== "EXOS_OPEN_APP" ||
        typeof data.name !== "string" ||
        typeof data.path !== "string"
    ) {
        return;
    }

    // Validate registered application path and name.
    if (
        !Object.prototype.hasOwnProperty.call(
            WORKSPACE_PAGES,
            data.path
        )
    ) {
        console.warn("Unregistered application:", data.path);
        return;
    }

    if (WORKSPACE_PAGES[data.path] !== data.name) {
        console.warn("Application name mismatch:", data.name);
        return;
    }

    // Open the selected application.
    openWorkspacePage(data.name, data.path);

});



/* =========================================
   Back navigation
========================================= */

function goBack() {

    /*
       First handle nested application navigation.

       Example:
       Adventure Rush -> Game Category
    */

    if (
        activeIframe &&
        iframeHistory.length > 0
    ) {

        const previous = iframeHistory.pop();

        activeIframe = previous;

        renderWorkspaceFrame(
            previous.name,
            previous.path
        );

        return;
    }

    /*
       If there is no nested history,
       restore the previous homepage view.
    */

    if (!navigationHistory.length) {
        goHome();
        return;
    }

    const previous = navigationHistory.pop();

    if (previous.home) {

        activeIframe = null;
        iframeHistory = [];

        viewPanel.hidden = true;
        viewContent.innerHTML = "";

        return;
    }

    viewTitle.textContent = previous.title;
    viewContent.innerHTML = previous.html;

    activeIframe = previous.activeIframe
        ? { ...previous.activeIframe }
        : null;

    iframeHistory = Array.isArray(previous.iframeHistory)
        ? previous.iframeHistory.map(item => ({ ...item }))
        : [];

    viewPanel.hidden = false;

}


/* =========================================
   Home navigation
========================================= */

function goHome() {

    navigationHistory = [];

    iframeHistory = [];

    activeIframe = null;

    viewPanel.hidden = true;

    viewContent.innerHTML = "";

}

$("back-button").addEventListener("click", goBack);

$("home-button").addEventListener("click", goHome);


/* =========================================
   App file checking
========================================= */

async function applicationFileExists(path) {

    if (!path) return false;

    try {

        let response = await fetch(path, {
            method: "HEAD",
            cache: "no-store"
        });

        if (response.ok) return true;

        if (
            response.status === 405 ||
            response.status === 501
        ) {

            response = await fetch(path, {
                cache: "no-store"
            });

            return response.ok;
        }

        return false;

    } catch (error) {

        return false;

    }
}

async function checkAllApps() {

    const entries =
        Object.entries(APP_REGISTRY);

    await Promise.all(entries.map(async ([name, app]) => {

        app.available =
            await applicationFileExists(app.path);

    }));

    refreshAppButtons();
}

function refreshAppButtons() {

    document.querySelectorAll(".app[data-app]")
        .forEach(button => {

            const app =
                APP_REGISTRY[button.dataset.app];

            if (!app) return;

            button.classList.toggle(
                "is-ready",
                !!app.available
            );

            button.classList.toggle(
                "is-unavailable",
                !app.available
            );

            let status =
                button.querySelector(".app-status");

            if (!status) {

                status =
                    document.createElement("small");

                status.className = "app-status";

                button.appendChild(status);

            }

            status.textContent =
                app.available ? "Ready" : "Not installed";

        });
}


/* =========================================
   Application launching
========================================= */

function openApp(name) {

    if (name === "Clock") return openClock();

    if (name === "Calendar") return openCalendar();

    if (name === "Calculator") return openCalculator();

    if (name === "Device Info") return openDeviceInfo();

    if (name === "Device Access") return openDeviceAccess();

    if (name === "Security") return openSecurity();

    if (name === "Support") return openSupport();

    const app = APP_REGISTRY[name];

    if (!app) return;

    /*
       Normal application launch.

       showView() saves the previous homepage
       screen and clears the old nested history.
    */

    showView(name, `

        <iframe
            class="app-frame"
            src="${app.path}"
            title="ExCenArtInOS ${escapeHTML(name)}"
            allow="autoplay; fullscreen"
            loading="eager">
        </iframe>

    `);

    /*
       Register the newly opened iframe so
       category messages can be received.
    */

    activeIframe = {
        name: name,
        path: app.path
    };

}


/* =========================================
   Application directory
========================================= */

async function openApps() {

    const appRows =
        Object.entries(APP_REGISTRY)
        .map(([name, app]) => `

            <button class="tool-row"
                    data-launch="${name}">

                <strong>${name}</strong>

                <small>${app.description}</small>

                <small class="directory-status">
                    Checking...
                </small>

            </button>

        `).join("");

    const builtInRows =
        Object.entries(BUILT_IN_APPS)
        .map(([name, description]) => `

            <button class="tool-row"
                    data-launch="${name}">

                <strong>${name}</strong>

                <small>${description}</small>

                <small class="directory-status">
                    Built in
                </small>

            </button>

        `).join("");

    showView("Apps", `

        <section class="view-section">

            <h3>Applications</h3>

            <div class="tool-list">
                ${appRows}
            </div>

        </section>

        <section class="view-section">

            <h3>System tools</h3>

            <div class="tool-list">
                ${builtInRows}
            </div>

        </section>

    `);

    await checkAllApps();

    viewContent.querySelectorAll("[data-launch]")
        .forEach(button => {

            const app =
                APP_REGISTRY[button.dataset.launch];

            const status =
                button.querySelector(".directory-status");

            if (app && status) {

                status.textContent =
                    app.available
                        ? "Ready"
                        : "Not installed";

            }

        });

}

$("apps-button").addEventListener("click", openApps);


/* =========================================
   Homepage application buttons
========================================= */

document.querySelectorAll(".app[data-app]")
    .forEach(button => {

        button.addEventListener("click", () => {

            openApp(button.dataset.app);

        });

    });


/* =========================================
   Security and Support shortcuts
========================================= */

document.querySelectorAll("[data-open]")
    .forEach(button => {

        button.addEventListener("click", () => {

            if (button.dataset.open === "security") {
                openSecurity();
            }

            if (button.dataset.open === "support") {
                openSupport();
            }

        });

    });


/* =========================================
   Bottom shortcuts
========================================= */

$("clock-button").addEventListener("click", openClock);

$("calendar-button").addEventListener("click", openCalendar);

$("calculator-button").addEventListener("click", openCalculator);


/* =========================================
   In-app Google search
========================================= */

$("search-form").addEventListener("submit", event => {

    event.preventDefault();

    const query =
        $("search-input").value.trim();

    if (!query) return;

    openSearch(query);

});


function openSearch(query) {

    const url =
        `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`;

    showView("Search", `

        <section class="search-results-shell">

            <div class="search-query">
                Google search:
                <strong>${escapeHTML(query)}</strong>
            </div>

            <iframe
                class="search-frame"
                src="${url}"
                title="Google search results"
                loading="eager"
                referrerpolicy="strict-origin-when-cross-origin">
            </iframe>

            <div class="search-fallback">

                <span>
                    If Google blocks embedded results:
                </span>

                <a href="${url}"
                   target="_blank"
                   rel="noopener noreferrer">
                    Open Google results
                </a>

            </div>

        </section>

    `);

}


/* =========================================
   Delegated interactions
========================================= */

viewContent.addEventListener("click", event => {

    const launcher =
        event.target.closest("[data-launch]");

    if (launcher) {

        openApp(launcher.dataset.launch);

        return;
    }

    const permission =
        event.target.closest("[data-permission]");

    if (permission) {

        requestDevicePermission(
            permission.dataset.permission
        );

        return;
    }

    if (event.target.closest("#month-prev")) {

        calendarDate.setMonth(
            calendarDate.getMonth() - 1
        );

        renderCalendar();

        return;
    }

    if (event.target.closest("#month-next")) {

        calendarDate.setMonth(
            calendarDate.getMonth() + 1
        );

        renderCalendar();

        return;
    }

    const calculatorButton =
        event.target.closest("[data-calc]");

    if (calculatorButton) {

        handleCalculator(
            calculatorButton.dataset.calc
        );

        return;
    }

    if (event.target.closest("#clear-calc")) {

        $("calc-display").value = "";

        return;
    }

    if (event.target.closest("#calculate")) {

        calculateResult();

        return;
    }

    if (event.target.closest("#lock-now")) {

        lockScreen();

    }

});


/* =========================================
   Clock
========================================= */

function openClock() {

    showView("Clock", `

        <section class="view-section">

            <div class="clock-display"
                 id="live-clock">
                --:--:--
            </div>

            <p id="live-clock-date"
               class="center-text">
            </p>

        </section>

    `);

    updateDateTime();

}


/* =========================================
   Calendar
========================================= */

function openCalendar() {

    calendarDate = new Date();

    showView("Calendar", `

        <section class="view-section">

            <div class="calendar-controls">

                <button id="month-prev">
                    Previous
                </button>

                <strong id="calendar-month"></strong>

                <button id="month-next">
                    Next
                </button>

            </div>

            <div class="calendar-grid"
                 id="calendar-grid">
            </div>

        </section>

        <section class="view-section">
            <p id="calendar-today"></p>
        </section>

    `);

    renderCalendar();

}


function renderCalendar() {

    const grid = $("calendar-grid");

    if (!grid) return;

    const year = calendarDate.getFullYear();

    const month = calendarDate.getMonth();

    const firstDay =
        new Date(year, month, 1).getDay();

    const totalDays =
        new Date(year, month + 1, 0).getDate();

    $("calendar-month").textContent =
        calendarDate.toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric"
        });

    const today = new Date();

    let html = "";

    ["S", "M", "T", "W", "T", "F", "S"]
        .forEach(day => {

            html += `<span class="weekday">${day}</span>`;

        });

    for (let i = 0; i < firstDay; i++) {

        html += `<span class="empty-day"></span>`;

    }

    for (let day = 1; day <= totalDays; day++) {

        const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

        html += `

            <span class="${isToday ? "today" : ""}">
                ${day}
            </span>

        `;

    }

    grid.innerHTML = html;

    $("calendar-today").textContent =
        `Today: ${today.toDateString()}`;

}


/* =========================================
   Calculator
========================================= */

function openCalculator() {

    showView("Calculator", `

        <section class="view-section calculator">

            <input id="calc-display"
                   type="text"
                   placeholder="0"
                   readonly>

            <div class="calc-buttons">

                <button id="clear-calc">C</button>
                <button data-calc="(">(</button>
                <button data-calc=")">)</button>
                <button data-calc="/">÷</button>

                <button data-calc="7">7</button>
                <button data-calc="8">8</button>
                <button data-calc="9">9</button>
                <button data-calc="*">×</button>

                <button data-calc="4">4</button>
                <button data-calc="5">5</button>
                <button data-calc="6">6</button>
                <button data-calc="-">−</button>

                <button data-calc="1">1</button>
                <button data-calc="2">2</button>
                <button data-calc="3">3</button>
                <button data-calc="+">+</button>

                <button data-calc="0">0</button>
                <button data-calc=".">.</button>
                <button data-calc="%">%</button>
                <button id="calculate">=</button>

            </div>

        </section>

    `);

}


function handleCalculator(value) {

    const display = $("calc-display");

    if (display) {
        display.value += value;
    }

}


/* Safe arithmetic parser; no eval(). */

function evaluateExpression(expression) {

    const compact =
        expression.replace(/\s/g, "");

    const tokens = compact.match(
        /\d+(?:\.\d+)?|[()+\-*/%]/g
    );

    if (!tokens || tokens.join("") !== compact) {
        throw new Error("Invalid expression");
    }

    let position = 0;

    function factor() {

        const token = tokens[position++];

        if (token === "+") return factor();

        if (token === "-") return -factor();

        if (token === "(") {

            const value = expressionValue();

            if (tokens[position++] !== ")") {
                throw new Error("Missing bracket");
            }

            return value;
        }

        const number = Number(token);

        if (!Number.isFinite(number)) {
            throw new Error("Invalid number");
        }

        return number;

    }

    function term() {

        let value = factor();

        while (
            ["*", "/", "%"].includes(tokens[position])
        ) {

            const operator = tokens[position++];

            const next = factor();

            if (
                (operator === "/" || operator === "%") &&
                next === 0
            ) {
                throw new Error("Cannot divide by zero");
            }

            if (operator === "*") value *= next;

            if (operator === "/") value /= next;

            if (operator === "%") value %= next;

        }

        return value;

    }

    function expressionValue() {

        let value = term();

        while (
            tokens[position] === "+" ||
            tokens[position] === "-"
        ) {

            const operator = tokens[position++];

            const next = term();

            value = operator === "+"
                ? value + next
                : value - next;

        }

        return value;

    }

    const result = expressionValue();

    if (
        position !== tokens.length ||
        !Number.isFinite(result)
    ) {
        throw new Error("Invalid expression");
    }

    return result;

}


function calculateResult() {

    const display = $("calc-display");

    try {

        const result =
            evaluateExpression(display.value);

        display.value =
            String(Number(result.toPrecision(12)));

    } catch (error) {

        display.value = "Error";

    }

}


/* =========================================
   Device information
========================================= */

function openDeviceInfo() {

    const connection =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    const networkType =
        connection?.effectiveType ||
        connection?.type ||
        "Not available";

    const downlink =
        typeof connection?.downlink === "number"
            ? `${connection.downlink} Mbps (estimate)`
            : "Not available";

    const memory =
        navigator.deviceMemory
            ? `${navigator.deviceMemory} GB`
            : "Not provided";

    const cores =
        navigator.hardwareConcurrency ||
        "Not provided";

    showView("Device Info", `

        <section class="view-section">

            <h3>Device Information</h3>

            <p>Screen: ${screen.width} × ${screen.height}</p>

            <p>Pixel ratio: ${window.devicePixelRatio}</p>

            <p>Memory estimate: ${memory}</p>

            <p>Processor threads: ${cores}</p>

        </section>

        <section class="view-section">

            <h3>Browser Information</h3>

            <p>Browser: ${escapeHTML(navigator.userAgent)}</p>

            <p>Language: ${escapeHTML(navigator.language)}</p>

            <p>Platform: ${escapeHTML(navigator.platform || "Not provided")}</p>

            <p>Online: ${navigator.onLine ? "Yes" : "No"}</p>

            <p>Secure context: ${window.isSecureContext ? "Yes" : "No"}</p>

        </section>

        <section class="view-section">

            <h3>Network Information</h3>

            <p>Connection type: ${escapeHTML(networkType)}</p>

            <p>Estimated downlink: ${escapeHTML(downlink)}</p>

        </section>

    `);

}


/* =========================================
   Device Access
========================================= */

function openDeviceAccess() {

    showView("Device Access", `

        <section class="view-section">

            <h3>Device permissions</h3>

            <p>
                Select a permission to request it from your browser.
            </p>

        </section>

        <section class="view-section device-access-list">

            <button class="tool-row"
                    data-permission="location">

                <strong>Location</strong>

                <small>Request current location</small>

            </button>

            <button class="tool-row"
                    data-permission="camera">

                <strong>Camera</strong>

                <small>Request camera access</small>

            </button>

            <button class="tool-row"
                    data-permission="microphone">

                <strong>Microphone</strong>

                <small>Request microphone access</small>

            </button>

            <button class="tool-row"
                    data-permission="notifications">

                <strong>Notifications</strong>

                <small>Request notification permission</small>

            </button>

            <button class="tool-row"
                    data-permission="bluetooth">

                <strong>Bluetooth</strong>

                <small>Find a nearby Bluetooth device</small>

            </button>

        </section>

        <section class="view-section">

            <p id="permission-message" class="message">
                No permission requested yet.
            </p>

        </section>

        <section class="view-section">

            <p>
                Browser permissions usually require HTTPS or localhost.
                This web application cannot obtain unrestricted Android
                system access.
            </p>

        </section>

    `);

}


async function requestDevicePermission(type) {

    const message = $("permission-message");

    if (!message) return;

    message.textContent = "Requesting permission...";

    try {

        if (type === "location") {

            if (!navigator.geolocation) {
                throw new Error("Location is not supported.");
            }

            navigator.geolocation.getCurrentPosition(

                position => {

                    const accuracy =
                        Math.round(position.coords.accuracy);

                    message.textContent =
                        `Location permission granted. Accuracy: about ${accuracy} metres.`;

                },

                error => {

                    message.textContent =
                        error.code === 1
                            ? "Location permission denied."
                            : "Unable to get location. Check device settings.";

                },

                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }

            );

            return;
        }

        if (
            type === "camera" ||
            type === "microphone"
        ) {

            if (!navigator.mediaDevices?.getUserMedia) {

                throw new Error(
                    "Media access requires a supported secure browser."
                );

            }

            const stream =
                await navigator.mediaDevices.getUserMedia(
                    type === "camera"
                        ? { video: true }
                        : { audio: true }
                );

            stream.getTracks().forEach(track => track.stop());

            message.textContent =
                `${type} permission granted. Test stream closed.`;

            return;
        }

        if (type === "notifications") {

            if (!("Notification" in window)) {

                throw new Error(
                    "Notifications are not supported."
                );

            }

            const permission =
                await Notification.requestPermission();

            message.textContent =
                `Notification permission: ${permission}`;

            return;
        }

        if (type === "bluetooth") {

            if (!navigator.bluetooth?.requestDevice) {

                throw new Error(
                    "Web Bluetooth is not supported by this browser."
                );

            }

            const device =
                await navigator.bluetooth.requestDevice({
                    acceptAllDevices: true
                });

            message.textContent =
                `Selected: ${device.name || "Unnamed device"}. Not connected yet.`;

        }

    } catch (error) {

        message.textContent =
            error.message || "Permission request failed.";

    }

}


/* =========================================
   Support
========================================= */

function openSupport() {

    showView("Support", `

        <section class="view-section">

            <h3>Developer Support</h3>

            <p>ExCenArtInOS</p>

            <p>Powered by EXOS</p>

        </section>

        <section class="view-section">

            <h3>Support</h3>

            <p>
                Support and feedback facilities can be connected
                here when the developer contact is configured.
            </p>

        </section>

    `);

}


/* =========================================
   Security and password storage
========================================= */

const PASSWORD_KEY = "exos_password_hash";

const SALT_KEY = "exos_password_salt";

const LOCK_KEY = "exos_screen_locked";


function bytesToHex(bytes) {

    return Array.from(bytes)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

}


function hexToBytes(hex) {

    if (
        !/^[0-9a-f]+$/i.test(hex) ||
        hex.length % 2 !== 0
    ) {

        throw new Error("Invalid password salt.");

    }

    return new Uint8Array(
        hex.match(/.{1,2}/g)
            .map(byte => parseInt(byte, 16))
    );

}


async function hashPassword(password, salt) {

    if (
        !window.isSecureContext ||
        !window.crypto?.subtle
    ) {

        throw new Error(
            "Password protection requires HTTPS or localhost."
        );

    }

    const encoder = new TextEncoder();

    const key = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const bits = await window.crypto.subtle.deriveBits({

        name: "PBKDF2",

        salt: hexToBytes(salt),

        iterations: 150000,

        hash: "SHA-256"

    }, key, 256);

    return bytesToHex(new Uint8Array(bits));

}


function storageAvailable() {

    try {

        const key = "__exos_test__";

        localStorage.setItem(key, "1");

        localStorage.removeItem(key);

        return true;

    } catch (error) {

        return false;

    }

}


/* =========================================
   Security page
========================================= */

function openSecurity() {

    if (!storageAvailable()) {

        showView("Security", `

            <section class="view-section">

                <h3>Storage unavailable</h3>

                <p>
                    Allow browser storage and reload the application
                    before configuring password protection.
                </p>

            </section>

        `);

        return;
    }

    const hasPassword =
        !!localStorage.getItem(PASSWORD_KEY);

    showView("Security", `

        <section class="view-section">

            <h3>Screen Security</h3>

            <p>
                ${hasPassword
                    ? "A screen password is configured."
                    : "Create a password to enable screen locking."}
            </p>

            <p class="page-note">
                This locks ExCenArtInOS only, not Android itself.
            </p>

        </section>

        <section class="view-section">

            <h3>
                ${hasPassword
                    ? "Change Password"
                    : "Set Password"}
            </h3>

            <form id="password-form">

                <input class="form-field"
                       id="new-password"
                       type="password"
                       minlength="6"
                       autocomplete="new-password"
                       placeholder="New password (minimum 6 characters)"
                       required>

                <input class="form-field"
                       id="confirm-password"
                       type="password"
                       minlength="6"
                       autocomplete="new-password"
                       placeholder="Confirm password"
                       required>

                <button class="action-button" type="submit">
                    ${hasPassword
                        ? "Update Password"
                        : "Save Password"}
                </button>

            </form>

            <p id="security-message" class="message"></p>

        </section>

        <section class="view-section">

            <h3>Lock Screen</h3>

            <p>
                Lock this browser page until the password is entered.
            </p>

            <button class="action-button"
                    id="lock-now"
                    ${hasPassword ? "" : "disabled"}>

                Lock Screen

            </button>

        </section>

    `);

}


/* =========================================
   Save/change password
========================================= */

viewContent.addEventListener("submit", async event => {

    if (event.target.id !== "password-form") return;

    event.preventDefault();

    const password =
        $("new-password").value;

    const confirmation =
        $("confirm-password").value;

    const message =
        $("security-message");

    if (password.length < 6) {

        message.textContent =
            "Use at least 6 characters.";

        return;
    }

    if (password !== confirmation) {

        message.textContent =
            "Passwords do not match.";

        return;
    }

    try {

        const salt = bytesToHex(
            window.crypto.getRandomValues(
                new Uint8Array(16)
            )
        );

        const hash =
            await hashPassword(password, salt);

        localStorage.setItem(SALT_KEY, salt);

        localStorage.setItem(PASSWORD_KEY, hash);

        message.textContent =
            "Password saved successfully.";

        $("lock-now").disabled = false;

        $("new-password").value = "";

        $("confirm-password").value = "";

    } catch (error) {

        message.textContent =
            error.message || "Unable to save password.";

    }

});


/* =========================================
   Lock screen
========================================= */

function lockScreen() {

    if (!localStorage.getItem(PASSWORD_KEY)) {

        openSecurity();

        return;
    }

    localStorage.setItem(LOCK_KEY, "true");

    $("unlock-password").value = "";

    $("unlock-message").textContent = "";

    $("lock-screen").hidden = false;

    updateDateTime();

    $("unlock-password").focus();

}


/* =========================================
   Unlock screen
========================================= */

$("unlock-form").addEventListener("submit", async event => {

    event.preventDefault();

    const password =
        $("unlock-password").value;

    const message =
        $("unlock-message");

    const salt =
        localStorage.getItem(SALT_KEY);

    const savedHash =
        localStorage.getItem(PASSWORD_KEY);

    if (!salt || !savedHash) {

        message.textContent =
            "No valid password is configured.";

        return;
    }

    try {

        const enteredHash =
            await hashPassword(password, salt);

        if (enteredHash === savedHash) {

            localStorage.removeItem(LOCK_KEY);

            $("lock-screen").hidden = true;

            $("unlock-password").value = "";

            message.textContent = "";

        } else {

            message.textContent =
                "Incorrect password.";

            $("unlock-password").value = "";

        }

    } catch (error) {

        message.textContent =
            error.message || "Unable to verify password.";

    }

});


/* =========================================
   Restore lock after reload
========================================= */

try {

    if (
        localStorage.getItem(LOCK_KEY) === "true" &&
        localStorage.getItem(PASSWORD_KEY) &&
        localStorage.getItem(SALT_KEY)
    ) {

        $("lock-screen").hidden = false;

    }

} catch (error) {

    /*
       Keep homepage available if browser
       storage is blocked.
    */

}

updateDateTime();


/* =========================================
   End of ExCenArtInOS homepage controller
========================================= */
