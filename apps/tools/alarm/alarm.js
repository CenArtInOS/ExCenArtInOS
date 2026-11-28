
/* =====================================
   EXCENARTINOS - ALARM CLOCK ENGINE
   Live clock, alarm, snooze and sound
===================================== */

const $ = id => document.getElementById(id);

let alarmTimestamp = null;
let alarmInterval = null;
let soundInterval = null;

let audioContext = null;
let isRinging = false;
let alarmTriggered = false;


/* =====================================
   LIVE CLOCK
===================================== */

function updateClock() {

    const now = new Date();

    $("currentTime").textContent =
        now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });

    $("currentDate").textContent =
        now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

}

updateClock();

const clockInterval = setInterval(updateClock, 1000);


/* =====================================
   AUDIO ENGINE
===================================== */

async function prepareAudio() {

    try {

        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
            return false;
        }

        if (!audioContext || audioContext.state === "closed") {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            await audioContext.resume();
        }

        return audioContext.state === "running";

    } catch (error) {

        console.error("Audio unavailable:", error);
        return false;

    }

}


/* Generate one beep */

function playBeep() {

    if (!audioContext || audioContext.state !== "running") {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const startTime = audioContext.currentTime;

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
        850,
        startTime
    );

    gain.gain.setValueAtTime(
        0.0001,
        startTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.18,
        startTime + 0.04
    );

    gain.gain.setValueAtTime(
        0.18,
        startTime + 0.3
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startTime + 0.38
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.4);

}


/* Start repeating alarm sound */

function startSound() {

    stopSound();

    playBeep();

    soundInterval = setInterval(() => {

        if (isRinging) {
            playBeep();
        }

    }, 650);

}


/* Stop sound */

function stopSound() {

    if (soundInterval) {
        clearInterval(soundInterval);
        soundInterval = null;
    }

}


/* =====================================
   STATUS DISPLAY
===================================== */

function setStatus(icon, heading, detail, ringing = false) {

    $("statusIcon").textContent = icon;
    $("statusHeading").textContent = heading;
    $("statusDetail").textContent = detail;

    $("statusPanel").classList.toggle(
        "ringing",
        ringing
    );

}


/* =====================================
   ALARM SETUP
===================================== */

async function setAlarm() {

    const selectedTime = $("alarmTime").value;

    if (!selectedTime) {

        setStatus(
            "!",
            "Choose a time",
            "Please select a valid alarm time."
        );

        return;
    }

    // Prepare audio following the user's button interaction.
    await prepareAudio();

    clearInterval(alarmInterval);
    alarmInterval = null;

    stopSound();

    isRinging = false;
    alarmTriggered = false;

    const now = new Date();

    const [hours, minutes] =
        selectedTime.split(":").map(Number);

    const target = new Date();

    target.setHours(hours, minutes, 0, 0);

    // If selected time has passed, schedule tomorrow.
    if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
    }

    alarmTimestamp = target.getTime();

    const formatted = target.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    $("ringControls").classList.add("hidden");

    setStatus(
        "◷",
        "Alarm is active",
        "Scheduled for " + formatted
    );

    alarmInterval = setInterval(checkAlarm, 500);

}


/* =====================================
   ALARM CHECKER
===================================== */

function checkAlarm() {

    if (!alarmTimestamp || alarmTriggered || isRinging) {
        return;
    }

    if (Date.now() >= alarmTimestamp) {

        alarmTriggered = true;

        clearInterval(alarmInterval);
        alarmInterval = null;

        startRinging();

    }

}


/* =====================================
   START RINGING
===================================== */

function startRinging() {

    isRinging = true;

    setStatus(
        "!",
        "ALARM RINGING",
        "Your alarm time has arrived. Snooze or dismiss it.",
        true
    );

    $("ringControls").classList.remove("hidden");

    startSound();

}


/* =====================================
   DISMISS ALARM
===================================== */

function dismissAlarm() {

    isRinging = false;
    alarmTriggered = false;
    alarmTimestamp = null;

    clearInterval(alarmInterval);
    alarmInterval = null;

    stopSound();

    $("ringControls").classList.add("hidden");
    $("alarmTime").value = "";

    setStatus(
        "✓",
        "Alarm dismissed",
        "No active alarm. Set another time whenever needed."
    );

}


/* =====================================
   SNOOZE ALARM
===================================== */

function snoozeAlarm() {

    if (!isRinging) {
        return;
    }

    isRinging = false;

    stopSound();

    const snoozeTime = new Date(
        Date.now() + 5 * 60 * 1000
    );

    alarmTimestamp = snoozeTime.getTime();
    alarmTriggered = false;

    $("ringControls").classList.add("hidden");

    const formatted = snoozeTime.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    setStatus(
        "◷",
        "Snoozed for 5 minutes",
        "The alarm will ring again at " + formatted
    );

    clearInterval(alarmInterval);

    alarmInterval = setInterval(checkAlarm, 500);

}


/* =====================================
   CLEAR ALARM
===================================== */

function clearAlarm() {

    isRinging = false;
    alarmTriggered = false;
    alarmTimestamp = null;

    clearInterval(alarmInterval);
    alarmInterval = null;

    stopSound();

    $("ringControls").classList.add("hidden");
    $("alarmTime").value = "";

    setStatus(
        "◷",
        "No alarm set",
        "Choose a time above to create an alarm."
    );

}


/* =====================================
   BUTTON EVENTS
===================================== */

$("setButton").addEventListener("click", setAlarm);

$("clearButton").addEventListener("click", clearAlarm);

$("dismissButton").addEventListener("click", dismissAlarm);

$("snoozeButton").addEventListener("click", snoozeAlarm);


/* =====================================
   PAGE CLEANUP
===================================== */

window.addEventListener("pagehide", () => {

    clearInterval(alarmInterval);
    clearInterval(clockInterval);

    stopSound();

    if (audioContext && audioContext.state !== "closed") {

        audioContext.close();
        audioContext = null;

    }

});
