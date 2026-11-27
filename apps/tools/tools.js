
"use strict";

/* =========================================
   EXCENARTINOS - TOOLS REGISTRY
========================================= */

const TOOLS_REGISTRY = {
    text: {
        name: "Text",
        path: "apps/tools/text/text.html"
    },

    calculator: {
        name: "Calculator",
        path: "apps/tools/calculator/calculator.html"
    },

    calendar: {
        name: "Calendar",
        path: "apps/tools/calendar/calendar.html"
    },

    alarm: {
        name: "Alarm Clock",
        path: "apps/tools/alarm/alarm.html"
    },

    qr: {
        name: "QR Generator",
        path: "apps/tools/qr/qr.html"
    }
};

/* =========================================
   STATUS MESSAGE
========================================= */

const toolsStatus = document.getElementById("toolsStatus");

function updateToolsStatus(message) {
    if (toolsStatus) {
        toolsStatus.textContent = message;
    }
}

/* =========================================
   OPEN SELECTED TOOL IN OS WORKSPACE
========================================= */

function openTool(toolKey) {

    const tool = TOOLS_REGISTRY[toolKey];

    if (!tool) {
        updateToolsStatus("Error: Tool not found.");
        return;
    }

    updateToolsStatus("Opening " + tool.name + "...");

    window.parent.postMessage(
        {
            type: "EXOS_OPEN_APP",
            name: tool.name,
            path: tool.path
        },
        "*"
    );
}

/* =========================================
   TOOL BUTTON EVENTS
========================================= */

document.querySelectorAll(".tool-item").forEach(button => {

    button.addEventListener("click", function () {

        const toolKey = this.dataset.tool;

        openTool(toolKey);

    });

});

/* =========================================
   INITIALIZE TOOLS
========================================= */

updateToolsStatus("Tools ready. Select a tool.");

console.log("ExCenArtInOS Tools loaded successfully.");
