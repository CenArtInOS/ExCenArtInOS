
/* =====================================================
   ExCenArtInOS - OFF ROAD MOTORCYCLE
   Realistic 2D side-view riding engine
   Improved speed, momentum, suspension and jumping
   Detailed scenery, lighting, road texture and dust
===================================================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const speedDisplay = $("speed");
const distanceDisplay = $("distance");
const timeDisplay = $("time");

const startScreen = $("message");
const crashScreen = $("crashMessage");
const crashReason = $("crashReason");

const startButton = $("startButton");
const restartButton = $("restartButton");

const accelerateButton = $("accelerate");
const brakeButton = $("brake");
const leanBackButton = $("leanBack");
const leanForwardButton = $("leanForward");

/* =====================================================
   CONFIGURATION
===================================================== */

// Realistic speed range for an off-road motorcycle.
const MAX_SPEED = 155;

// World movement: pixels travelled per km/h.
const SPEED_SCALE = 3.0;

const GRAVITY = 1050;
const TERRAIN_STEP = 24;

const ENVIRONMENTS = [
    {
        name: "DESERT",
        sky: "#d1a078",
        distant: "#92705a",
        middle: "#a77b53",
        ground: "#ad895e",
        road: "#51483e"
    },
    {
        name: "CITY",
        sky: "#91a4ae",
        distant: "#65727a",
        middle: "#68747b",
        ground: "#62615c",
        road: "#414344"
    },
    {
        name: "BRIDGE",
        sky: "#91b1c0",
        distant: "#64838c",
        middle: "#647a7e",
        ground: "#586b6d",
        road: "#45494a"
    },
    {
        name: "FOREST",
        sky: "#819b83",
        distant: "#3c5b45",
        middle: "#496449",
        ground: "#526347",
        road: "#41483a"
    }
];

/* =====================================================
   GAME STATE
===================================================== */

let width = 0;
let height = 0;
let dpr = 1;

let running = false;
let crashed = false;

let lastTime = 0;

let cameraX = 0;
let distance = 0;
let speed = 0;

let terrain = [];
let scenery = [];
let particles = [];

let environmentIndex = 0;
let nextEnvironmentIndex = 1;
let environmentTimer = 0;
let environmentBlend = 1;

let dayTimer = 0;
let isDay = true;

let input = {
    accelerate: false,
    brake: false,
    leanBack: false,
    leanForward: false
};

const bike = {
    x: 0,
    y: 0,

    vy: 0,

    angle: 0,
    angularVelocity: 0,

    wheelRadius: 17,
    wheelBase: 100,

    wheelRotation: 0,

    grounded: true,
    suspension: 0,
    suspensionVelocity: 0,

    lean: 0
};

/* =====================================================
   UTILITIES
===================================================== */

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function rand(min, max) {
    return min + Math.random() * (max - min);
}

function smooth(t) {
    return t * t * (3 - 2 * t);
}

function hexColor(a, b, t) {
    const parse = c => [
        parseInt(c.slice(1, 3), 16),
        parseInt(c.slice(3, 5), 16),
        parseInt(c.slice(5, 7), 16)
    ];

    const A = parse(a);
    const B = parse(b);

    return `rgb(${Math.round(lerp(A[0], B[0], t))},
                 ${Math.round(lerp(A[1], B[1], t))},
                 ${Math.round(lerp(A[2], B[2], t))})`;
}

function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

/* =====================================================
   CANVAS
===================================================== */

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (terrain.length === 0) {
        generateTerrain();
    }

    if (!running) {
        bike.x = cameraX + width * 0.30;
        bike.y = bikeGroundHeight();
    }

    render();
}

window.addEventListener("resize", resizeCanvas);

/* =====================================================
   TERRAIN
===================================================== */

function generateTerrain() {
    terrain = [];

    let y = height * 0.69;
    let slope = 0;

    for (let i = 0; i < 180; i++) {
        slope += rand(-0.025, 0.025);
        slope = clamp(slope, -0.12, 0.12);

        y += slope * TERRAIN_STEP;

        // Occasional natural hills and dips.
        if (i % 30 === 0) {
            slope += rand(-0.08, 0.08);
        }

        y = clamp(y, height * 0.43, height * 0.83);

        terrain.push({
            x: i * TERRAIN_STEP,
            y
        });
    }
}

function groundAt(x) {
    if (terrain.length < 2) {
        return height * 0.69;
    }

    if (x <= terrain[0].x) {
        return terrain[0].y;
    }

    const last = terrain[terrain.length - 1];

    if (x >= last.x) {
        return last.y;
    }

    let low = 0;
    let high = terrain.length - 1;

    while (low < high - 1) {
        const mid = Math.floor((low + high) / 2);

        if (terrain[mid].x <= x) {
            low = mid;
        } else {
            high = mid;
        }
    }

    const a = terrain[low];
    const b = terrain[high];

    return lerp(
        a.y,
        b.y,
        (x - a.x) / (b.x - a.x)
    );
}

function groundAngle(x) {
    return Math.atan2(
        groundAt(x + 8) - groundAt(x - 8),
        16
    );
}

function bikeGroundHeight() {
    const rear = groundAt(bike.x - bike.wheelBase / 2);
    const front = groundAt(bike.x + bike.wheelBase / 2);

    return (rear + front) / 2 - bike.wheelRadius;
}

function maintainTerrain() {
    const last = terrain[terrain.length - 1];

    if (!last) return;

    if (last.x < cameraX + width + 500) {
        const previous = last;

        let nextY = previous.y + rand(-8, 8);

        // Larger natural landscape changes.
        if (Math.random() < 0.035) {
            nextY += rand(-35, 35);
        }

        nextY = clamp(
            nextY,
            height * 0.42,
            height * 0.84
        );

        terrain.push({
            x: previous.x + TERRAIN_STEP,
            y: nextY
        });
    }

    while (
        terrain.length > 5 &&
        terrain[1].x < cameraX - 300
    ) {
        terrain.shift();
    }
}

/* =====================================================
   ENVIRONMENT AND SCENERY
===================================================== */

function createScenery() {
    const biome = ENVIRONMENTS[environmentIndex].name;

    let types;

    if (biome === "DESERT") {
        types = ["cactus", "rock", "hill", "dead-tree"];
    } else if (biome === "CITY") {
        types = ["building", "streetlight", "car", "barrier"];
    } else if (biome === "BRIDGE") {
        types = ["bridge-post", "barrier", "streetlight"];
    } else {
        types = ["tree", "tree", "rock", "fallen-tree"];
    }

    const type = types[Math.floor(Math.random() * types.length)];

    scenery.push({
        x: cameraX + width + rand(80, 400),
        type,
        scale: rand(0.8, 1.3),
        side: Math.random() < 0.5 ? -1 : 1,
        obstacle: type === "barrier" && Math.random() < 0.12
    });
}

function updateScenery() {
    if (scenery.length < 55 && Math.random() < 0.055) {
        createScenery();
    }

    scenery = scenery.filter(
        item => item.x > cameraX - 300
    );
}

function drawScenery() {
    for (const item of scenery) {
        const x = item.x - cameraX;

        if (x < -180 || x > width + 180) continue;

        const roadY = groundAt(item.x);
        const y = roadY + 5;

        ctx.save();
        ctx.translate(
            x + item.side * 105,
            y
        );

        ctx.scale(item.scale, item.scale);

        switch (item.type) {
            case "tree":
                drawTree();
                break;
            case "cactus":
                drawCactus();
                break;
            case "rock":
                drawRock();
                break;
            case "dead-tree":
                drawDeadTree();
                break;
            case "building":
                drawBuilding();
                break;
            case "streetlight":
                drawStreetlight();
                break;
            case "car":
                drawParkedCar();
                break;
            case "barrier":
                drawBarrier();
                break;
            case "bridge-post":
                drawBridgePost();
                break;
            case "fallen-tree":
                drawFallenTree();
                break;
        }

        ctx.restore();
    }
}

function drawTree() {
    ctx.fillStyle = "#493a2b";
    ctx.fillRect(-7, -95, 14, 95);

    const colors = ["#294d32", "#315a37", "#3b6840"];

    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colors[i];

        ctx.beginPath();
        ctx.arc(
            rand(-7, 7),
            -105 - i * 17,
            28 - i * 4,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }
}

function drawCactus() {
    ctx.fillStyle = "#477c4b";
    roundedRect(-8, -80, 16, 80, 7);
    ctx.fill();

    roundedRect(-27, -55, 10, 36, 5);
    ctx.fill();
    roundedRect(-27, -55, 22, 10, 5);
    ctx.fill();

    roundedRect(17, -66, 10, 36, 5);
    ctx.fill();
    roundedRect(7, -66, 20, 10, 5);
    ctx.fill();
}

function drawRock() {
    ctx.fillStyle = "#77736b";

    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(-28, -28);
    ctx.lineTo(-10, -40);
    ctx.lineTo(12, -34);
    ctx.lineTo(34, -13);
    ctx.lineTo(31, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(-20, -25);
    ctx.lineTo(-8, -36);
    ctx.lineTo(8, -30);
    ctx.lineTo(-6, -23);
    ctx.closePath();
    ctx.fill();
}

function drawDeadTree() {
    ctx.strokeStyle = "#574333";
    ctx.lineWidth = 9;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -90);
    ctx.lineTo(-24, -120);
    ctx.moveTo(0, -65);
    ctx.lineTo(29, -95);
    ctx.stroke();
}

function drawBuilding() {
    ctx.fillStyle = "#6b7379";
    ctx.fillRect(-42, -115, 84, 115);

    ctx.fillStyle = "#9eaaa9";

    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
            ctx.fillRect(
                -31 + col * 28,
                -100 + row * 20,
                13,
                10
            );
        }
    }

    ctx.fillStyle = "#343b40";
    ctx.fillRect(-12, -28, 24, 28);
}

function drawStreetlight() {
    ctx.strokeStyle = "#42494c";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -120);
    ctx.lineTo(30, -120);
    ctx.stroke();

    ctx.fillStyle = "#f7e4ad";
    ctx.fillRect(20, -125, 18, 8);
}

function drawParkedCar() {
    ctx.fillStyle = "#343a3e";
    roundedRect(-40, -35, 80, 35, 7);
    ctx.fill();

    ctx.fillStyle = "#b4c0c3";

    ctx.beginPath();
    ctx.moveTo(-25, -35);
    ctx.lineTo(-12, -54);
    ctx.lineTo(22, -54);
    ctx.lineTo(33, -35);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#405969";
    ctx.fillRect(-9, -50, 27, 13);

    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-24, -2, 10, 0, Math.PI * 2);
    ctx.arc(25, -2, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawBarrier() {
    ctx.fillStyle = "#c8c5b9";
    ctx.fillRect(-45, -24, 90, 24);

    ctx.fillStyle = "#bb4e3c";

    for (let x = -36; x < 40; x += 25) {
        ctx.save();
        ctx.translate(x, -12);
        ctx.rotate(-0.6);
        ctx.fillRect(-5, -16, 10, 32);
        ctx.restore();
    }
}

function drawBridgePost() {
    ctx.fillStyle = "#9a9d99";
    ctx.fillRect(-8, -130, 16, 130);

    ctx.fillStyle = "#c5c5bd";
    ctx.fillRect(-70, -130, 140, 9);
}

function drawFallenTree() {
    ctx.fillStyle = "#60452e";
    ctx.save();
    ctx.rotate(-0.12);
    ctx.fillRect(-65, -18, 130, 17);
    ctx.restore();
}

/* =====================================================
   BACKGROUND AND LIGHTING
===================================================== */

function drawBackground() {
    const a = ENVIRONMENTS[environmentIndex];
    const b = ENVIRONMENTS[nextEnvironmentIndex];

    const t = smooth(environmentBlend);

    const sky = hexColor(a.sky, b.sky, t);
    const distant = hexColor(a.distant, b.distant, t);
    const middle = hexColor(a.middle, b.middle, t);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);

    gradient.addColorStop(0, sky);
    gradient.addColorStop(1, middle);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (!isDay) {
        ctx.fillStyle = "rgba(13,22,43,0.55)";
        ctx.fillRect(0, 0, width, height);
    }

    // Sun / moon.
    ctx.beginPath();
    ctx.arc(width * 0.82, height * 0.17, 23, 0, Math.PI * 2);

    ctx.fillStyle = isDay ? "#ffe2ad" : "#d9e2f0";
    ctx.fill();

    // Distant hills.
    ctx.fillStyle = distant;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.60);

    for (let x = 0; x <= width + 20; x += 15) {
        const worldX = cameraX * 0.13 + x;

        const y =
            height * 0.49 +
            Math.sin(worldX * 0.003) * height * 0.045 +
            Math.sin(worldX * 0.008) * height * 0.018;

        ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Middle terrain.
    ctx.fillStyle = middle;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.67);

    for (let x = 0; x <= width + 20; x += 15) {
        const worldX = cameraX * 0.36 + x;

        const y =
            height * 0.61 +
            Math.sin(worldX * 0.005) * height * 0.035;

        ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
}

/* =====================================================
   ROAD AND SURFACE DETAILS
===================================================== */

function drawRoad() {
    const biome = ENVIRONMENTS[environmentIndex];

    ctx.beginPath();

    for (let x = 0; x <= width + 12; x += 5) {
        const y = groundAt(cameraX + x);

        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const roadGradient = ctx.createLinearGradient(
        0,
        height * 0.55,
        0,
        height
    );

    roadGradient.addColorStop(0, biome.road);
    roadGradient.addColorStop(1, "#292c2d");

    ctx.fillStyle = roadGradient;
    ctx.fill();

    // Natural road surface marks.
    ctx.save();
    ctx.beginPath();

    for (let x = 0; x <= width; x += 5) {
        const y = groundAt(cameraX + x);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.clip();

    const spacing = 90;

    for (
        let worldX = Math.floor(cameraX / spacing) * spacing;
        worldX < cameraX + width + spacing;
        worldX += spacing
    ) {
        const x = worldX - cameraX;

        ctx.fillStyle = "rgba(205,193,167,0.12)";
        ctx.fillRect(
            x,
            groundAt(worldX) + 12,
            25,
            2
        );

        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(
            x + 35,
            groundAt(worldX) + 25,
            18,
            2
        );
    }

    ctx.restore();

    // Road edge.
    ctx.strokeStyle = "rgba(220,215,200,0.35)";
    ctx.lineWidth = 2;

    ctx.beginPath();

    for (let x = 0; x <= width; x += 5) {
        const y = groundAt(cameraX + x);

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.stroke();
}

/* =====================================================
   MOTORCYCLE WHEELS
===================================================== */

function drawWheel(x) {
    const r = bike.wheelRadius;

    ctx.save();
    ctx.translate(x, 0);

    // Tyre shadow.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(2, 4, r + 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tyre.
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#111416";
    ctx.fill();

    ctx.strokeStyle = "#41484c";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rim.
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.strokeStyle = "#c1c7c9";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rotating spokes.
    ctx.save();
    ctx.rotate(bike.wheelRotation);

    ctx.strokeStyle = "#aeb5b8";
    ctx.lineWidth = 1;

    for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
            Math.cos(a) * r * 0.65,
            Math.sin(a) * r * 0.65
        );
        ctx.stroke();
    }

    ctx.restore();

    // Hub.
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#d0d3d3";
    ctx.fill();

    // Tyre tread.
    ctx.strokeStyle = "#62676a";
    ctx.lineWidth = 1;

    for (let i = 0; i < 20; i++) {
        const a =
            i * Math.PI / 10 +
            bike.wheelRotation;

        ctx.beginPath();
        ctx.moveTo(
            Math.cos(a) * (r - 1),
            Math.sin(a) * (r - 1)
        );
        ctx.lineTo(
            Math.cos(a) * (r + 1),
            Math.sin(a) * (r + 1)
        );
        ctx.stroke();
    }

    ctx.restore();
}

/* =====================================================
   MOTORCYCLE BODY AND RIDER
===================================================== */

function drawMotorcycle() {
    const screenX = bike.x - cameraX;
    const screenY = bike.y + bike.suspension;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(bike.angle);

    const rear = -bike.wheelBase / 2;
    const front = bike.wheelBase / 2;

    // Shadow.
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 5, 64, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    drawWheel(rear);
    drawWheel(front);

    // Frame.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#252a2e";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(rear, 0);
    ctx.lineTo(-8, -31);
    ctx.lineTo(front - 5, -2);
    ctx.lineTo(9, -43);
    ctx.lineTo(-8, -31);
    ctx.stroke();

    // Rear swingarm.
    ctx.strokeStyle = "#8a9296";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(rear, 0);
    ctx.lineTo(8, -29);
    ctx.stroke();

    // Engine.
    ctx.fillStyle = "#41484d";
    roundedRect(-13, -31, 34, 29, 6);
    ctx.fill();

    ctx.fillStyle = "#858d90";
    ctx.fillRect(-8, -27, 24, 3);
    ctx.fillRect(-8, -20, 24, 3);
    ctx.fillRect(-8, -13, 24, 3);

    // Tank.
    const tankGradient = ctx.createLinearGradient(0, -60, 0, -30);
    tankGradient.addColorStop(0, "#f2f2ef");
    tankGradient.addColorStop(0.45, "#c6c9c7");
    tankGradient.addColorStop(1, "#555d62");

    ctx.fillStyle = tankGradient;
    ctx.beginPath();
    ctx.moveTo(-14, -43);
    ctx.quadraticCurveTo(-7, -63, 17, -55);
    ctx.lineTo(34, -39);
    ctx.quadraticCurveTo(12, -30, -12, -35);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#343a3e";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Seat.
    ctx.fillStyle = "#171a1c";
    ctx.beginPath();
    ctx.moveTo(-38, -43);
    ctx.lineTo(-20, -51);
    ctx.lineTo(4, -48);
    ctx.lineTo(12, -41);
    ctx.lineTo(-32, -37);
    ctx.closePath();
    ctx.fill();

    // Exhaust.
    ctx.strokeStyle = "#a9afb1";
    ctx.lineWidth = 6;

    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.lineTo(-35, -4);
    ctx.stroke();

    // Front fork.
    ctx.strokeStyle = "#c7cdcf";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(front, -2);
    ctx.lineTo(front - 18, -47);
    ctx.stroke();

    ctx.strokeStyle = "#555d61";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(front - 5, -5);
    ctx.lineTo(front - 23, -48);
    ctx.stroke();

    // Rear suspension.
    ctx.strokeStyle = "#b9c0c2";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(rear + 5, -2);
    ctx.lineTo(-8, -32);
    ctx.stroke();

    // Handlebar.
    ctx.strokeStyle = "#292e31";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(front - 18, -47);
    ctx.lineTo(front + 4, -54);
    ctx.lineTo(front + 16, -48);
    ctx.stroke();

    // Front mudguard.
    ctx.strokeStyle = "#d6d9d7";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.arc(front, 0, 21, Math.PI, Math.PI * 1.82);
    ctx.stroke();

    // Rider legs.
    ctx.strokeStyle = "#242a30";
    ctx.lineWidth = 10;

    ctx.beginPath();
    ctx.moveTo(-13, -46);
    ctx.lineTo(-22, -25);
    ctx.lineTo(5, -17);
    ctx.stroke();

    // Rider torso.
    ctx.strokeStyle = "#252c33";
    ctx.lineWidth = 14;

    ctx.beginPath();
    ctx.moveTo(-7, -47);
    ctx.lineTo(2, -75);
    ctx.lineTo(front - 8, -55);
    ctx.stroke();

    // Rider arm.
    ctx.strokeStyle = "#343c43";
    ctx.lineWidth = 7;

    ctx.beginPath();
    ctx.moveTo(0, -70);
    ctx.lineTo(front + 8, -52);
    ctx.stroke();

    // Gloves.
    ctx.fillStyle = "#15191c";
    ctx.beginPath();
    ctx.arc(front + 8, -52, 5, 0, Math.PI * 2);
    ctx.fill();

    // Helmet.
    const helmetGradient = ctx.createLinearGradient(0, -100, 0, -75);
    helmetGradient.addColorStop(0, "#f0f1ed");
    helmetGradient.addColorStop(1, "#717c83");

    ctx.fillStyle = helmetGradient;
    ctx.beginPath();
    ctx.ellipse(4, -87, 14, 13, -0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#27343c";
    ctx.beginPath();
    ctx.ellipse(14, -86, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor.
    ctx.fillStyle = "#18232b";
    ctx.fillRect(11, -91, 10, 4);

    // Headlight.
    ctx.fillStyle = "#fff2c8";
    ctx.beginPath();
    ctx.ellipse(front - 5, -43, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

/* =====================================================
   DUST AND PARTICLES
===================================================== */

function addDust() {
    if (!bike.grounded || speed < 20) return;

    if (Math.random() < 0.45) {
        particles.push({
            x: bike.x - 30,
            y: bike.y + 10,
            vx: -rand(20, 100),
            vy: -rand(10, 55),
            life: rand(0.25, 0.7),
            size: rand(2, 6)
        });
    }
}

function updateParticles(dt) {
    for (const p of particles) {
        p.x += (p.vx - speed * 0.4) * dt;
        p.y += p.vy * dt;
        p.vy -= 15 * dt;
        p.life -= dt;
    }

    particles = particles.filter(p => p.life > 0);
}

function drawParticles() {
    for (const p of particles) {
        const x = p.x - cameraX;

        ctx.globalAlpha = clamp(p.life * 1.5, 0, 0.55);
        ctx.fillStyle = "#c1a98a";

        ctx.beginPath();
        ctx.arc(x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

/* =====================================================
   PHYSICS
===================================================== */

function updatePhysics(dt) {
    // Acceleration and braking.
    const acceleration = input.accelerate ? 105 : 0;
    const braking = input.brake ? 240 : 0;

    speed += acceleration * dt;
    speed -= braking * dt;

    // Natural drag.
    if (!input.accelerate) {
        speed -= (5 + speed * 0.035) * dt;
    }

    speed = clamp(speed, 0, MAX_SPEED);

    // Corrected movement scaling.
    const movement = speed * SPEED_SCALE;

    cameraX += movement * dt;
    distance += movement * dt;

    bike.x = cameraX + width * 0.30;

    const rearX = bike.x - bike.wheelBase / 2;
    const frontX = bike.x + bike.wheelBase / 2;

    const rearY = groundAt(rearX);
    const frontY = groundAt(frontX);

    const targetGround = (rearY + frontY) / 2;
    const targetAngle = Math.atan2(
        frontY - rearY,
        bike.wheelBase
    );

    const oldY = bike.y;

    const lean =
        (input.leanForward ? 1 : 0) -
        (input.leanBack ? 1 : 0);

    bike.lean = lerp(bike.lean, lean, dt * 4);

    if (bike.grounded) {
        // Suspension responds to terrain changes.
        const targetY = targetGround - bike.wheelRadius;

        const springForce = (targetY - bike.y) * 70;

        bike.suspensionVelocity += springForce * dt;
        bike.suspensionVelocity *= Math.pow(0.12, dt);

        bike.suspension += bike.suspensionVelocity * dt;
        bike.suspension = clamp(bike.suspension, -8, 8);

        bike.y = targetY;

        bike.angle = lerp(
            bike.angle,
            targetAngle + bike.lean * 0.10,
            Math.min(1, dt * 7)
        );

        bike.vy = 0;

        // Launch over steep downhill drops.
        const drop = frontY - rearY;

        if (
            drop > 22 &&
            speed > 55
        ) {
            bike.grounded = false;
            bike.vy = -Math.min(280, speed * 1.8);
            bike.angularVelocity = 0;
        }

        // Front-wheel lift at high acceleration.
        if (
            input.accelerate &&
            input.leanBack &&
            speed > 65
        ) {
            bike.angle -= dt * 0.7;
        }
    } else {
        // Airborne physics.
        bike.vy += GRAVITY * dt;
        bike.y += bike.vy * dt;

        // Player controls the bike angle in the air.
        bike.angularVelocity += bike.lean * 3.8 * dt;
        bike.angularVelocity *= Math.pow(0.35, dt);

        bike.angle += bike.angularVelocity * dt;

        bike.angle = clamp(bike.angle, -1.05, 1.05);

        // Landing detection.
        const lowestGround = Math.min(rearY, frontY);

        if (
            bike.y + bike.wheelRadius >= lowestGround &&
            bike.vy > 0
        ) {
            const impact = bike.vy;

            bike.y = targetGround - bike.wheelRadius;
            bike.vy = 0;
            bike.grounded = true;

            if (impact > 650) {
                crash("Hard landing! Reduce speed before jumping.");
                return;
            }

            if (Math.abs(bike.angle - targetAngle) > 1.0) {
                crash("The bike landed at an unsafe angle!");
                return;
            }

            bike.angle = targetAngle;
            bike.suspension = -Math.min(8, impact * 0.012);
        }
    }

    // Wheel rotation follows actual world movement.
    bike.wheelRotation +=
        (movement * dt) / bike.wheelRadius;

    maintainTerrain();
    updateScenery();

    addDust();
    updateParticles(dt);

    // Obstacle collision.
    for (const item of scenery) {
        if (
            item.obstacle &&
            Math.abs(item.x - bike.x) < 30 &&
            bike.grounded
        ) {
            crash("You hit a road barrier!");
            return;
        }
    }
}

/* =====================================================
   ENVIRONMENT CYCLE
===================================================== */

function updateEnvironment(dt) {
    environmentTimer += dt;
    dayTimer += dt;

    if (environmentTimer >= 60) {
        environmentTimer = 0;

        environmentIndex = nextEnvironmentIndex;
        nextEnvironmentIndex =
            (environmentIndex + 1) % ENVIRONMENTS.length;

        environmentBlend = 0;
        scenery = [];
    }

    environmentBlend = clamp(
        environmentBlend + dt / 10,
        0,
        1
    );

    if (dayTimer >= 180) {
        dayTimer = 0;
        isDay = !isDay;
    }

    if (timeDisplay) {
        timeDisplay.textContent = isDay ? "DAY" : "NIGHT";
    }
}

/* =====================================================
   HUD
===================================================== */

function updateHUD() {
    if (speedDisplay) {
        speedDisplay.textContent =
            Math.round(speed) + " km/h";
    }

    if (distanceDisplay) {
        distanceDisplay.textContent =
            Math.round(distance) + " m";
    }
}

/* =====================================================
   CRASH AND RESET
===================================================== */

function crash(reason) {
    if (crashed) return;

    crashed = true;
    running = false;

    if (crashReason) {
        crashReason.textContent = reason;
    }

    if (crashScreen) {
        crashScreen.classList.remove("hidden");
    }
}

function resetGame() {
    speed = 0;
    distance = 0;
    cameraX = 0;

    environmentIndex = 0;
    nextEnvironmentIndex = 1;
    environmentTimer = 0;
    environmentBlend = 1;

    dayTimer = 0;
    isDay = true;

    scenery = [];
    particles = [];

    generateTerrain();

    bike.x = width * 0.30;
    bike.y = bikeGroundHeight();

    bike.vy = 0;
    bike.angle = 0;
    bike.angularVelocity = 0;
    bike.wheelRotation = 0;

    bike.grounded = true;
    bike.suspension = 0;
    bike.suspensionVelocity = 0;
    bike.lean = 0;

    input.accelerate = false;
    input.brake = false;
    input.leanBack = false;
    input.leanForward = false;

    crashed = false;

    if (startScreen) startScreen.classList.add("hidden");
    if (crashScreen) crashScreen.classList.add("hidden");

    running = true;

    updateHUD();
    updateEnvironment(0);
    render();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

/* =====================================================
   CONTROLS
===================================================== */

function bindHoldButton(element, property) {
    if (!element) return;

    element.addEventListener("pointerdown", event => {
        event.preventDefault();
        input[property] = true;

        if (element.setPointerCapture) {
            element.setPointerCapture(event.pointerId);
        }
    });

    const release = () => {
        input[property] = false;
    };

    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("lostpointercapture", release);
}

bindHoldButton(accelerateButton, "accelerate");
bindHoldButton(brakeButton, "brake");
bindHoldButton(leanBackButton, "leanBack");
bindHoldButton(leanForwardButton, "leanForward");

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") {
        input.accelerate = true;
        event.preventDefault();
    }

    if (key === "arrowdown" || key === "s") {
        input.brake = true;
        event.preventDefault();
    }

    if (key === "arrowleft" || key === "a") {
        input.leanBack = true;
        event.preventDefault();
    }

    if (key === "arrowright" || key === "d") {
        input.leanForward = true;
        event.preventDefault();
    }
});

window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") {
        input.accelerate = false;
    }

    if (key === "arrowdown" || key === "s") {
        input.brake = false;
    }

    if (key === "arrowleft" || key === "a") {
        input.leanBack = false;
    }

    if (key === "arrowright" || key === "d") {
        input.leanForward = false;
    }
});

window.addEventListener("blur", () => {
    input.accelerate = false;
    input.brake = false;
    input.leanBack = false;
    input.leanForward = false;
});

/* =====================================================
   RENDER
===================================================== */

function render() {
    if (!width || !height) return;

    ctx.clearRect(0, 0, width, height);

    drawBackground();
    drawRoad();
    drawScenery();
    drawParticles();
    drawMotorcycle();
}

/* =====================================================
   MAIN LOOP
===================================================== */

function gameLoop(timestamp) {
    if (!running) return;

    const dt = Math.min(
        (timestamp - lastTime) / 1000,
        0.04
    );

    lastTime = timestamp;

    updatePhysics(dt);

    if (!running) {
        render();
        return;
    }

    updateEnvironment(dt);
    updateHUD();

    render();

    if (running) {
        requestAnimationFrame(gameLoop);
    }
}

/* =====================================================
   BUTTON EVENTS
===================================================== */

if (startButton) {
    startButton.addEventListener("click", event => {
        event.preventDefault();
        resetGame();
    });
}

if (restartButton) {
    restartButton.addEventListener("click", event => {
        event.preventDefault();
        resetGame();
    });
}

/* =====================================================
   INITIALIZATION
===================================================== */

resizeCanvas();

if (startScreen) {
    startScreen.classList.remove("hidden");
}

if (crashScreen) {
    crashScreen.classList.add("hidden");
}

updateHUD();
render();
