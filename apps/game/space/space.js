
/* =========================================
   SPACE COMBAT - COMPLETE GAME
   Updated boss combat and return transition

   Boss:
   1. Twin cannon mode
   2. Triple straight cannon mode
   3. Five-shot fan mode
   Changes every 3 seconds.

   Boss destruction:
   Explosion -> short delay -> Wave 1 returns.

   Other gameplay:
   - 9 normal ships per wave
   - Health pickup after every 2 waves
   - 15-second asteroid phase
   - Destructible asteroids
   - Enemy formation entrance animation
   - Boss after Wave 9
========================================= */

"use strict";

/* =========================================
   DOM
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const waveValue = $("waveValue");
const scoreValue = $("scoreValue");
const livesValue = $("livesValue");

const messageElement = $("message");
const startScreen = $("startScreen");
const pauseScreen = $("pauseScreen");
const gameOverScreen = $("gameOverScreen");

const startButton = $("startButton");
const pauseButton = $("pauseButton");
const resumeButton = $("resumeButton");
const restartButton = $("restartButton");
const finalScore = $("finalScore");
const fireButton = $("fireButton");

const random = (min, max) => Math.random() * (max - min) + min;
const randomInt = (min, max) => Math.floor(random(min, max + 1));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* =========================================
   CANVAS
========================================= */

let width = 1;
let height = 1;
let pixelRatio = 1;

function playerMinY() {
    return Math.max(0, height * 0.50);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);

    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    if (player) {
        player.x = clamp(
            player.x,
            player.radius + 4,
            width - player.radius - 4
        );

        player.y = clamp(
            player.y,
            playerMinY(),
            height - player.radius - 8
        );
    }

    createStars();
}

window.addEventListener("resize", resizeCanvas);

/* =========================================
   GAME STATE
========================================= */

let running = false;
let paused = false;
let gameOver = false;

let score = 0;
let scoreTimer = 0;
let lives = 3;

let wave = 1;
let bossLevel = 1;
let bossMode = false;

let phase = "wave";
let phaseTimer = 0;

let bossReturnTimer = 0;

let player = null;

let enemies = [];
let bullets = [];
let enemyBullets = [];
let asteroids = [];
let particles = [];
let stars = [];

let boss = null;
let reward = null;
let formation = null;

let enemyVolleyTimer = 0;
let playerFireTimer = 0;
let asteroidSpawnTimer = 0;
let invulnerableTimer = 0;

let waveCompletionPending = false;
let hazardSpawning = false;

let playerFireMode = "double";

const HAZARD_PHASE_SECONDS = 15;
const MAX_WAVE_ENEMIES = 9;
const MAX_ENEMY_SHOOTERS = 3;

const BOSS_MODE_DURATION = 3;

const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false
};

/* =========================================
   CANVAS MESSAGE
========================================= */

function hideMessage() {
    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.classList.remove("visible");
}

/* =========================================
   PLAYER
========================================= */

function createPlayer() {
    player = {
        x: width / 2,
        y: height * 0.82,
        radius: 15,
        speed: 265,
        health: 100,
        maxHealth: 100
    };
}

function updatePlayer(dt) {
    if (!player) return;

    let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);

    if (dx && dy) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.x = clamp(
        player.x,
        player.radius + 4,
        width - player.radius - 4
    );

    player.y = clamp(
        player.y,
        playerMinY(),
        height - player.radius - 8
    );

    if (invulnerableTimer > 0) {
        invulnerableTimer -= dt;
    }

    if (keys.fire) {
        playerFireTimer -= dt;

        if (playerFireTimer <= 0) {
            firePlayerBullets();
            playerFireTimer = 0.19;
        }
    } else {
        playerFireTimer = 0;
    }
}

function firePlayerBullets() {
    if (!player) return;

    if (playerFireMode === "single") {
        bullets.push({
            x: player.x,
            y: player.y - 18,
            vx: 0,
            vy: -560,
            radius: 3,
            damage: 30
        });
    } else {
        bullets.push(
            {
                x: player.x - 7,
                y: player.y - 16,
                vx: 0,
                vy: -560,
                radius: 3,
                damage: 25
            },
            {
                x: player.x + 7,
                y: player.y - 16,
                vx: 0,
                vy: -560,
                radius: 3,
                damage: 25
            }
        );
    }
}

/* =========================================
   BACKGROUND
========================================= */

function createStars() {
    stars = [];

    const count = Math.max(
        45,
        Math.floor(width * height / 6500)
    );

    for (let i = 0; i < count; i++) {
        stars.push({
            x: random(0, width),
            y: random(0, height),
            size: random(0.6, 2),
            speed: random(12, 55),
            alpha: random(0.3, 1)
        });
    }
}

function updateStars(dt) {
    for (const star of stars) {
        star.y += star.speed * dt;

        if (star.y > height) {
            star.y = 0;
            star.x = random(0, width);
        }
    }
}

function drawBackground() {
    ctx.fillStyle = "#080d18";
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "#dceaff";

        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );
    }

    ctx.globalAlpha = 1;
}

/* =========================================
   HUD
========================================= */

function updateHUD() {
    waveValue.textContent = bossMode ? "BOSS" : String(wave);
    scoreValue.textContent = score.toLocaleString();
    livesValue.textContent = String(lives);
}

/* =========================================
   RESET AND START
========================================= */

function clearControls() {
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
}

function resetGame() {
    running = false;
    paused = false;
    gameOver = false;

    score = 0;
    scoreTimer = 0;
    lives = 3;

    wave = 1;
    bossLevel = 1;
    bossMode = false;

    phase = "wave";
    phaseTimer = 0;
    bossReturnTimer = 0;

    enemies = [];
    bullets = [];
    enemyBullets = [];
    asteroids = [];
    particles = [];

    boss = null;
    reward = null;
    formation = null;

    enemyVolleyTimer = 1;
    playerFireTimer = 0;
    asteroidSpawnTimer = 0;
    invulnerableTimer = 0;

    waveCompletionPending = false;
    hazardSpawning = false;

    playerFireMode = "double";

    clearControls();

    hideMessage();

    createPlayer();
    createStars();
    updateHUD();
}

function startGame() {
    resetGame();

    running = true;
    paused = false;
    gameOver = false;

    startScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");

    pauseButton.textContent = "Ⅱ";

    startNormalWave(false);
}

function togglePause() {
    if (!running || gameOver) return;

    paused = !paused;

    pauseScreen.classList.toggle("hidden", !paused);
    pauseButton.textContent = paused ? "▶" : "Ⅱ";

    if (paused) clearControls();
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
resumeButton.addEventListener("click", togglePause);

/* =========================================
   NORMAL WAVE CREATION
========================================= */

function startNormalWave(entering = true) {
    bossMode = false;
    boss = null;

    phase = "wave";
    phaseTimer = 0;

    waveCompletionPending = false;
    hazardSpawning = false;

    reward = null;
    asteroids = [];

    bullets = [];
    enemyBullets = [];
    enemies = [];

    formation = {
        direction: Math.random() < 0.5 ? -1 : 1,
        speed: random(42, 78) + Math.min(wave * 2, 20),
        entering
    };

    const columns = 5;

    const spacingX = Math.min(62, width / (columns + 1));
    const spacingY = Math.min(
        43,
        Math.max(32, height * 0.075)
    );

    const totalWidth = (columns - 1) * spacingX;
    const startX = (width - totalWidth) / 2;

    const colors = [
        "#e64d62",
        "#e58c45",
        "#b56de0",
        "#54a9dc",
        "#d5a84d",
        "#53c6a5",
        "#e16dba",
        "#8c9bea",
        "#d76b55"
    ];

    for (let i = 0; i < MAX_WAVE_ENEMIES; i++) {
        const col = i % columns;
        const row = Math.floor(i / columns);

        const x = startX + col * spacingX;
        const targetY = 42 + row * spacingY;

        const hp = 45 + Math.min(wave * 4, 45);
        const type = randomInt(0, 8);
        const maxHealth = hp + (type === 4 ? 20 : 0);

        enemies.push({
            x,
            y: entering
                ? targetY - height * 0.34 - row * 15
                : targetY,

            targetY,

            radius: type === 4 ? 16 : 13,
            health: maxHealth,
            maxHealth,

            type,
            age: random(0, 3),
            color: colors[type],

            mini: false,
            moveDirection: 1,
            entering
        });
    }

    enemyVolleyTimer = 1;

    hideMessage();
    updateHUD();
}

/* =========================================
   ENEMY MOVEMENT AND ENTRANCE
========================================= */

function updateEnemies(dt) {
    if (!enemies.length) return;

    let allEntered = true;

    for (const enemy of enemies) {
        if (!enemy.entering) continue;

        allEntered = false;

        enemy.y += 250 * dt;

        if (enemy.y >= enemy.targetY) {
            enemy.y = enemy.targetY;
            enemy.entering = false;
        }
    }

    if (formation && !formation.entering) {
        let minX = Infinity;
        let maxX = -Infinity;

        for (const enemy of enemies) {
            if (enemy.mini) continue;

            minX = Math.min(minX, enemy.x);
            maxX = Math.max(maxX, enemy.x);
        }

        if (minX !== Infinity) {
            if (
                formation.direction > 0 &&
                maxX >= width - 20
            ) {
                formation.direction = -1;
            } else if (
                formation.direction < 0 &&
                minX <= 20
            ) {
                formation.direction = 1;
            }

            for (const enemy of enemies) {
                if (!enemy.mini && !enemy.entering) {
                    enemy.x += formation.direction * formation.speed * dt;
                }
            }
        }
    }

    for (const enemy of enemies) {
        enemy.age += dt;

        if (enemy.mini) {
            enemy.x += enemy.moveDirection * 45 * dt;

            if (enemy.x < 16 || enemy.x > width - 16) {
                enemy.moveDirection *= -1;
            }

            enemy.y += Math.sin(enemy.age * 2) * 7 * dt;
        } else if (!enemy.entering) {
            if (enemy.type === 1 || enemy.type === 6) {
                enemy.y = enemy.targetY + Math.sin(enemy.age * 2.1) * 7;
            } else if (enemy.type === 3 || enemy.type === 7) {
                enemy.x += Math.sin(enemy.age * 1.7) * 15 * dt;
            } else if (enemy.type === 5) {
                enemy.y = enemy.targetY + Math.sin(enemy.age * 1.5) * 10;
            }
        }
    }

    if (allEntered && formation) {
        formation.entering = false;
    }

    if (!formation?.entering) {
        updateEnemyVolley(dt);
    }
}

/* =========================================
   NORMAL ENEMY FIRING
========================================= */

function updateEnemyVolley(dt) {
    enemyVolleyTimer -= dt;

    if (enemyVolleyTimer > 0) return;

    const eligible = enemies.filter(enemy =>
        enemy.y < height * 0.48 &&
        !enemy.entering
    );

    for (let i = eligible.length - 1; i > 0; i--) {
        const j = randomInt(0, i);

        [eligible[i], eligible[j]] = [
            eligible[j],
            eligible[i]
        ];
    }

    const shooters = eligible.slice(0, MAX_ENEMY_SHOOTERS);

    for (const enemy of shooters) {
        fireEnemyBullet(enemy);
    }

    enemyVolleyTimer = random(0.95, 1.35);
}

function addEnemyShot(x, y, vx, vy, radius = 4, damage = 9) {
    enemyBullets.push({
        x,
        y,
        vx,
        vy,
        radius,
        damage
    });
}

function fireEnemyBullet(enemy) {
    addEnemyShot(
        enemy.x,
        enemy.y + 12,
        0,
        210 + Math.min(wave * 5, 65),
        4,
        9
    );
}

/* =========================================
   ENEMY DESTRUCTION
========================================= */

function destroyEnemy(enemy) {
    const index = enemies.indexOf(enemy);

    if (index === -1) return;

    enemies.splice(index, 1);

    score += 10;

    burst(
        enemy.x,
        enemy.y,
        enemy.color,
        12,
        100
    );

    if (
        !bossMode &&
        phase === "wave" &&
        enemies.length === 0
    ) {
        waveCompletionPending = true;
    }

    updateHUD();
}

/* =========================================
   NORMAL WAVE COMPLETION
========================================= */

function completeNormalWave() {
    if (
        phase !== "wave" ||
        bossMode ||
        enemies.length !== 0
    ) {
        waveCompletionPending = false;
        return;
    }

    waveCompletionPending = false;
    formation = null;

    bullets = [];
    enemyBullets = [];

    if (wave >= 9) {
        startBoss();
        return;
    }

    if (wave % 2 === 0) {
        startHazardPhase();
        return;
    }

    wave++;
    startNormalWave(true);
}

/* =========================================
   HAZARD PHASE
========================================= */

function startHazardPhase() {
    phase = "hazard";
    phaseTimer = 0;

    hazardSpawning = true;
    asteroidSpawnTimer = 0.1;

    bullets = [];
    enemyBullets = [];

    reward = {
        x: random(25, Math.max(26, width - 25)),
        y: -25,
        radius: 15,
        speed: (height + 50) / HAZARD_PHASE_SECONDS
    };

    asteroids = [];

    spawnAsteroid();

    hideMessage();
}

function updateHazardPhase(dt) {
    if (phase !== "hazard" || !player) return;

    phaseTimer += dt;

    if (reward && phaseTimer < HAZARD_PHASE_SECONDS) {
        reward.y += reward.speed * dt;

        if (
            distance(player, reward) <
            player.radius + reward.radius + 4
        ) {
            player.health = player.maxHealth;

            burst(
                reward.x,
                reward.y,
                "#48ff9c",
                22,
                150
            );

            reward = null;
        } else if (reward.y > height + reward.radius) {
            reward = null;
        }
    }

    if (hazardSpawning) {
        asteroidSpawnTimer -= dt;

        if (asteroidSpawnTimer <= 0) {
            spawnAsteroid();
            asteroidSpawnTimer = random(0.38, 0.68);
        }
    }

    updateAsteroidMovement(dt);

    if (phaseTimer >= HAZARD_PHASE_SECONDS) {
        hazardSpawning = false;
        reward = null;

        if (asteroids.length === 0) {
            finishHazardPhase();
        }
    }
}

/* =========================================
   ASTEROIDS
========================================= */

function spawnAsteroid() {
    const radius = random(9, 21);
    const maxHealth = Math.round(radius * 3.2);

    asteroids.push({
        x: random(
            radius,
            Math.max(radius, width - radius)
        ),

        y: -radius - 5,

        vx: random(-28, 28),
        vy: random(115, 195),

        radius,

        health: maxHealth,
        maxHealth,

        rotation: random(0, Math.PI * 2),
        spin: random(-1.5, 1.5),

        damage: radius > 16 ? 25 : 15
    });
}

function updateAsteroidMovement(dt) {
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        asteroid.x += asteroid.vx * dt;
        asteroid.y += asteroid.vy * dt;
        asteroid.rotation += asteroid.spin * dt;

        if (
            player &&
            distance(asteroid, player) <
            asteroid.radius + player.radius - 3
        ) {
            damagePlayer(asteroid.damage);

            burst(
                asteroid.x,
                asteroid.y,
                "#b5a28c",
                12,
                100
            );

            asteroids.splice(i, 1);
            continue;
        }

        if (asteroid.y > height + asteroid.radius + 10) {
            asteroids.splice(i, 1);
        }
    }
}

function destroyAsteroid(asteroid) {
    const index = asteroids.indexOf(asteroid);

    if (index === -1) return;

    asteroids.splice(index, 1);

    score += 5;

    burst(
        asteroid.x,
        asteroid.y,
        "#b5a28c",
        15,
        125
    );

    updateHUD();
}

function finishHazardPhase() {
    if (phase !== "hazard") return;
    if (hazardSpawning || asteroids.length > 0) return;

    reward = null;

    bullets = [];
    enemyBullets = [];

    waveCompletionPending = false;

    wave++;

    startNormalWave(true);
}

/* =========================================
   HEALTH PICKUP DRAWING
========================================= */

function drawReward() {
    if (!reward) return;

    ctx.save();
    ctx.translate(reward.x, reward.y);

    ctx.shadowBlur = 16;
    ctx.shadowColor = "#42ff91";

    ctx.fillStyle = "#25d878";
    ctx.strokeStyle = "#b9ffd5";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, reward.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(-2, -8, 4, 16);
    ctx.fillRect(-8, -2, 16, 4);

    ctx.restore();
}

/* =========================================
   ASTEROID DRAWING
========================================= */

function drawAsteroids() {
    const shape = [
        0.82, 1, 0.73, 0.95, 0.8,
        1, 0.7, 0.9, 0.78
    ];

    for (const asteroid of asteroids) {
        ctx.save();

        ctx.translate(asteroid.x, asteroid.y);
        ctx.rotate(asteroid.rotation);

        ctx.fillStyle = "#626a78";
        ctx.strokeStyle = "#a5acb9";
        ctx.lineWidth = 1.5;

        ctx.beginPath();

        for (let i = 0; i < shape.length; i++) {
            const angle =
                (i / shape.length) * Math.PI * 2;

            const radius = asteroid.radius * shape[i];

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#454b54";

        ctx.beginPath();
        ctx.arc(
            -asteroid.radius * 0.25,
            -asteroid.radius * 0.15,
            asteroid.radius * 0.18,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.beginPath();
        ctx.arc(
            asteroid.radius * 0.3,
            asteroid.radius * 0.25,
            asteroid.radius * 0.12,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();

        drawHealthLine(
            asteroid.x,
            asteroid.y + asteroid.radius + 5,
            asteroid.health,
            asteroid.maxHealth,
            "#ffb347",
            Math.max(22, asteroid.radius * 2.2)
        );
    }
}

/* =========================================
   BOSS CREATION
========================================= */

function startBoss() {
    bossMode = true;
    phase = "boss";

    phaseTimer = 0;
    bossReturnTimer = 0;

    waveCompletionPending = false;
    hazardSpawning = false;

    formation = null;
    reward = null;

    enemies = [];
    bullets = [];
    enemyBullets = [];
    asteroids = [];

    const maxHealth = 1200 + bossLevel * 350;

    boss = {
        x: width / 2,
        y: 95,

        radius: 58,

        health: maxHealth,
        maxHealth,

        speed: 85 + bossLevel * 5,
        direction: 1,

        // Fire pattern state.
        fireMode: 0,
        modeTimer: BOSS_MODE_DURATION,
        fireTimer: 0.65,

        miniTimer: 6
    };

    hideMessage();
    updateHUD();
}

/* =========================================
   BOSS MOVEMENT AND PATTERN CONTROL
========================================= */

function updateBoss(dt) {
    if (!boss) return;

    boss.x += boss.speed * boss.direction * dt;

    const edge = boss.radius + 14;

    if (boss.x >= width - edge) {
        boss.x = width - edge;
        boss.direction = -1;
    } else if (boss.x <= edge) {
        boss.x = edge;
        boss.direction = 1;
    }

    boss.y = 88 + Math.sin(performance.now() / 650) * 12;

    // Switch exactly one active firing pattern every 3 seconds.
    boss.modeTimer -= dt;

    if (boss.modeTimer <= 0) {
        boss.fireMode = (boss.fireMode + 1) % 3;
        boss.modeTimer = BOSS_MODE_DURATION;

        // Short delay before the first shot of the new pattern.
        boss.fireTimer = 0.3;
    }

    boss.fireTimer -= dt;

    if (boss.fireTimer <= 0) {
        fireBossPattern();
        boss.fireTimer = 0.85;
    }

    boss.miniTimer -= dt;

    if (boss.miniTimer <= 0) {
        spawnMiniShips();
        boss.miniTimer = Math.max(
            4,
            7 - bossLevel * 0.25
        );
    }
}

/* =========================================
   BOSS FIRE PATTERNS

   Mode 0: Twin cannons
   Mode 1: Three straight cannons
   Mode 2: Five-shot fan

   Only the current mode fires.
========================================= */

function fireBossPattern() {
    if (!boss) return;

    const y = boss.y + 35;

    if (boss.fireMode === 0) {
        // MODE 1: Twin heavy cannons.
        addEnemyShot(
            boss.x - 24,
            y,
            0,
            255,
            6,
            14
        );

        addEnemyShot(
            boss.x + 24,
            y,
            0,
            255,
            6,
            14
        );

        return;
    }

    if (boss.fireMode === 1) {
        // MODE 2: Three parallel straight shots.
        addEnemyShot(
            boss.x - 35,
            y,
            0,
            270,
            5,
            11
        );

        addEnemyShot(
            boss.x,
            y,
            0,
            285,
            7,
            15
        );

        addEnemyShot(
            boss.x + 35,
            y,
            0,
            270,
            5,
            11
        );

        return;
    }

    if (boss.fireMode === 2) {
        // MODE 3: Five-shot spreading fan.
        const speeds = [-145, -75, 0, 75, 145];

        for (const vx of speeds) {
            addEnemyShot(
                boss.x,
                y,
                vx,
                235,
                5,
                10
            );
        }
    }
}

/* =========================================
   BOSS MINI SHIPS
========================================= */

function spawnMiniShips() {
    if (!boss) return;

    const availableSlots =
        MAX_WAVE_ENEMIES - enemies.length;

    const spawnCount = Math.min(2, availableSlots);

    for (let i = 0; i < spawnCount; i++) {
        const offset = i === 0 ? -30 : 30;
        const hp = 35 + bossLevel * 5;

        enemies.push({
            x: clamp(boss.x + offset, 18, width - 18),
            y: boss.y + 45,
            targetY: boss.y + 45,

            radius: 10,
            health: hp,
            maxHealth: hp,

            type: 1,
            age: 0,
            color: "#d55cff",

            mini: true,
            moveDirection: offset < 0 ? -1 : 1,
            entering: false
        });
    }
}

/* =========================================
   BOSS DESTRUCTION
   Dedicated return state prevents the
   previous boss-completion freeze.
========================================= */

function defeatBoss() {
    if (!boss || phase !== "boss") return;

    const defeatedX = boss.x;
    const defeatedY = boss.y;

    // Large destruction explosion.
    burst(
        defeatedX,
        defeatedY,
        "#ffbd4b",
        75,
        260
    );

    burst(
        defeatedX - 20,
        defeatedY + 8,
        "#ff633f",
        30,
        180
    );

    burst(
        defeatedX + 20,
        defeatedY - 8,
        "#e047ff",
        30,
        180
    );

    score += 1110;

    boss = null;
    bossMode = false;

    enemies = [];
    bullets = [];
    enemyBullets = [];
    asteroids = [];

    reward = null;
    formation = null;

    lives = 3;

    if (player) {
        player.health = 100;
    }

    // Prepare the next normal cycle.
    bossLevel++;
    wave = 1;

    waveCompletionPending = false;
    hazardSpawning = false;

    // Use a dedicated phase rather than the old transition phase.
    phase = "bossReturn";
    bossReturnTimer = 2.5;

    // Brief protection while the next formation enters.
    invulnerableTimer = 2;

    clearControls();

    hideMessage();
    updateHUD();
}

/* =========================================
   PLAYER BULLETS AND COLLISIONS
========================================= */

function updateBullets(dt) {
    // Player bullets.
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (
            bullet.y < -20 ||
            bullet.x < -20 ||
            bullet.x > width + 20
        ) {
            bullets.splice(i, 1);
            continue;
        }

        let hit = false;

        // Asteroid collision.
        if (phase === "hazard") {
            for (const asteroid of [...asteroids]) {
                if (
                    distance(bullet, asteroid) <
                    bullet.radius + asteroid.radius
                ) {
                    asteroid.health -= bullet.damage;

                    bullets.splice(i, 1);
                    hit = true;

                    if (asteroid.health <= 0) {
                        destroyAsteroid(asteroid);
                    }

                    break;
                }
            }
        }

        if (hit) continue;

        // Boss collision.
        if (
            boss &&
            distance(bullet, boss) <
            bullet.radius + boss.radius
        ) {
            boss.health -= bullet.damage;

            bullets.splice(i, 1);

            if (boss && boss.health <= 0) {
                defeatBoss();
            }

            continue;
        }

        // Normal ships and mini ships.
        for (const enemy of [...enemies]) {
            if (
                distance(bullet, enemy) <
                bullet.radius + enemy.radius
            ) {
                enemy.health -= bullet.damage;

                bullets.splice(i, 1);
                hit = true;

                if (enemy.health <= 0) {
                    destroyEnemy(enemy);
                }

                break;
            }
        }

        if (hit) continue;
    }

    // Enemy bullets.
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        bullet.x += bullet.vx * dt;
        bullet.y += bullet.vy * dt;

        if (
            bullet.y > height + 25 ||
            bullet.y < -25 ||
            bullet.x < -25 ||
            bullet.x > width + 25
        ) {
            enemyBullets.splice(i, 1);
            continue;
        }

        if (
            player &&
            distance(bullet, player) <
            bullet.radius + player.radius
        ) {
            damagePlayer(bullet.damage);

            burst(
                bullet.x,
                bullet.y,
                "#ff5b68",
                5,
                70
            );

            enemyBullets.splice(i, 1);
        }
    }
}

/* =========================================
   PLAYER DAMAGE
========================================= */

function damagePlayer(amount) {
    if (
        !player ||
        invulnerableTimer > 0 ||
        gameOver
    ) {
        return;
    }

    player.health -= amount;
    invulnerableTimer = 0.65;

    burst(
        player.x,
        player.y,
        "#ff704d",
        10,
        100
    );

    if (player.health <= 0) {
        lives--;

        if (lives > 0) {
            player.health = 100;
            player.x = width / 2;
            player.y = height * 0.82;

            invulnerableTimer = 2;
        } else {
            player.health = 0;
            endGame();
        }
    }

    updateHUD();
}

function endGame() {
    running = false;
    gameOver = true;

    clearControls();

    finalScore.textContent = score.toLocaleString();
    gameOverScreen.classList.remove("hidden");
}

/* =========================================
   HEALTH LINE
========================================= */

function drawHealthLine(
    x,
    y,
    current,
    maximum,
    color,
    barWidth
) {
    const ratio = maximum > 0
        ? clamp(current / maximum, 0, 1)
        : 0;

    ctx.save();

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";

    ctx.fillRect(
        x - barWidth / 2,
        y,
        barWidth,
        3
    );

    ctx.fillStyle = color;

    ctx.fillRect(
        x - barWidth / 2,
        y,
        barWidth * ratio,
        3
    );

    ctx.restore();
}

/* =========================================
   PLAYER SHIP DRAWING
========================================= */

function drawPlayer() {
    if (!player) return;

    if (
        invulnerableTimer > 0 &&
        Math.floor(performance.now() / 90) % 2 === 0
    ) {
        return;
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = "#ff9b38";

    ctx.beginPath();
    ctx.moveTo(-5, 12);
    ctx.lineTo(
        0,
        27 + Math.sin(performance.now() / 65) * 2
    );
    ctx.lineTo(5, 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#cbd9ed";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(14, 12);
    ctx.lineTo(6, 9);
    ctx.lineTo(0, 14);
    ctx.lineTo(-6, 9);
    ctx.lineTo(-14, 12);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#2e8dd6";

    ctx.beginPath();
    ctx.ellipse(0, -5, 4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c82a9";
    ctx.fillRect(-14, 8, 7, 4);
    ctx.fillRect(7, 8, 7, 4);

    ctx.restore();

    drawHealthLine(
        player.x,
        player.y + 31,
        player.health,
        player.maxHealth,
        "#35e889",
        36
    );
}

/* =========================================
   NORMAL ENEMY SHIP DRAWING
========================================= */

function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = "#ffd3dc";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(0, 17);
    ctx.lineTo(15, -8);
    ctx.lineTo(7, -5);
    ctx.lineTo(0, -13);
    ctx.lineTo(-7, -5);
    ctx.lineTo(-15, -8);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffdf9a";
    ctx.fillRect(-3, -4, 6, 6);

    ctx.restore();

    drawHealthLine(
        enemy.x,
        enemy.y + 21,
        enemy.health,
        enemy.maxHealth,
        "#ff465b",
        enemy.mini ? 24 : 30
    );
}

/* =========================================
   BOSS SPACESHIP DRAWING

   Wide armored capital ship:
   - Main central hull
   - Large side wings
   - Armor plating
   - Turret structures
   - Engine sections
   - Central cockpit
========================================= */

function drawBoss() {
    if (!boss) return;

    const pulse = Math.sin(performance.now() / 130) * 2;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Engine glow at rear of ship.
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#42bfff";

    ctx.fillStyle = "#258bc4";

    ctx.fillRect(-39, -32, 15, 23);
    ctx.fillRect(24, -32, 15, 23);

    ctx.fillStyle = "#9ceaff";

    ctx.fillRect(-35, -29, 7, 16);
    ctx.fillRect(28, -29, 7, 16);

    ctx.shadowBlur = 0;

    // Outer wing silhouette.
    ctx.fillStyle = "#303b55";
    ctx.strokeStyle = "#8797b7";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(-21, -32);
    ctx.lineTo(-55, -42);
    ctx.lineTo(-82, -22);
    ctx.lineTo(-73, 5);
    ctx.lineTo(-49, 12);
    ctx.lineTo(-40, 35);

    ctx.lineTo(-18, 43);
    ctx.lineTo(18, 43);

    ctx.lineTo(40, 35);
    ctx.lineTo(49, 12);
    ctx.lineTo(73, 5);
    ctx.lineTo(82, -22);
    ctx.lineTo(55, -42);
    ctx.lineTo(21, -32);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Outer wing armor panels.
    ctx.fillStyle = "#52627e";

    ctx.beginPath();
    ctx.moveTo(-53, -30);
    ctx.lineTo(-74, -18);
    ctx.lineTo(-65, -2);
    ctx.lineTo(-45, -9);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(53, -30);
    ctx.lineTo(74, -18);
    ctx.lineTo(65, -2);
    ctx.lineTo(45, -9);
    ctx.closePath();
    ctx.fill();

    // Wing weapon mounts.
    ctx.fillStyle = "#202b42";
    ctx.strokeStyle = "#9aabc8";
    ctx.lineWidth = 1.5;

    ctx.fillRect(-66, -16, 19, 12);
    ctx.strokeRect(-66, -16, 19, 12);

    ctx.fillRect(47, -16, 19, 12);
    ctx.strokeRect(47, -16, 19, 12);

    // Main armored body.
    ctx.fillStyle = "#63718c";
    ctx.strokeStyle = "#d3deef";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(-28, -37);
    ctx.lineTo(28, -37);
    ctx.lineTo(36, -18);
    ctx.lineTo(32, 12);
    ctx.lineTo(22, 34);
    ctx.lineTo(0, 49);
    ctx.lineTo(-22, 34);
    ctx.lineTo(-32, 12);
    ctx.lineTo(-36, -18);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central hull plating.
    ctx.fillStyle = "#394863";

    ctx.beginPath();
    ctx.moveTo(-22, -26);
    ctx.lineTo(22, -26);
    ctx.lineTo(26, 9);
    ctx.lineTo(0, 39);
    ctx.lineTo(-26, 9);
    ctx.closePath();
    ctx.fill();

    // Armor stripes.
    ctx.strokeStyle = "#9eacc4";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-27, -8);
    ctx.lineTo(-14, 5);
    ctx.lineTo(-20, 19);

    ctx.moveTo(27, -8);
    ctx.lineTo(14, 5);
    ctx.lineTo(20, 19);

    ctx.stroke();

    // Central cockpit.
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff5d80";

    ctx.fillStyle = "#ff5578";
    ctx.strokeStyle = "#ffc4d1";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(
        0,
        -9,
        12,
        17,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#ffe5ee";

    ctx.beginPath();
    ctx.ellipse(
        0,
        -12,
        5,
        9,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Side cannons.
    ctx.fillStyle = "#202a3d";
    ctx.strokeStyle = "#b8c7df";
    ctx.lineWidth = 1.5;

    ctx.fillRect(-40, 8, 13, 18);
    ctx.strokeRect(-40, 8, 13, 18);

    ctx.fillRect(27, 8, 13, 18);
    ctx.strokeRect(27, 8, 13, 18);

    // Main front cannons.
    ctx.fillStyle = "#a8b8d0";

    ctx.fillRect(-25, 27, 8, 12);
    ctx.fillRect(17, 27, 8, 12);

    // Central forward weapon.
    ctx.fillStyle = "#ffbb55";

    ctx.fillRect(-3, 32, 6, 12 + pulse);

    // Small glowing wing lights.
    ctx.fillStyle = "#5de9ff";

    ctx.fillRect(-72, -8, 5, 5);
    ctx.fillRect(67, -8, 5, 5);

    ctx.fillStyle = "#ff5a70";

    ctx.fillRect(-51, 23, 5, 5);
    ctx.fillRect(46, 23, 5, 5);

    ctx.restore();

    // Boss health bar.
    drawHealthLine(
        boss.x,
        boss.y + 59,
        boss.health,
        boss.maxHealth,
        "#ff465b",
        145
    );
}

/* =========================================
   BULLET DRAWING
========================================= */

function drawBullets() {
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#4bdfff";
    ctx.fillStyle = "#65e9ff";

    for (const bullet of bullets) {
        ctx.beginPath();
        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.shadowColor = "#ff5265";
    ctx.fillStyle = "#ff5265";

    for (const bullet of enemyBullets) {
        ctx.beginPath();
        ctx.arc(
            bullet.x,
            bullet.y,
            bullet.radius,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

/* =========================================
   PARTICLES
========================================= */

function burst(
    x,
    y,
    color,
    count = 10,
    speed = 100
) {
    for (let i = 0; i < count; i++) {
        const angle = random(0, Math.PI * 2);
        const velocity = random(speed * 0.3, speed);

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: random(0.25, 0.7),
            maxLife: 0.7,
            size: random(1, 3),
            color
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = clamp(
            p.life / p.maxLife,
            0,
            1
        );

        ctx.fillStyle = p.color;

        ctx.beginPath();
        ctx.arc(
            p.x,
            p.y,
            p.size,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

/* =========================================
   SCORE
========================================= */

function updateScore(dt) {
    scoreTimer += dt;

    while (scoreTimer >= 1) {
        score += 10;
        scoreTimer -= 1;
    }
}

/* =========================================
   MAIN UPDATE
========================================= */

function update(dt) {
    if (!running || paused || gameOver) return;

    updateStars(dt);
    updateParticles(dt);
    updateScore(dt);

    // Dedicated boss return sequence.
    if (phase === "bossReturn") {
        bossReturnTimer -= dt;

        if (bossReturnTimer <= 0) {
            // Begin the next normal wave cycle.
            startNormalWave(true);
        }

        updateHUD();
        return;
    }

    updatePlayer(dt);

    if (phase === "wave") {
        updateEnemies(dt);

        if (enemies.length === 0) {
            waveCompletionPending = true;
        }
    }

    if (phase === "hazard") {
        updateHazardPhase(dt);
    }

    if (phase === "boss") {
        updateBoss(dt);
        updateEnemies(dt);
    }

    // Collision processing finishes before transitions.
    updateBullets(dt);

    if (
        waveCompletionPending &&
        phase === "wave" &&
        !bossMode &&
        enemies.length === 0
    ) {
        completeNormalWave();
    }

    updateHUD();
}

/* =========================================
   MAIN DRAW
========================================= */

function draw() {
    drawBackground();
    drawParticles();
    drawBullets();

    drawAsteroids();
    drawReward();

    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    drawBoss();
    drawPlayer();
}

/* =========================================
   GAME LOOP
========================================= */

let lastTime = 0;

function gameLoop(timestamp) {
    const dt = lastTime
        ? Math.min((timestamp - lastTime) / 1000, 0.035)
        : 0;

    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

/* =========================================
   KEYBOARD CONTROLS
========================================= */

window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();

    if (
        [
            "arrowup",
            "arrowdown",
            "arrowleft",
            "arrowright",
            " "
        ].includes(key)
    ) {
        event.preventDefault();
    }

    if (key === "arrowup" || key === "w") keys.up = true;
    if (key === "arrowdown" || key === "s") keys.down = true;
    if (key === "arrowleft" || key === "a") keys.left = true;
    if (key === "arrowright" || key === "d") keys.right = true;

    if (key === " " || key === "enter") keys.fire = true;

    if (key === "1") playerFireMode = "single";
    if (key === "2") playerFireMode = "double";

    if (
        (key === "escape" || key === "p") &&
        !event.repeat
    ) {
        togglePause();
    }
});

window.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") keys.up = false;
    if (key === "arrowdown" || key === "s") keys.down = false;
    if (key === "arrowleft" || key === "a") keys.left = false;
    if (key === "arrowright" || key === "d") keys.right = false;

    if (key === " " || key === "enter") keys.fire = false;
});

window.addEventListener("blur", clearControls);

/* =========================================
   MOBILE MOVEMENT CONTROLS
========================================= */

document.querySelectorAll("[data-direction]").forEach(button => {
    const direction = button.dataset.direction;

    button.addEventListener("pointerdown", event => {
        event.preventDefault();

        keys[direction] = true;

        if (button.setPointerCapture) {
            button.setPointerCapture(event.pointerId);
        }
    });

    const release = event => {
        event.preventDefault();
        keys[direction] = false;
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);

    button.addEventListener("lostpointercapture", () => {
        keys[direction] = false;
    });
});

/* =========================================
   MOBILE FIRE CONTROL
========================================= */

fireButton.addEventListener("pointerdown", event => {
    event.preventDefault();

    keys.fire = true;

    if (fireButton.setPointerCapture) {
        fireButton.setPointerCapture(event.pointerId);
    }
});

function releaseFire(event) {
    event.preventDefault();
    keys.fire = false;
}

fireButton.addEventListener("pointerup", releaseFire);
fireButton.addEventListener("pointercancel", releaseFire);

fireButton.addEventListener("lostpointercapture", () => {
    keys.fire = false;
});

/* =========================================
   INITIALIZE
========================================= */

resizeCanvas();
createStars();
updateHUD();
hideMessage();
draw();

requestAnimationFrame(gameLoop);
