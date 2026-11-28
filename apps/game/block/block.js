
/* =========================================
   BLOCK PUZZLE - TETRIS STYLE

   Board: 12 columns x 24 rows
   Seven standard falling shapes
   Line clearing: 10 points per line
   Every 3 locked blocks: floor rises
   Rising floor contains one random gap
   Original falling speed preserved
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const $ = id => document.getElementById(id);

const scoreDisplay = $("score");
const linesDisplay = $("lines");
const riseDisplay = $("rise");

const startScreen = $("startScreen");
const pauseScreen = $("pauseScreen");
const gameOverScreen = $("gameOverScreen");

const COLS = 16;
const ROWS = 30;

let board = [];
let current = null;
let nextPiece = null;

let score = 0;
let lines = 0;
let lockedPieces = 0;
let piecesUntilRise = 3;

let running = false;
let paused = false;
let gameOver = false;

let lastTime = 0;
let dropTimer = 0;
let lockTimer = 0;

let softDropping = false;
let repeatTimer = null;

const COLORS = {
    I: "#48c9d5",
    O: "#e5c84b",
    T: "#ad75dc",
    S: "#62c878",
    Z: "#dc6565",
    J: "#648fe0",
    L: "#e69a55"
};

/* Standard Tetris shapes */
const SHAPES = {
    I: [
        [1, 1, 1, 1]
    ],
    O: [
        [1, 1],
        [1, 1]
    ],
    T: [
        [0, 1, 0],
        [1, 1, 1]
    ],
    S: [
        [0, 1, 1],
        [1, 1, 0]
    ],
    Z: [
        [1, 1, 0],
        [0, 1, 1]
    ],
    J: [
        [1, 0, 0],
        [1, 1, 1]
    ],
    L: [
        [0, 0, 1],
        [1, 1, 1]
    ]
};

/* Create empty board */
function emptyBoard() {
    return Array.from(
        { length: ROWS },
        () => Array(COLS).fill(null)
    );
}

/* Random block selection */
function randomPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];

    const matrix = SHAPES[type].map(row => [...row]);

    return {
        type,
        matrix,
        color: COLORS[type],
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: 0
    };
}

/* Start or restart game */
function startGame() {
    board = emptyBoard();

    score = 0;
    lines = 0;
    lockedPieces = 0;
    piecesUntilRise = 3;

    current = null;
    nextPiece = randomPiece();

    running = true;
    paused = false;
    gameOver = false;

    dropTimer = 0;
    lockTimer = 0;
    lastTime = performance.now();

    softDropping = false;
    stopRepeat();

    startScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    updateHUD();
    spawnPiece();
    draw();
}

/* Spawn next falling block */
function spawnPiece() {
    current = nextPiece;

    current.x = Math.floor(
        (COLS - current.matrix[0].length) / 2
    );

    current.y = 0;

    nextPiece = randomPiece();

    drawNext();

    if (collides(current.matrix, current.x, current.y)) {
        endGame();
    }
}

/* Collision detection */
function collides(matrix, px, py) {
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (!matrix[y][x]) continue;

            const bx = px + x;
            const by = py + y;

            if (bx < 0 || bx >= COLS || by >= ROWS) {
                return true;
            }

            if (by >= 0 && board[by][bx]) {
                return true;
            }
        }
    }

    return false;
}

/* Move falling block */
function move(dx, dy) {
    if (!running || paused || gameOver || !current) return false;

    if (!collides(
        current.matrix,
        current.x + dx,
        current.y + dy
    )) {
        current.x += dx;
        current.y += dy;
        lockTimer = 0;

        draw();
        return true;
    }

    return false;
}

/* Rotate block clockwise */
function rotate() {
    if (!running || paused || gameOver || !current) return;

    const matrix = current.matrix;

    const rotated = matrix[0].map((_, i) =>
        matrix.map(row => row[i]).reverse()
    );

    const offsets = [0, -1, 1, -2, 2];

    for (const offset of offsets) {
        if (!collides(rotated, current.x + offset, current.y)) {
            current.matrix = rotated;
            current.x += offset;

            lockTimer = 0;
            draw();
            return;
        }
    }
}

/* Instant drop */
function hardDrop() {
    if (!running || paused || gameOver || !current) return;

    while (!collides(
        current.matrix,
        current.x,
        current.y + 1
    )) {
        current.y++;
    }

    lockPiece();
}

/* Lock current block into board */
function lockPiece() {
    if (!current || gameOver) return;

    for (let y = 0; y < current.matrix.length; y++) {
        for (let x = 0; x < current.matrix[y].length; x++) {
            if (!current.matrix[y][x]) continue;

            const bx = current.x + x;
            const by = current.y + y;

            if (by < 0) {
                endGame();
                return;
            }

            board[by][bx] = current.color;
        }
    }

    current = null;
    lockTimer = 0;

    // Clear completed lines before floor rises.
    clearLines();

    if (gameOver) return;

    // Count each block that locks.
    lockedPieces++;
    piecesUntilRise--;

    if (piecesUntilRise <= 0) {
        raiseFloor();

        if (gameOver) return;

        piecesUntilRise = 3;
    }

    updateHUD();

    spawnPiece();
    draw();
}

/* Remove completed lines */
function clearLines() {
    let cleared = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== null)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));

            cleared++;
            y++;
        }
    }

    if (cleared > 0) {
        score += cleared * 10;
        lines += cleared;

        updateHUD();
    }
}

/* Raise bottom floor by one row */
function raiseFloor() {
    // Top row must be empty before the board shifts.
    if (board[0].some(cell => cell !== null)) {
        endGame();
        return;
    }

    // Shift all existing blocks one row upward.
    board.shift();

    // Generate a new bottom row with one random gap.
    const gap = Math.floor(Math.random() * COLS);

    const newRow = Array.from(
        { length: COLS },
        (_, x) => x === gap ? null : "#777777"
    );

    board.push(newRow);
}

/* Game over */
function endGame() {
    running = false;
    paused = false;
    gameOver = true;

    softDropping = false;
    stopRepeat();

    $("finalScore").textContent = score;

    gameOverScreen.classList.remove("hidden");

    draw();
}

/* Pause and resume */
function togglePause() {
    if (!running || gameOver) return;

    paused = !paused;

    pauseScreen.classList.toggle("hidden", !paused);

    softDropping = false;
    stopRepeat();

    lastTime = performance.now();
}

/* Update status display */
function updateHUD() {
    scoreDisplay.textContent = score;
    linesDisplay.textContent = lines;
    riseDisplay.textContent = piecesUntilRise;
}

/* Original falling speed preserved */
function getDropSpeed() {
    return Math.max(130, 750 - lines * 12);
}

/* Update game physics */
function update(dt) {
    if (!running || paused || gameOver || !current) return;

    const speed = softDropping ? 45 : getDropSpeed();

    dropTimer += dt;

    if (dropTimer >= speed) {
        dropTimer = 0;

        if (!collides(
            current.matrix,
            current.x,
            current.y + 1
        )) {
            current.y++;
            lockTimer = 0;
        }
    }

    // Lock delay when a block touches the stack.
    if (collides(
        current.matrix,
        current.x,
        current.y + 1
    )) {
        lockTimer += dt;

        if (lockTimer >= 350) {
            lockPiece();
        }
    } else {
        lockTimer = 0;
    }
}

/* Draw one block cell */
function drawCell(context, x, y, size, color) {
    context.fillStyle = color;

    context.fillRect(
        x * size + 1,
        y * size + 1,
        size - 2,
        size - 2
    );

    context.fillStyle = "rgba(255,255,255,0.13)";

    context.fillRect(
        x * size + 2,
        y * size + 2,
        size - 4,
        Math.max(2, size * 0.12)
    );

    context.strokeStyle = "rgba(0,0,0,0.35)";
    context.lineWidth = 1;

    context.strokeRect(
        x * size + 1,
        y * size + 1,
        size - 2,
        size - 2
    );
}

/* Draw board and falling block */
function draw() {
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;

    ctx.fillStyle = "#111111";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid
    ctx.strokeStyle = "#252525";
    ctx.lineWidth = 0.6;

    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellW, 0);
        ctx.lineTo(x * cellW, rect.height);
        ctx.stroke();
    }

    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellH);
        ctx.lineTo(rect.width, y * cellH);
        ctx.stroke();
    }

    // Draw locked blocks and rising floor
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x]) {
                drawCell(
                    ctx,
                    x * cellW / cellW,
                    y * cellH / cellH,
                    1,
                    board[y][x]
                );

                // Use actual board-cell dimensions.
                ctx.fillStyle = board[y][x];

                ctx.fillRect(
                    x * cellW + 1,
                    y * cellH + 1,
                    cellW - 2,
                    cellH - 2
                );

                ctx.strokeStyle = "rgba(0,0,0,0.4)";
                ctx.strokeRect(
                    x * cellW + 1,
                    y * cellH + 1,
                    cellW - 2,
                    cellH - 2
                );
            }
        }
    }

    // Draw active falling block
    if (current) {
        for (let y = 0; y < current.matrix.length; y++) {
            for (let x = 0; x < current.matrix[y].length; x++) {
                if (!current.matrix[y][x]) continue;

                const bx = current.x + x;
                const by = current.y + y;

                if (by < 0) continue;

                ctx.fillStyle = current.color;

                ctx.fillRect(
                    bx * cellW + 1,
                    by * cellH + 1,
                    cellW - 2,
                    cellH - 2
                );

                ctx.fillStyle = "rgba(255,255,255,0.16)";

                ctx.fillRect(
                    bx * cellW + 2,
                    by * cellH + 2,
                    cellW - 4,
                    Math.max(2, cellH * 0.12)
                );

                ctx.strokeStyle = "rgba(0,0,0,0.4)";

                ctx.strokeRect(
                    bx * cellW + 1,
                    by * cellH + 1,
                    cellW - 2,
                    cellH - 2
                );
            }
        }
    }
}

/* Draw next block preview */
function drawNext() {
    const rect = nextCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    nextCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
    nextCanvas.height = Math.max(1, Math.floor(rect.height * dpr));

    nextCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    nextCtx.clearRect(0, 0, rect.width, rect.height);

    if (!nextPiece) return;

    const matrix = nextPiece.matrix;

    const size = Math.min(
        rect.width / (matrix[0].length + 1),
        rect.height / (matrix.length + 1)
    );

    const offsetX = (rect.width - matrix[0].length * size) / 2;
    const offsetY = (rect.height - matrix.length * size) / 2;

    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (!matrix[y][x]) continue;

            nextCtx.fillStyle = nextPiece.color;

            nextCtx.fillRect(
                offsetX + x * size + 1,
                offsetY + y * size + 1,
                size - 2,
                size - 2
            );
        }
    }
}

/* Main animation loop */
function gameLoop(timestamp) {
    const dt = Math.min(timestamp - lastTime, 50);

    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

/* Repeating movement controls */
function stopRepeat() {
    if (repeatTimer) {
        clearInterval(repeatTimer);
        repeatTimer = null;
    }
}

function startRepeat(action) {
    stopRepeat();

    if (!running || paused || gameOver) return;

    action();

    repeatTimer = setInterval(() => {
        if (running && !paused && !gameOver) {
            action();
        }
    }, 115);
}

/* Hold-to-move buttons */
function holdButton(id, action) {
    const button = $(id);

    button.addEventListener("pointerdown", event => {
        event.preventDefault();
        startRepeat(action);
    });

    button.addEventListener("pointerup", stopRepeat);
    button.addEventListener("pointerleave", stopRepeat);
    button.addEventListener("pointercancel", stopRepeat);
}

/* Left and right */
holdButton("leftButton", () => move(-1, 0));
holdButton("rightButton", () => move(1, 0));

/* Soft drop */
$("downButton").addEventListener("pointerdown", event => {
    event.preventDefault();
    softDropping = true;
});

["pointerup", "pointerleave", "pointercancel"].forEach(type => {
    $("downButton").addEventListener(type, () => {
        softDropping = false;
    });
});

/* Action buttons */
$("rotateButton").addEventListener("click", rotate);
$("dropButton").addEventListener("click", hardDrop);

$("pauseButton").addEventListener("click", togglePause);

$("startButton").addEventListener("click", startGame);
$("restartButton").addEventListener("click", startGame);
$("resumeButton").addEventListener("click", togglePause);

/* Keyboard controls */
document.addEventListener("keydown", event => {
    const keys = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "ArrowUp",
        " ",
        "Escape"
    ];

    if (keys.includes(event.key)) {
        event.preventDefault();
    }

    if (event.repeat) return;

    switch (event.key) {
        case "ArrowLeft":
            move(-1, 0);
            break;

        case "ArrowRight":
            move(1, 0);
            break;

        case "ArrowDown":
            softDropping = true;
            break;

        case "ArrowUp":
            rotate();
            break;

        case " ":
            hardDrop();
            break;

        case "Escape":
            togglePause();
            break;
    }
});

document.addEventListener("keyup", event => {
    if (event.key === "ArrowDown") {
        softDropping = false;
    }
});

/* Resize canvas when screen changes */
window.addEventListener("resize", () => {
    draw();
    drawNext();
});

/* Initial screen */
board = emptyBoard();

draw();
drawNext();
updateHUD();

requestAnimationFrame(gameLoop);
