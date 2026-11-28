
/* =========================================
   ExCenArtInOS SNAKE
   Fixed arena with three obstacle columns
   Edge portals, permanent food and dark theme
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const $ = id => document.getElementById(id);

const TILE = 12;
const MOVE_INTERVAL = 230;

let width = 0;
let height = 0;
let columns = 0;
let rows = 0;

let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

let food = null;
let walls = new Set();
let obstacles = [];

let portals = {
    top: [],
    bottom: [],
    left: [],
    right: []
};

let score = 0;
let best = Number(localStorage.getItem("snakeBest") || 0);

let running = false;
let paused = false;
let gameOver = false;

let accumulator = 0;
let lastFrame = 0;

const startOverlay = $("startOverlay");
const gameOverOverlay = $("gameOverOverlay");
const pauseOverlay = $("pauseOverlay");

$("best").textContent = best;

/* =========================================
   RESPONSIVE FULL-SCREEN CANVAS
========================================= */

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const oldColumns = columns;
    const oldRows = rows;

    columns = Math.max(20, Math.floor(width / TILE));
    rows = Math.max(16, Math.floor(height / TILE));

    if (oldColumns !== columns || oldRows !== rows) {
        if (running || gameOver) {
            // Rebuild the arena safely if the viewport changes.
            createArena();

            const cx = Math.floor(columns / 2);
            const cy = Math.floor(rows / 2);

            snake = [
                { x: cx, y: cy },
                { x: cx - 1, y: cy },
                { x: cx - 2, y: cy },
                { x: cx - 3, y: cy }
            ];

            direction = { x: 1, y: 0 };
            nextDirection = { x: 1, y: 0 };
            placeFood();
        }
    }

    draw();
}

/* =========================================
   GRID HELPERS
========================================= */

function key(x, y) {
    return `${x},${y}`;
}

function inside(x, y) {
    return x >= 0 && y >= 0 && x < columns && y < rows;
}

function blocked(x, y) {
    return walls.has(key(x, y));
}

function onSnake(x, y) {
    return snake.some(p => p.x === x && p.y === y);
}

function addWall(x, y) {
    if (inside(x, y)) walls.add(key(x, y));
}

function addHorizontal(x1, x2, y) {
    for (let x = x1; x <= x2; x++) addWall(x, y);
}

function addVertical(x, y1, y2) {
    for (let y = y1; y <= y2; y++) addWall(x, y);
}

function addRect(x, y, w, h) {
    const cells = [];

    for (let yy = y; yy < y + h; yy++) {
        for (let xx = x; xx < x + w; xx++) {
            if (inside(xx, yy)) {
                addWall(xx, yy);
                cells.push({ x: xx, y: yy });
            }
        }
    }

    obstacles.push({ x, y, w, h, cells });
}

/* =========================================
   FIXED ARENA DESIGN
========================================= */


        
function createArena() {
    walls.clear();
    obstacles = [];

    // Symmetrical top and bottom openings.
    const gap = Math.max(2, Math.floor(columns * 0.075));

    const gap1 = Math.floor(columns * 0.28);
    const gap2 = Math.floor(columns * 0.61);

    portals.top = [
        [gap1, gap1 + gap - 1],
        [gap2, gap2 + gap - 1]
    ];

    portals.bottom = [
        [gap1, gap1 + gap - 1],
        [gap2, gap2 + gap - 1]
    ];

    // Matching left and right openings.
    const sideGap = Math.max(2, Math.floor(rows * 0.10));
    const sideStart = Math.floor((rows - sideGap) / 2);

    portals.left = [sideStart, sideStart + sideGap - 1];
    portals.right = [sideStart, sideStart + sideGap - 1];

    // Symmetrical outer boundaries.
    for (let x = 0; x < columns; x++) {
        const topOpen = portals.top.some(g => x >= g[0] && x <= g[1]);
        const bottomOpen = portals.bottom.some(g => x >= g[0] && x <= g[1]);

        if (!topOpen) addWall(x, 0);
        if (!bottomOpen) addWall(x, rows - 1);
    }

    for (let y = 0; y < rows; y++) {
        const sideOpen = y >= sideStart && y < sideStart + sideGap;

        if (!sideOpen) {
            addWall(0, y);
            addWall(columns - 1, y);
        }
    }

    // Three identical, evenly spaced obstacle columns.
    const positions = [
        Math.floor(columns * 0.30),
        Math.floor(columns * 0.50),
        Math.floor(columns * 0.70)
    ];

    const thickness = Math.max(1, Math.floor(columns / 100));
    const obstacleWidth = Math.max(3, Math.floor(columns * 0.055));

    const upperStart = Math.floor(rows * 0.22);
    const upperEnd = Math.floor(rows * 0.43);

    const lowerStart = rows - upperEnd - 1;
    const lowerEnd = rows - upperStart - 1;

    positions.forEach((centerX, index) => {
        const x = centerX - Math.floor(thickness / 2);

        // Identical upper and lower vertical barriers.
        addRect(x, upperStart, thickness, upperEnd - upperStart);
        addRect(x, lowerStart, thickness, lowerEnd - lowerStart);

        // Matching horizontal ledges.
        const ledgeX = centerX - Math.floor(obstacleWidth / 2);

        addRect(ledgeX, upperStart, obstacleWidth, thickness);
        addRect(ledgeX, lowerEnd - thickness, obstacleWidth, thickness);
    });

    // Keep the starting area clear.
    const cx = Math.floor(columns / 2);
    const cy = Math.floor(rows / 2);

    for (let y = cy - 3; y <= cy + 3; y++) {
        for (let x = cx - 5; x <= cx + 5; x++) {
            walls.delete(key(x, y));
        }
    }
}


/* =========================================
   FOOD - STAYS UNTIL EATEN
========================================= */

function placeFood() {
    const free = [];

    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < columns - 1; x++) {
            if (!blocked(x, y) && !onSnake(x, y)) {
                free.push({ x, y });
            }
        }
    }

    food = free.length
        ? free[Math.floor(Math.random() * free.length)]
        : null;
}

/* =========================================
   GAME INITIALIZATION
========================================= */

function startGame() {
    score = 0;

    const cx = Math.floor(columns / 2);
    const cy = Math.floor(rows / 2);

    snake = [
        { x: cx, y: cy },
        { x: cx - 1, y: cy },
        { x: cx - 2, y: cy },
        { x: cx - 3, y: cy }
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    createArena();
    placeFood();

    running = true;
    paused = false;
    gameOver = false;

    accumulator = 0;
    lastFrame = performance.now();

    startOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");

    $("pauseButton").textContent = "PAUSE";

    updateHUD();
    draw();
}

/* =========================================
   EDGE PASSAGE AND WRAP
========================================= */

function inRange(position, range) {
    return position >= range[0] && position <= range[1];
}

function getNextHead() {
    const head = snake[0];

    let x = head.x + direction.x;
    let y = head.y + direction.y;

    if (x < 0) {
        if (!inRange(y, portals.left)) return null;
        x = columns - 1;
    } else if (x >= columns) {
        if (!inRange(y, portals.right)) return null;
        x = 0;
    }

    if (y < 0) {
        if (!portals.top.some(g => inRange(x, g))) return null;
        y = rows - 1;
    } else if (y >= rows) {
        if (!portals.bottom.some(g => inRange(x, g))) return null;
        y = 0;
    }

    return { x, y };
}

/* =========================================
   DIRECTION CONTROLS
========================================= */

function setDirection(x, y) {
    if (x === -nextDirection.x && y === -nextDirection.y) return;
    nextDirection = { x, y };
}

const directions = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
};

// Pointer events support Android touch and mouse.
document.querySelectorAll("[data-direction]").forEach(button => {
    button.addEventListener("pointerdown", event => {
        event.preventDefault();

        const vector = directions[button.dataset.direction];
        if (vector) setDirection(vector[0], vector[1]);
    });
});

// Keyboard support.
document.addEventListener("keydown", event => {
    const keys = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
    };

    const selected = keys[event.key];

    if (selected) {
        event.preventDefault();
        setDirection(...directions[selected]);
    }

    if (event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        togglePause();
    }
});

/* =========================================
   SNAKE MOVEMENT
========================================= */

function endGame() {
    running = false;
    gameOver = true;

    $("finalScore").textContent = score;
    gameOverOverlay.classList.remove("hidden");
}

function moveSnake() {
    direction = { ...nextDirection };

    const head = getNextHead();

    if (!head || blocked(head.x, head.y)) {
        endGame();
        return;
    }

    const eating = food && head.x === food.x && head.y === food.y;

    const body = eating ? snake : snake.slice(0, -1);

    if (body.some(p => p.x === head.x && p.y === head.y)) {
        endGame();
        return;
    }

    snake.unshift(head);

    if (eating) {
        score += 10;

        if (score > best) {
            best = score;
            localStorage.setItem("snakeBest", best);
        }

        const maximumLength = Math.floor(
            (columns * rows - walls.size) * 0.9
        );

        if (snake.length > maximumLength) {
            snake.pop();
        }

        // Food only moves after the snake eats it.
        placeFood();
    } else {
        snake.pop();
    }

    updateHUD();
}

/* =========================================
   DARK MAP RENDERING
========================================= */

function drawBackground() {
    ctx.fillStyle = "#111315";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#1b2024";
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= columns; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE, 0);
        ctx.lineTo(x * TILE, height);
        ctx.stroke();
    }

    for (let y = 0; y <= rows; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE);
        ctx.lineTo(width, y * TILE);
        ctx.stroke();
    }
}

function drawWalls() {
    ctx.fillStyle = "#343b41";
    ctx.strokeStyle = "#515a62";
    ctx.lineWidth = 0.6;

    walls.forEach(value => {
        const [x, y] = value.split(",").map(Number);

        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeRect(
            x * TILE + 0.5,
            y * TILE + 0.5,
            TILE - 1,
            TILE - 1
        );
    });
}

function drawFood() {
    if (!food) return;

    const x = food.x * TILE + TILE / 2;
    const y = food.y * TILE + TILE / 2;

    ctx.fillStyle = "#c5a36c";
    ctx.beginPath();
    ctx.arc(x, y, TILE * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#e2cda7";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, TILE * 0.43, 0, Math.PI * 2);
    ctx.stroke();
}

function drawSnake() {
    snake.forEach((part, index) => {
        const inset = 1.2;
        const x = part.x * TILE + inset;
        const y = part.y * TILE + inset;
        const size = TILE - inset * 2;

        ctx.fillStyle = index === 0 ? "#c2c9cf" : "#6c7780";

        ctx.beginPath();
        ctx.roundRect(x, y, size, size, 2);
        ctx.fill();

        ctx.strokeStyle = index === 0 ? "#e0e4e8" : "#929ca4";
        ctx.lineWidth = 0.6;
        ctx.stroke();

        if (index === 0) {
            ctx.fillStyle = "#171a1d";

            const cx = x + size / 2;
            const cy = y + size / 2;

            ctx.beginPath();
            ctx.arc(cx + direction.x * 2 - direction.y * 2,
                cy + direction.y * 2 + direction.x * 2,
                0.9, 0, Math.PI * 2);

            ctx.arc(cx + direction.x * 2 + direction.y * 2,
                cy + direction.y * 2 - direction.x * 2,
                0.9, 0, Math.PI * 2);

            ctx.fill();
        }
    });
}

function draw() {
    drawBackground();
    drawWalls();
    drawFood();
    drawSnake();
    updateHUD();
}

/* =========================================
   SCORE
========================================= */

function updateHUD() {
    $("score").textContent = score;
    $("best").textContent = best;
}

/* =========================================
   PAUSE AND GAME LOOP
========================================= */

function togglePause() {
    if (!running || gameOver) return;

    paused = !paused;

    pauseOverlay.classList.toggle("hidden", !paused);
    $("pauseButton").textContent = paused ? "RESUME" : "PAUSE";

    if (!paused) lastFrame = performance.now();
}

function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (!running || paused || gameOver) return;

    const delta = Math.min(timestamp - lastFrame, 100);
    lastFrame = timestamp;
    accumulator += delta;

    while (accumulator >= MOVE_INTERVAL && running && !paused) {
        moveSnake();
        accumulator -= MOVE_INTERVAL;
    }

    draw();
}

/* =========================================
   BUTTONS
========================================= */

$("startButton").addEventListener("click", startGame);
$("restartButton").addEventListener("click", startGame);
$("pauseButton").addEventListener("click", togglePause);
$("resumeButton").addEventListener("click", togglePause);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);
