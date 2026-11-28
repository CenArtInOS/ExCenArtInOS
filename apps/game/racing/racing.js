
/* =========================================
   ExCenArtInOS Racing Engine
   Six-lane dual-direction highway
   Vehicle selection, paint and collisions
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const speedLabel = $("speed");
const scoreLabel = $("score");
const trackLabel = $("trackLabel");

const selection = $("selection");
const gameOver = $("gameOver");


/* =========================================
   TRACK CONFIGURATION
========================================= */

const tracks = {
    city: {
        name: "CITY HIGHWAY",
        ground: "#303a35",
        road: "#343638",
        shoulder: "#737777",
        marking: "#eee8d2",
        centre: "#e9c64d"
    },

    desert: {
        name: "DESERT HIGHWAY",
        ground: "#a1845e",
        road: "#49433c",
        shoulder: "#bba17b",
        marking: "#f2e4c6",
        centre: "#f3d35e"
    },

    night: {
        name: "NIGHT HIGHWAY",
        ground: "#111b29",
        road: "#242a34",
        shoulder: "#46515e",
        marking: "#b9cce2",
        centre: "#e7c65b"
    }
};


/* =========================================
   VEHICLE CONFIGURATION
========================================= */

const vehicles = {
    sedan: {
        name: "Sedan",
        width: 31,
        length: 59,
        kind: "sedan",
        color: "#aeb5ba"
    },

    suv: {
        name: "SUV",
        width: 35,
        length: 66,
        kind: "suv",
        color: "#aeb5ba"
    },

    police: {
        name: "Police SUV",
        width: 36,
        length: 67,
        kind: "police",
        color: "#eeeeea"
    },

    truck: {
        name: "Truck",
        width: 43,
        length: 96,
        kind: "truck",
        color: "#89949a"
    },

    ambulance: {
        name: "Ambulance",
        width: 37,
        length: 77,
        kind: "ambulance",
        color: "#eeeeea"
    },

    sports: {
        name: "Sports Car",
        width: 30,
        length: 63,
        kind: "sports",
        color: "#aeb5ba"
    }
};

const trafficTypes = [
    "sedan", "sedan", "sedan",
    "suv", "suv",
    "police", "truck", "ambulance", "sports"
];

const trafficPaints = [
    "#17191c",
    "#eeeeea",
    "#858d93",
    "#263746",
    "#9b3430",
    "#b7a98d",
    "#d4d6d4",
    "#555e64"
];


/* =========================================
   GAME STATE
========================================= */

let selectedTrack = "city";
let selectedCar = "sedan";
let selectedPaint = "black";

let running = false;

let road = {};
let player = {};
let traffic = [];

let speed = 0;
let score = 0;

let roadOffset = 0;
let sceneryOffset = 0;
let spawnTimer = 0;
let lastTime = 0;

let animationId = 0;

const keys = {
    left: false,
    right: false,
    accelerate: false,
    brake: false
};


/* =========================================
   CANVAS SIZE
========================================= */

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    const ratio = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width = Math.max(
        1,
        Math.round(rect.width * ratio)
    );

    canvas.height = Math.max(
        1,
        Math.round(rect.height * ratio)
    );

    ctx.setTransform(
        ratio,
        0,
        0,
        ratio,
        0,
        0
    );

    road.width = rect.width;
    road.height = rect.height;

    road.x = rect.width * 0.04;
    road.w = rect.width * 0.92;

    road.laneWidth = road.w / 6;

    if (player.x === undefined) {
        player.x = laneX(1);
    }

    player.y = rect.height * 0.77;

    if (player.width) {
        player.width = vehicles[selectedCar].width;
        player.length = vehicles[selectedCar].length;
    }

    draw();
}

window.addEventListener("resize", resizeCanvas);


/* =========================================
   LANE POSITIONS
   Lanes 0-2: same direction
   Lanes 3-5: oncoming direction
========================================= */

function laneX(lane) {
    return road.x + road.laneWidth * (lane + 0.5);
}


/* =========================================
   TRACK SELECTION
========================================= */

document.querySelectorAll("[data-track]").forEach(button => {

    button.addEventListener("click", () => {

        selectedTrack = button.dataset.track;

        document.querySelectorAll("[data-track]").forEach(b => {
            b.classList.toggle("selected", b === button);
        });

        trackLabel.textContent = tracks[selectedTrack].name;

        draw();
    });

});


/* =========================================
   VEHICLE SELECTION
========================================= */

document.querySelectorAll("[data-car]").forEach(button => {

    button.addEventListener("click", () => {

        selectedCar = button.dataset.car;

        document.querySelectorAll("[data-car]").forEach(b => {
            b.classList.toggle("selected", b === button);
        });

        draw();
    });

});


/* =========================================
   PAINT SELECTION
========================================= */

document.querySelectorAll("[data-paint]").forEach(button => {

    button.addEventListener("click", () => {

        selectedPaint = button.dataset.paint;

        document.querySelectorAll("[data-paint]").forEach(b => {
            b.classList.toggle("selected", b === button);
        });

        draw();
    });

});


/* =========================================
   PLAYER SETUP
========================================= */

function clearControls() {

    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });

}

function resetPlayer() {

    const spec = vehicles[selectedCar];

    player = {
        x: laneX(1),
        y: road.height * 0.77,
        width: spec.width,
        length: spec.length
    };

    traffic = [];

    speed = 0;
    score = 0;

    roadOffset = 0;
    sceneryOffset = 0;
    spawnTimer = 0;

    clearControls();

    updateHUD();
}

function startRace() {

    cancelAnimationFrame(animationId);

    resizeCanvas();

    resetPlayer();

    running = true;

    selection.classList.add("hidden");
    gameOver.classList.add("hidden");

    lastTime = performance.now();

    animationId = requestAnimationFrame(gameLoop);
}

$("startButton").addEventListener("click", startRace);

$("restartButton").addEventListener("click", startRace);

$("menuButton").addEventListener("click", () => {

    running = false;

    clearControls();

    gameOver.classList.add("hidden");
    selection.classList.remove("hidden");

    draw();

});


/* =========================================
   TOUCH CONTROLS
========================================= */

function bindControl(id, key) {

    const button = $(id);

    button.addEventListener("pointerdown", event => {

        event.preventDefault();

        keys[key] = true;

        if (button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
        }

    });

    button.addEventListener("pointerup", event => {

        event.preventDefault();

        keys[key] = false;

    });

    button.addEventListener("pointercancel", () => {
        keys[key] = false;
    });

    button.addEventListener("lostpointercapture", () => {
        keys[key] = false;
    });

    button.addEventListener("contextmenu", event => {
        event.preventDefault();
    });

}

bindControl("leftButton", "left");
bindControl("rightButton", "right");
bindControl("accelerateButton", "accelerate");
bindControl("brakeButton", "brake");


/* Keyboard controls */

document.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    if ([
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        " "
    ].includes(key)) {
        event.preventDefault();
    }

    if (key === "arrowleft" || key === "a") {
        keys.left = true;
    }

    if (key === "arrowright" || key === "d") {
        keys.right = true;
    }

    if (key === "arrowup" || key === "w") {
        keys.accelerate = true;
    }

    if (key === "arrowdown" || key === "s") {
        keys.brake = true;
    }

});

document.addEventListener("keyup", event => {

    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "a") {
        keys.left = false;
    }

    if (key === "arrowright" || key === "d") {
        keys.right = false;
    }

    if (key === "arrowup" || key === "w") {
        keys.accelerate = false;
    }

    if (key === "arrowdown" || key === "s") {
        keys.brake = false;
    }

});


/* =========================================
   DRAWING UTILITIES
========================================= */

function roundedRect(x, y, w, h, r) {

    r = Math.min(r, w / 2, h / 2);

    ctx.beginPath();

    ctx.moveTo(x + r, y);

    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);

    ctx.closePath();
}

function fillRound(x, y, w, h, r, color) {

    roundedRect(x, y, w, h, r);

    ctx.fillStyle = color;
    ctx.fill();

}

function shade(hex, amount) {

    const n = parseInt(hex.slice(1), 16);

    const r = Math.max(
        0,
        Math.min(255, (n >> 16) + amount)
    );

    const g = Math.max(
        0,
        Math.min(255, ((n >> 8) & 255) + amount)
    );

    const b = Math.max(
        0,
        Math.min(255, (n & 255) + amount)
    );

    return "#" +
        ((1 << 24) | (r << 16) | (g << 8) | b)
        .toString(16)
        .slice(1);
}


/* =========================================
   HIGHWAY SCENERY
========================================= */

function drawScenery() {

    const t = tracks[selectedTrack];

    ctx.fillStyle = t.ground;

    ctx.fillRect(
        0,
        0,
        road.width,
        road.height
    );

    const step = 120;
    const offset = sceneryOffset % step;

    for (
        let y = -step + offset;
        y < road.height + step;
        y += step
    ) {

        if (selectedTrack === "city") {

            drawBuilding(road.x * 0.48, y);

            drawBuilding(
                road.x + road.w + road.x * 0.48,
                y + 50
            );

        } else if (selectedTrack === "desert") {

            drawRock(road.x * 0.48, y + 30);

            drawRock(
                road.x + road.w + road.x * 0.48,
                y + 70
            );

        } else {

            drawTree(road.x * 0.48, y + 30);

            drawTree(
                road.x + road.w + road.x * 0.48,
                y + 70
            );

        }

    }

}

function drawBuilding(x, y) {

    ctx.fillStyle = "#242c2d";

    ctx.fillRect(
        x - 11,
        y,
        22,
        70
    );

    ctx.fillStyle = "#b5a77e";

    for (let i = 0; i < 3; i++) {

        ctx.fillRect(
            x - 7,
            y + 10 + i * 18,
            5,
            7
        );

        ctx.fillRect(
            x + 2,
            y + 10 + i * 18,
            5,
            7
        );

    }

}

function drawRock(x, y) {

    ctx.fillStyle = "#72543a";

    ctx.beginPath();

    ctx.ellipse(
        x,
        y,
        12,
        7,
        0.3,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.fillStyle = "#ae895f";

    ctx.beginPath();

    ctx.ellipse(
        x - 2,
        y - 2,
        7,
        3,
        0.3,
        0,
        Math.PI * 2
    );

    ctx.fill();

}

function drawTree(x, y) {

    ctx.fillStyle = "#0b1119";

    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#253a49";

    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 8, 0, Math.PI * 2);
    ctx.fill();

}


/* =========================================
   ROAD DRAWING
========================================= */

function drawRoad() {

    const t = tracks[selectedTrack];

    // Road shoulders
    ctx.fillStyle = t.shoulder;

    ctx.fillRect(
        road.x - 8,
        0,
        road.w + 16,
        road.height
    );

    // Asphalt
    ctx.fillStyle = t.road;

    ctx.fillRect(
        road.x,
        0,
        road.w,
        road.height
    );

    // Outer road boundaries
    ctx.fillStyle = "#d6d6d0";

    ctx.fillRect(
        road.x + 2,
        0,
        2,
        road.height
    );

    ctx.fillRect(
        road.x + road.w - 4,
        0,
        2,
        road.height
    );

    // Dashed separators
    ctx.strokeStyle = t.marking;
    ctx.lineWidth = 2;

    ctx.setLineDash([26, 22]);
    ctx.lineDashOffset = -roadOffset;

    [1, 2, 4, 5].forEach(lane => {

        const x = road.x + road.laneWidth * lane;

        ctx.beginPath();

        ctx.moveTo(x, 0);
        ctx.lineTo(x, road.height);

        ctx.stroke();

    });

    ctx.setLineDash([]);

    // Double yellow centre divider
    const centreX = road.x + road.laneWidth * 3;

    ctx.fillStyle = t.centre;

    ctx.fillRect(
        centreX - 3,
        0,
        2,
        road.height
    );

    ctx.fillRect(
        centreX + 2,
        0,
        2,
        road.height
    );

    // Road reflectors
    for (
        let y = -45 + (roadOffset % 70);
        y < road.height;
        y += 70
    ) {

        ctx.fillStyle =
            selectedTrack === "night"
                ? "#d5e6ff"
                : "#eee9da";

        ctx.fillRect(road.x - 6, y, 3, 15);

        ctx.fillRect(
            road.x + road.w + 3,
            y,
            3,
            15
        );

    }

}


/* =========================================
   VEHICLE DRAWING
========================================= */

function drawVehicle(x, y, type, paint, oncoming = false) {

    const spec = vehicles[type];

    if (!spec) return;

    const w = spec.width;
    const h = spec.length;
    const kind = spec.kind;

    const bodyColor = paint || spec.color;

    ctx.save();

    ctx.translate(x, y);

    // Oncoming vehicles face the player.
    if (oncoming) {
        ctx.rotate(Math.PI);
    }

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.48)";

    ctx.beginPath();

    ctx.ellipse(
        2,
        4,
        w * 0.62,
        h * 0.52,
        0,
        0,
        Math.PI * 2
    );

    ctx.fill();

    // Wheels
    const wheelPositions =
        kind === "truck"
            ? [-h * 0.34, -h * 0.12, h * 0.28]
            : [-h * 0.30, h * 0.27];

    wheelPositions.forEach(wheelY => {

        fillRound(
            -w / 2 - 2,
            wheelY,
            5,
            13,
            2,
            "#101214"
        );

        fillRound(
            w / 2 - 3,
            wheelY,
            5,
            13,
            2,
            "#101214"
        );

    });

    // Metallic body gradient
    const gradient = ctx.createLinearGradient(
        -w / 2,
        0,
        w / 2,
        0
    );

    gradient.addColorStop(0, shade(bodyColor, -45));
    gradient.addColorStop(0.18, shade(bodyColor, -12));
    gradient.addColorStop(0.48, shade(bodyColor, 28));
    gradient.addColorStop(0.78, shade(bodyColor, -5));
    gradient.addColorStop(1, shade(bodyColor, -48));

    if (kind === "truck") {

        // Truck frame
        fillRound(
            -w / 2,
            -h / 2,
            w,
            h,
            4,
            "#343c42"
        );

        // Cargo container
        const cargoGradient = ctx.createLinearGradient(
            -w / 2,
            0,
            w / 2,
            0
        );

        cargoGradient.addColorStop(0, shade(bodyColor, -38));
        cargoGradient.addColorStop(0.5, shade(bodyColor, 30));
        cargoGradient.addColorStop(1, shade(bodyColor, -38));

        fillRound(
            -w * 0.43,
            -h * 0.43,
            w * 0.86,
            h * 0.60,
            3,
            cargoGradient
        );

        ctx.strokeStyle = "rgba(20,25,30,.4)";
        ctx.lineWidth = 1;

        for (let i = 1; i < 7; i++) {

            const lineY = -h * 0.40 + i * h * 0.075;

            ctx.beginPath();

            ctx.moveTo(-w * 0.39, lineY);
            ctx.lineTo(w * 0.39, lineY);

            ctx.stroke();

        }

        fillRound(
            -w * 0.43,
            h * 0.20,
            w * 0.86,
            h * 0.25,
            3,
            gradient
        );

    } else {

        const bodyW =
            kind === "sports"
                ? w * 0.90
                : w * 0.94;

        const bodyH =
            kind === "ambulance"
                ? h * 0.96
                : h * 0.94;

        fillRound(
            -bodyW / 2,
            -bodyH / 2,
            bodyW,
            bodyH,
            kind === "sports" ? 10 : 7,
            gradient
        );

        // Front bonnet
        fillRound(
            -w * 0.34,
            -h * 0.43,
            w * 0.68,
            h * 0.20,
            5,
            shade(bodyColor, 20)
        );

        // Front windscreen
        const glass = ctx.createLinearGradient(
            0,
            -h * 0.26,
            0,
            -h * 0.02
        );

        glass.addColorStop(0, "#101c26");
        glass.addColorStop(0.45, "#536a78");
        glass.addColorStop(1, "#172630");

        fillRound(
            -w * 0.34,
            -h * 0.24,
            w * 0.68,
            h * 0.23,
            4,
            glass
        );

        // Roof
        fillRound(
            -w * 0.34,
            -h * 0.01,
            w * 0.68,
            h * 0.13,
            3,
            shade(bodyColor, -14)
        );

        // Rear window
        fillRound(
            -w * 0.31,
            h * 0.13,
            w * 0.62,
            h * 0.18,
            4,
            "#25343d"
        );

        // Glass reflection
        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(-w * 0.24, -h * 0.20);
        ctx.lineTo(-w * 0.05, -h * 0.04);

        ctx.stroke();

        // Mirrors
        fillRound(
            -w * 0.52,
            -h * 0.20,
            4,
            8,
            2,
            "#101316"
        );

        fillRound(
            w * 0.40,
            -h * 0.20,
            4,
            8,
            2,
            "#101316"
        );

        // Police SUV markings
        if (kind === "police") {

            ctx.fillStyle = "#182c49";

            ctx.fillRect(
                -w * 0.44,
                -h * 0.01,
                w * 0.88,
                7
            );

            ctx.fillStyle = "#d62d35";

            ctx.fillRect(
                -w * 0.24,
                -3,
                w * 0.22,
                5
            );

            ctx.fillStyle = "#2469d8";

            ctx.fillRect(
                w * 0.02,
                -3,
                w * 0.22,
                5
            );

        }

        // Ambulance markings
        if (kind === "ambulance") {

            ctx.fillStyle = "#c52f2f";

            ctx.fillRect(
                -w * 0.44,
                -h * 0.01,
                w * 0.88,
                6
            );

            ctx.fillRect(
                -2,
                -h * 0.06,
                4,
                13
            );

            ctx.fillRect(
                -6,
                -h * 0.02,
                12,
                4
            );

        }

        // Sports car spoiler
        if (kind === "sports") {

            ctx.fillStyle = "#16191d";

            ctx.fillRect(
                -w * 0.42,
                h * 0.36,
                w * 0.84,
                3
            );

        }

    }

    // Front headlights
    fillRound(
        -w * 0.35,
        -h * 0.47,
        w * 0.20,
        4,
        1,
        "#fff0c4"
    );

    fillRound(
        w * 0.15,
        -h * 0.47,
        w * 0.20,
        4,
        1,
        "#fff0c4"
    );

    // Rear lights
    fillRound(
        -w * 0.36,
        h * 0.43,
        w * 0.20,
        4,
        1,
        "#e42e2e"
    );

    fillRound(
        w * 0.16,
        h * 0.43,
        w * 0.20,
        4,
        1,
        "#e42e2e"
    );

    ctx.restore();

}


/* =========================================
   TRAFFIC GENERATION
========================================= */

function spawnTraffic() {

    // Left three lanes: same direction.
    // Right three lanes: oncoming traffic.

    const direction =
        Math.random() < 0.57
            ? "same"
            : "oncoming";

    const lane =
        direction === "same"
            ? Math.floor(Math.random() * 3)
            : 3 + Math.floor(Math.random() * 3);

    // Avoid close vehicle stacking.
    const occupied = traffic.some(car =>
        car.lane === lane &&
        car.y < 145
    );

    if (occupied) return;

    const type = trafficTypes[
        Math.floor(Math.random() * trafficTypes.length)
    ];

    const spec = vehicles[type];

    const paint =
        type === "police" || type === "ambulance"
            ? "#eeeeea"
            : trafficPaints[
                Math.floor(Math.random() * trafficPaints.length)
            ];

    traffic.push({

        lane: lane,
        direction: direction,

        x: laneX(lane),
        y: -spec.length - 20,

        width: spec.width,
        length: spec.length,

        type: type,
        paint: paint,

        // World speed
        worldSpeed:
            direction === "same"
                ? 3.5 + Math.random() * 3.5
                : 4.5 + Math.random() * 3.5,

        previousY: -spec.length - 20

    });

}


/* =========================================
   COLLISION DETECTION
   Swept collision catches fast crossings.
========================================= */

function checkCollision(playerCar, trafficCar) {

    const horizontalDistance = Math.abs(
        playerCar.x - trafficCar.x
    );

    const horizontalOverlap =
        horizontalDistance <
        (playerCar.width + trafficCar.width) * 0.43;

    if (!horizontalOverlap) return false;

    const minY = Math.min(
        trafficCar.previousY,
        trafficCar.y
    );

    const maxY = Math.max(
        trafficCar.previousY,
        trafficCar.y
    );

    const playerTop =
        playerCar.y - playerCar.length / 2;

    const playerBottom =
        playerCar.y + playerCar.length / 2;

    const trafficTop =
        minY - trafficCar.length / 2;

    const trafficBottom =
        maxY + trafficCar.length / 2;

    return (
        playerBottom > trafficTop &&
        playerTop < trafficBottom
    );

}


/* =========================================
   GAME PHYSICS
========================================= */

function update(dt) {

    const frame = Math.min(
        dt / 16.67,
        2.2
    );

    // Acceleration
    if (keys.accelerate) {
        speed += 0.13 * frame;
    } else {
        speed -= 0.025 * frame;
    }

    // Brake
    if (keys.brake) {
        speed -= 0.23 * frame;
    }

    speed = Math.max(
        0,
        Math.min(12, speed)
    );

    // Steering
    const steering =
        (2.8 + speed * 0.35) * frame;

    if (keys.left) {
        player.x -= steering;
    }

    if (keys.right) {
        player.x += steering;
    }

    // Player restricted to left three lanes
    const half = player.width / 2;

    player.x = Math.max(
        road.x + half + 3,

        Math.min(
            road.x + road.laneWidth * 3 - half - 5,
            player.x
        )
    );

    // Moving road
    roadOffset =
        (roadOffset + speed * frame * 1.8) % 48;

    sceneryOffset =
        (sceneryOffset + speed * frame * 1.2) % 120;

    // Traffic generation
    spawnTimer += dt;

    const spawnInterval = Math.max(
        650,
        1500 - speed * 55
    );

    if (spawnTimer >= spawnInterval) {

        spawnTraffic();

        spawnTimer = 0;

    }

    /*
       Relative movement:

       Same direction:
       Player speed - traffic speed.

       Oncoming direction:
       Player speed + oncoming traffic speed.

       This means oncoming traffic moves towards the
       player even while the player is stopped.
    */

    for (const car of traffic) {

        car.previousY = car.y;

        const relativeSpeed =
            car.direction === "same"
                ? speed - car.worldSpeed
                : speed + car.worldSpeed;

        car.y += relativeSpeed * frame * 1.8;

        // Collision checked at every update,
        // including when player speed is zero.
        if (checkCollision(player, car)) {
            endRace();
            return;
        }

    }

    // Remove distant traffic
    traffic = traffic.filter(car =>
        car.y > -car.length - 80 &&
        car.y < road.height + car.length + 80
    );

    if (speed > 0) {
        score += speed * frame * 0.08;
    }

    updateHUD();

}


/* =========================================
   HUD
========================================= */

function updateHUD() {

    speedLabel.textContent =
        Math.round(speed * 15) + " KM/H";

    scoreLabel.textContent =
        Math.floor(score);

}


/* =========================================
   RENDERING
========================================= */

function draw() {

    if (!road.width || !road.height) return;

    ctx.clearRect(
        0,
        0,
        road.width,
        road.height
    );

    drawScenery();
    drawRoad();

    // Draw traffic
    traffic.forEach(car => {

        drawVehicle(
            car.x,
            car.y,
            car.type,
            car.paint,
            car.direction === "oncoming"
        );

    });

    // Player car
    const playerPaint =
        selectedPaint === "black"
            ? "#17191c"
            : "#eeeeea";

    drawVehicle(
        player.x,
        player.y,
        selectedCar,
        playerPaint,
        false
    );

}


/* =========================================
   ANIMATION LOOP
========================================= */

function gameLoop(timestamp) {

    if (!running) return;

    const dt = Math.min(
        timestamp - lastTime,
        40
    );

    lastTime = timestamp;

    update(dt);

    draw();

    if (running) {
        animationId = requestAnimationFrame(gameLoop);
    }

}


/* =========================================
   GAME OVER
========================================= */

function endRace() {

    if (!running) return;

    running = false;

    clearControls();

    $("finalScore").textContent =
        Math.floor(score);

    gameOver.classList.remove("hidden");

}


/* =========================================
   INITIAL DISPLAY
========================================= */

resizeCanvas();

trackLabel.textContent =
    tracks[selectedTrack].name;
