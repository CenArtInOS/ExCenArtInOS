
"use strict";

/* =========================================
   ADVENTURE RUSH
   Endless platform adventure
   Background environment and scoring
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);

const W = 960;
const H = 540;

const overlay = $("overlay");
const overlayTitle = $("overlayTitle");
const overlayText = $("overlayText");
const playButton = $("playButton");
const finalStats = $("finalStats");

const scoreValue = $("scoreValue");
const distanceValue = $("distanceValue");
const coinValue = $("coinValue");

const GRAVITY = 1750;
const JUMP_POWER = 650;
const MOVE_SPEED = 290;
const MAX_LIVES = 3;

const keys = {
    left: false,
    right: false
};

let state = "menu";
let player = null;

let platforms = [];
let spikes = [];
let enemies = [];
let coins = [];
let particles = [];

let cameraX = 0;
let lastTime = 0;

let startX = 100;
let furthestX = 100;

let distance = 0;
let score = 0;
let coinCount = 0;
let lives = MAX_LIVES;
let enemiesDefeated = 0;

let bestDistance = Number(
    localStorage.getItem("adventureBestDistance") || 0
);

let bestScore = Number(
    localStorage.getItem("adventureBestScore") || 0
);

/* =========================================
   CANVAS SIZE
   Preserves the 16:9 game proportions
========================================= */

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

/* =========================================
   HELPERS
========================================= */

function random(min, max) {
    return min + Math.random() * (max - min);
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function chance(value) {
    return Math.random() < value;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function overlaps(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

/* =========================================
   RESET GAME
========================================= */

function resetGame() {
    platforms = [];
    spikes = [];
    enemies = [];
    coins = [];
    particles = [];

    cameraX = 0;

    distance = 0;
    score = 0;
    coinCount = 0;
    lives = MAX_LIVES;
    enemiesDefeated = 0;

    startX = 100;
    furthestX = startX;

    player = {
        x: startX,
        y: 414,
        w: 20,
        h: 30,
        vx: 0,
        vy: 0,
        grounded: false,
        facing: 1,
        invulnerable: 0
    };

    // Starting ground.
    platforms.push({
        x: 0,
        y: 450,
        w: 650,
        h: 120,
        type: "ground"
    });

    // Starting coins.
    addCoinLine(220, 395, 4, 35);

    // Guaranteed first monster.
    enemies.push({
        x: 430,
        y: 425,
        w: 27,
        h: 25,
        minX: 390,
        maxX: 555,
        speed: 85,
        direction: 1,
        alive: true,
        phase: 0
    });

    generateAhead();
    updateHUD();
}

/* =========================================
   DIFFICULTY
========================================= */

function getDifficulty() {
    return clamp(distance / 1800, 0, 1);
}

/* =========================================
   COINS
========================================= */

function addCoinLine(x, y, count, spacing) {
    for (let i = 0; i < count; i++) {
        coins.push({
            x: x + i * spacing,
            y,
            radius: 8,
            collected: false,
            phase: random(0, Math.PI * 2)
        });
    }
}

function generateCoins(platform, d) {
    const start = platform.x + 45;
    const end = platform.x + platform.w - 45;

    if (end <= start) return;

    if (chance(0.85)) {
        const x = random(start, end - 60);
        const count = randomInt(3, 6);

        const height = chance(0.45)
            ? platform.y - random(75, 115)
            : platform.y - random(42, 65);

        addCoinLine(x, height, count, 26);
    }

    if (chance(0.25 + d * 0.2)) {
        addCoinLine(
            random(start, end),
            platform.y - random(110, 145),
            2,
            27
        );
    }
}

/* =========================================
   WORLD GENERATION
========================================= */

function generateAhead() {
    const d = getDifficulty();

    let groundPlatforms = platforms
        .filter(p => p.type === "ground")
        .sort((a, b) => a.x - b.x);

    let last = groundPlatforms[groundPlatforms.length - 1];

    if (!last) return;

    while (last.x + last.w < furthestX + 2600) {
        const gap = random(
            85 + d * 20,
            125 + d * 40
        );

        const width = random(
            280 - d * 50,
            390 - d * 65
        );

        const nextY = clamp(
            last.y + random(-35, 40),
            365,
            455
        );

        const nextX = last.x + last.w + gap;

        // Optional floating stepping platform.
        if (chance(0.4 + d * 0.15)) {
            const stepX = last.x + last.w + gap * 0.4;

            platforms.push({
                x: stepX,
                y: Math.min(last.y, nextY) - random(25, 65),
                w: random(55, 90),
                h: 13,
                type: "floating"
            });
        }

        const next = {
            x: nextX,
            y: nextY,
            w: width,
            h: 120,
            type: "ground"
        };

        platforms.push(next);

        generateCoins(next, d);
        generateObstacles(next, d);

        last = next;
    }
}

/* =========================================
   OBSTACLES AND MONSTERS
========================================= */

function generateObstacles(platform, d) {
    const start = platform.x + 45;
    const end = platform.x + platform.w - 45;

    if (end <= start) return;

    const obstacleChance = 0.52 + d * 0.35;

    if (!chance(obstacleChance)) return;

    const x = random(start, end);

    if (chance(0.5)) {
        // Spikes.
        const width = randomInt(28, 52);

        spikes.push({
            x,
            y: platform.y - 25,
            w: width,
            h: 25
        });

        if (d > 0.25 && chance(0.45)) {
            spikes.push({
                x: x + width + 16,
                y: platform.y - 25,
                w: randomInt(28, 45),
                h: 25
            });
        }
    } else {
        // Monster.
        const width = 27;
        const height = 25;

        enemies.push({
            x,
            y: platform.y - height,
            w: width,
            h: height,
            minX: Math.max(platform.x + 12, x - 55),
            maxX: Math.min(x + random(65, 115), end),
            speed: random(65, 105) + d * 85,
            direction: chance(0.5) ? 1 : -1,
            alive: true,
            phase: random(0, Math.PI * 2)
        });
    }

    // Extra monster at higher difficulty.
    if (d > 0.35 && chance(0.25)) {
        const mx = random(start, end);

        enemies.push({
            x: mx,
            y: platform.y - 27,
            w: 30,
            h: 27,
            minX: Math.max(platform.x + 10, mx - 45),
            maxX: Math.min(mx + 90, end),
            speed: random(85, 125) + d * 75,
            direction: chance(0.5) ? 1 : -1,
            alive: true,
            phase: random(0, Math.PI * 2)
        });
    }
}

/* =========================================
   PLAYER MOVEMENT
========================================= */

function updatePlayer(dt) {
    if (!player) return;

    const oldBottom = player.y + player.h;

    player.vx = 0;

    if (keys.left) {
        player.vx = -MOVE_SPEED;
        player.facing = -1;
    }

    if (keys.right) {
        player.vx = MOVE_SPEED;
        player.facing = 1;
    }

    player.x += player.vx * dt;

    // Prevent backward movement beyond the camera.
    player.x = Math.max(
        startX,
        cameraX + 18,
        player.x
    );

    furthestX = Math.max(furthestX, player.x);

    // Gravity.
    player.vy += GRAVITY * dt;
    player.vy = Math.min(player.vy, 1100);

    player.y += player.vy * dt;
    player.grounded = false;

    // Landing on platforms.
    if (player.vy >= 0) {
        for (const p of platforms) {
            const horizontal =
                player.x + player.w > p.x &&
                player.x < p.x + p.w;

            const newBottom = player.y + player.h;

            if (
                horizontal &&
                oldBottom <= p.y + 7 &&
                newBottom >= p.y
            ) {
                player.y = p.y - player.h;
                player.vy = 0;
                player.grounded = true;
                break;
            }
        }
    }

    // Hit platform from underneath.
    if (player.vy < 0) {
        for (const p of platforms) {
            if (
                player.x + player.w > p.x &&
                player.x < p.x + p.w &&
                player.y < p.y + p.h &&
                player.y + player.h > p.y + p.h - 7
            ) {
                player.y = p.y + p.h;
                player.vy = 0;
                break;
            }
        }
    }

    collectCoins();

    // Spike collisions.
    for (const spike of spikes) {
        const hitbox = {
            x: spike.x + 3,
            y: spike.y + 5,
            w: spike.w - 6,
            h: spike.h - 5
        };

        if (overlaps(player, hitbox)) {
            loseLife();
            return;
        }
    }

    // Monster collisions.
    for (const enemy of enemies) {
        if (!enemy.alive || !overlaps(player, enemy)) continue;

        // Defeat monster by jumping onto it.
        if (player.vy > 40 && oldBottom <= enemy.y + 12) {
            enemy.alive = false;

            player.vy = -JUMP_POWER * 0.62;
            player.grounded = false;

            enemiesDefeated++;

            burst(
                enemy.x + enemy.w / 2,
                enemy.y,
                "#ffbd4a"
            );
        } else if (player.invulnerable <= 0) {
            loseLife();
            return;
        }
    }

    // Falling off the map.
    if (player.y > H + 80) {
        loseLife();
        return;
    }

    updateCamera(dt);

    if (player.invulnerable > 0) {
        player.invulnerable -= dt;
    }

    cleanupWorld();
}

/* =========================================
   LIVES AND RESPAWN
========================================= */

function loseLife() {
    if (state !== "playing" || player.invulnerable > 0) return;

    lives--;

    burst(
        player.x + player.w / 2,
        player.y + player.h / 2,
        "#ff5555"
    );

    updateHUD();

    if (lives <= 0) {
        endGame();
        return;
    }

    // Find a ground platform ahead of the player.
    const safe = platforms
        .filter(p =>
            p.type === "ground" &&
            p.x + p.w > player.x + 20
        )
        .sort((a, b) => a.x - b.x)[0];

    if (safe) {
        player.x = Math.max(
            safe.x + 20,
            cameraX + 30
        );

        player.y = safe.y - player.h;
        player.vy = 0;
        player.grounded = true;
    } else {
        player.x = cameraX + 80;
        player.y = 300;
        player.vy = 0;
        player.grounded = false;
    }

    player.invulnerable = 1.8;

    clearControls();
}

/* =========================================
   COIN COLLECTION
========================================= */

function collectCoins() {
    for (const coin of coins) {
        if (coin.collected) continue;

        const box = {
            x: coin.x - coin.radius,
            y: coin.y - coin.radius,
            w: coin.radius * 2,
            h: coin.radius * 2
        };

        if (overlaps(player, box)) {
            coin.collected = true;
            coinCount++;

            burst(coin.x, coin.y, "#ffd34e");
        }
    }
}

/* =========================================
   CAMERA
========================================= */

function updateCamera(dt) {
    const target = player.x - 420;

    if (target > cameraX) {
        cameraX += Math.min(
            target - cameraX,
            380 * dt
        );
    }

    cameraX = Math.max(0, cameraX);
}

/* =========================================
   CLEANUP
========================================= */

function cleanupWorld() {
    const cutoff = cameraX - 200;

    platforms = platforms.filter(
        p => p.x + p.w > cutoff
    );

    spikes = spikes.filter(
        s => s.x + s.w > cutoff
    );

    enemies = enemies.filter(
        e => e.x + e.w > cutoff
    );

    coins = coins.filter(
        c => !c.collected && c.x > cutoff
    );
}

/* =========================================
   ENEMY MOVEMENT
========================================= */

function updateEnemies(dt) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        enemy.x += enemy.speed * enemy.direction * dt;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }

        if (enemy.x >= enemy.maxX) {
            enemy.x = enemy.maxX;
            enemy.direction = -1;
        }
    }
}

/* =========================================
   PARTICLES
========================================= */

function burst(x, y, color) {
    for (let i = 0; i < 9; i++) {
        particles.push({
            x,
            y,
            vx: random(-120, 120),
            vy: random(-170, 30),
            life: 0.45,
            color
        });
    }
}

function updateParticles(dt) {
    for (const p of particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 480 * dt;
        p.life -= dt;
    }

    particles = particles.filter(p => p.life > 0);
}

/* =========================================
   SCORE AND HUD
========================================= */

function updateHUD() {
    distance = Math.max(
        0,
        Math.floor((furthestX - startX) / 10)
    );

    // Distance + coins + defeated monsters.
    score =
        distance +
        coinCount * 25 +
        enemiesDefeated * 100;

    scoreValue.textContent = score.toLocaleString();
    distanceValue.textContent =
        distance.toLocaleString() + " m";
    coinValue.textContent = coinCount.toLocaleString();

    // Create lives display if it is not in HTML.
    let lifeDisplay = $("lifeValue");

    if (!lifeDisplay) {
        const stats = document.querySelector(".stats");

        if (stats) {
            const span = document.createElement("span");
            span.innerHTML = 'LIVES <b id="lifeValue">3</b>';
            stats.appendChild(span);
            lifeDisplay = $("lifeValue");
        }
    }

    if (lifeDisplay) {
        lifeDisplay.textContent =
            "♥".repeat(lives) +
            "♡".repeat(MAX_LIVES - lives);
    }
}

/* =========================================
   BACKGROUND ENVIRONMENT
========================================= */

function drawBackground() {
    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, H);

    sky.addColorStop(0, "#398fc5");
    sky.addColorStop(0.48, "#82c9e5");
    sky.addColorStop(1, "#d7efcf");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sun glow.
    const sunGlow = ctx.createRadialGradient(
        820, 85, 8,
        820, 85, 105
    );

    sunGlow.addColorStop(0, "rgba(255,245,170,0.55)");
    sunGlow.addColorStop(1, "rgba(255,245,170,0)");

    ctx.fillStyle = sunGlow;
    ctx.fillRect(700, 0, 240, 190);

    // Sun.
    ctx.fillStyle = "#fff0a5";
    ctx.beginPath();
    ctx.arc(820, 85, 32, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountain layers.
    for (let i = 0; i < 12; i++) {
        const x = i * 155 - (cameraX * 0.055 % 155);
        const peakY = 105 + (i % 4) * 28;

        ctx.fillStyle = i % 2
            ? "#759bb0"
            : "#648da5";

        ctx.beginPath();
        ctx.moveTo(x - 100, 330);
        ctx.lineTo(x + 45, peakY);
        ctx.lineTo(x + 185, 330);
        ctx.closePath();
        ctx.fill();

        // Snow caps.
        ctx.fillStyle = "#d9e8e9";

        ctx.beginPath();
        ctx.moveTo(x + 17, peakY + 50);
        ctx.lineTo(x + 45, peakY);
        ctx.lineTo(x + 73, peakY + 50);
        ctx.lineTo(x + 54, peakY + 40);
        ctx.lineTo(x + 45, peakY + 48);
        ctx.lineTo(x + 35, peakY + 38);
        ctx.closePath();
        ctx.fill();
    }

    // Rolling hills.
    for (let i = 0; i < 10; i++) {
        const x = i * 180 - (cameraX * 0.12 % 180);

        ctx.fillStyle = i % 2
            ? "#80b88d"
            : "#70aa7c";

        ctx.beginPath();
        ctx.moveTo(x - 80, 410);
        ctx.quadraticCurveTo(
            x + 30,
            260 + (i % 3) * 25,
            x + 170,
            410
        );
        ctx.closePath();
        ctx.fill();
    }

    // Clouds.
    for (let i = 0; i < 9; i++) {
        const x = (
            i * 175 - cameraX * 0.2 % 1450 + 1450
        ) % 1450;

        const y = 45 + (i % 4) * 42;

        ctx.fillStyle = "rgba(255,255,255,0.83)";

        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.arc(x + 20, y - 8, 23, 0, Math.PI * 2);
        ctx.arc(x + 45, y, 18, 0, Math.PI * 2);
        ctx.fill();
    }

    // Birds.
    const birdTime = performance.now() * 0.00015;

    for (let i = 0; i < 6; i++) {
        const x = (
            i * 190 -
            cameraX * 0.3 +
            birdTime * 100 +
            1300
        ) % 1300;

        const y = 100 + (i % 3) * 45;

        ctx.strokeStyle = "#354f62";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.quadraticCurveTo(x - 3, y - 7, x, y);
        ctx.quadraticCurveTo(x + 5, y - 7, x + 9, y);
        ctx.stroke();
    }

    // Distant trees.
    for (let i = 0; i < 18; i++) {
        const x = (
            i * 105 - cameraX * 0.25 % 1900 + 1900
        ) % 1900;

        const y = 345 + (i % 3) * 13;

        ctx.fillStyle = "#68452e";
        ctx.fillRect(x - 3, y - 25, 7, 30);

        ctx.fillStyle = i % 2
            ? "#397d50"
            : "#4c9858";

        ctx.beginPath();
        ctx.arc(x, y - 32, 16, 0, Math.PI * 2);
        ctx.arc(x - 11, y - 23, 11, 0, Math.PI * 2);
        ctx.arc(x + 11, y - 23, 11, 0, Math.PI * 2);
        ctx.fill();
    }

    // Lower vegetation behind playable platforms.
    for (let i = 0; i < 42; i++) {
        const x = (
            i * 42 - cameraX * 0.45 % 1765 + 1765
        ) % 1765;

        const y = 485 + (i % 4) * 10;

        ctx.fillStyle = i % 2
            ? "#247b3d"
            : "#398f47";

        ctx.beginPath();
        ctx.arc(x, y, 10, Math.PI, Math.PI * 2);
        ctx.fill();

        if (i % 4 === 0) {
            ctx.fillStyle = "#ffe37b";

            ctx.beginPath();
            ctx.arc(x + 4, y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Floating light particles.
    for (let i = 0; i < 25; i++) {
        const x = (
            i * 43 - cameraX * 0.1 % 1100 + 1100
        ) % 1100;

        const y = 175 + (i * 37 % 260);

        ctx.fillStyle = "rgba(255,255,255,0.42)";

        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 2), 0, Math.PI * 2);
        ctx.fill();
    }
}

/* =========================================
   PLATFORMS
========================================= */

function drawPlatforms() {
    for (const p of platforms) {
        const x = p.x - cameraX;

        if (x + p.w < -10 || x > W + 10) continue;

        if (p.type === "floating") {
            ctx.fillStyle = "#70452d";
            ctx.fillRect(x, p.y, p.w, p.h);

            ctx.fillStyle = "#69d45d";
            ctx.fillRect(x, p.y, p.w, 5);
            continue;
        }

        ctx.fillStyle = "#80502f";
        ctx.fillRect(x, p.y, p.w, p.h);

        ctx.fillStyle = "#36a844";
        ctx.fillRect(x, p.y, p.w, 11);

        ctx.fillStyle = "#8ae16e";
        ctx.fillRect(x, p.y, p.w, 3);

        ctx.fillStyle = "rgba(35,17,10,0.25)";

        for (let i = 12; i < p.w; i += 32) {
            ctx.fillRect(x + i, p.y + 27, 12, 4);
            ctx.fillRect(x + i + 9, p.y + 61, 13, 4);
        }
    }
}

/* =========================================
   HIGH-CONTRAST SPIKES
========================================= */

function drawSpikes() {
    for (const spike of spikes) {
        const x = spike.x - cameraX;

        // Dark outer silhouette.
        ctx.fillStyle = "#18212c";

        for (let i = 0; i < spike.w; i += 14) {
            ctx.beginPath();
            ctx.moveTo(x + i - 1, spike.y + spike.h);
            ctx.lineTo(x + i + 7, spike.y - 2);
            ctx.lineTo(x + i + 15, spike.y + spike.h);
            ctx.closePath();
            ctx.fill();
        }

        // Bright red spike faces.
        ctx.fillStyle = "#f23b35";

        for (let i = 0; i < spike.w; i += 14) {
            ctx.beginPath();
            ctx.moveTo(x + i + 2, spike.y + spike.h - 2);
            ctx.lineTo(x + i + 7, spike.y + 5);
            ctx.lineTo(x + i + 12, spike.y + spike.h - 2);
            ctx.closePath();
            ctx.fill();
        }

        ctx.fillStyle = "#ffcf45";
        ctx.fillRect(
            x,
            spike.y + spike.h - 3,
            spike.w,
            3
        );
    }
}

/* =========================================
   COINS
========================================= */

function drawCoins(time) {
    for (const coin of coins) {
        if (coin.collected) continue;

        const x = coin.x - cameraX;
        const y = coin.y + Math.sin(
            time / 240 + coin.phase
        ) * 3;

        if (x < -20 || x > W + 20) continue;

        ctx.fillStyle = "#ffbd24";

        ctx.beginPath();
        ctx.ellipse(
            x, y,
            7, 10,
            0, 0, Math.PI * 2
        );
        ctx.fill();

        ctx.strokeStyle = "#fff6a7";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#fff6c2";
        ctx.fillRect(x - 1, y - 5, 2, 10);
    }
}

/* =========================================
   MONSTERS
========================================= */

function drawEnemies(time) {
    for (const enemy of enemies) {
        if (!enemy.alive) continue;

        const x = enemy.x - cameraX;
        const y = enemy.y + Math.sin(
            time / 130 + enemy.phase
        ) * 2;

        if (x < -40 || x > W + 40) continue;

        // Shadow.
        ctx.fillStyle = "rgba(20,20,30,0.22)";

        ctx.beginPath();
        ctx.ellipse(
            x + enemy.w / 2,
            y + enemy.h + 2,
            enemy.w / 2,
            3,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Body.
        ctx.fillStyle = "#742d9b";
        ctx.beginPath();
        ctx.roundRect(
            x,
            y + 5,
            enemy.w,
            enemy.h - 5,
            7
        );
        ctx.fill();

        // Top highlight.
        ctx.fillStyle = "#d05af2";
        ctx.fillRect(
            x + 4,
            y + 4,
            enemy.w - 8,
            5
        );

        // Eyes.
        ctx.fillStyle = "#fff";
        ctx.fillRect(x + 5, y + 10, 7, 7);
        ctx.fillRect(
            x + enemy.w - 12,
            y + 10,
            7,
            7
        );

        ctx.fillStyle = "#111";
        ctx.fillRect(x + 8, y + 12, 3, 4);
        ctx.fillRect(
            x + enemy.w - 9,
            y + 12,
            3,
            4
        );

        // Mouth.
        ctx.fillStyle = "#28102e";
        ctx.fillRect(
            x + 9,
            y + 21,
            enemy.w - 18,
            3
        );

        // Feet.
        ctx.fillStyle = "#422052";
        ctx.fillRect(
            x + 3,
            y + enemy.h - 3,
            8,
            5
        );

        ctx.fillRect(
            x + enemy.w - 11,
            y + enemy.h - 3,
            8,
            5
        );
    }
}

/* =========================================
   PLAYER
========================================= */

function drawPlayer(time) {
    if (!player) return;

    // Blink during temporary protection.
    if (
        player.invulnerable > 0 &&
        Math.floor(time / 90) % 2 === 0
    ) {
        return;
    }

    const x = player.x - cameraX;
    const y = player.y;

    ctx.save();

    ctx.translate(
        x + player.w / 2,
        y + player.h / 2
    );

    ctx.scale(player.facing, 1);

    const bob = player.grounded
        ? Math.sin(time / 70) * 1
        : 0;

    ctx.translate(0, bob);

    // Backpack.
    ctx.fillStyle = "#25734f";
    ctx.fillRect(-11, -3, 4, 12);

    // Legs.
    ctx.fillStyle = "#273b6b";
    ctx.fillRect(-6, 7, 5, 8);
    ctx.fillRect(2, 7, 5, 8);

    // Boots.
    ctx.fillStyle = "#493026";
    ctx.fillRect(-7, 13, 7, 3);
    ctx.fillRect(2, 13, 7, 3);

    // Body.
    ctx.fillStyle = "#e34f3f";
    ctx.fillRect(-7, -4, 14, 13);

    // Face.
    ctx.fillStyle = "#f2c59c";
    ctx.fillRect(-6, -14, 12, 11);

    // Hair.
    ctx.fillStyle = "#493026";
    ctx.fillRect(-7, -16, 14, 5);

    // Eye.
    ctx.fillStyle = "#18212b";
    ctx.fillRect(3, -10, 2, 3);

    ctx.restore();
}

/* =========================================
   FOREGROUND GRASS
========================================= */

function drawForeground() {
    for (let i = 0; i < 90; i++) {
        const x = (
            i * 24 - cameraX * 0.7 % 2200 + 2200
        ) % 2200;

        const y = 515 + (i % 5) * 5;

        ctx.strokeStyle = i % 2
            ? "#277a3d"
            : "#58a94f";

        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, y + 9);
        ctx.lineTo(x - 3, y);
        ctx.moveTo(x, y + 9);
        ctx.lineTo(x + 4, y + 2);
        ctx.stroke();
    }
}

/* =========================================
   PARTICLES
========================================= */

function drawParticles() {
    for (const p of particles) {
        ctx.globalAlpha = Math.max(0, p.life / 0.45);
        ctx.fillStyle = p.color;

        ctx.fillRect(
            p.x - cameraX,
            p.y,
            4,
            4
        );
    }

    ctx.globalAlpha = 1;
}

/* =========================================
   UPDATE
========================================= */

function update(dt) {
    if (state !== "playing") return;

    updatePlayer(dt);

    if (state !== "playing") return;

    updateEnemies(dt);
    updateParticles(dt);

    generateAhead();
    updateHUD();
}

/* =========================================
   DRAW ALL
========================================= */

function draw(time) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const scale = Math.min(
        canvas.width / W,
        canvas.height / H
    );

    const offsetX = (canvas.width - W * scale) / 2;
    const offsetY = (canvas.height - H * scale) / 2;

    ctx.setTransform(
        scale, 0,
        0, scale,
        offsetX, offsetY
    );

    // Background environment.
    drawBackground();

    // Playable world.
    drawPlatforms();
    drawCoins(time);
    drawSpikes();
    drawEnemies(time);
    drawParticles();
    drawPlayer(time);

    // Decorative foreground.
    drawForeground();
}

/* =========================================
   GAME OVER
========================================= */

function endGame() {
    if (state !== "playing") return;

    state = "gameover";
    clearControls();

    updateHUD();

    bestDistance = Math.max(bestDistance, distance);
    bestScore = Math.max(bestScore, score);

    localStorage.setItem(
        "adventureBestDistance",
        bestDistance
    );

    localStorage.setItem(
        "adventureBestScore",
        bestScore
    );

    overlayTitle.textContent = "Adventure Over!";

    overlayText.textContent =
        "All three lives have been used. Start again and beat your record.";

    $("finalScore").textContent = score.toLocaleString();
    $("finalDistance").textContent =
        distance.toLocaleString() + " m";
    $("finalCoins").textContent =
        coinCount.toLocaleString();
    $("bestDistance").textContent =
        bestDistance.toLocaleString() + " m";

    finalStats.classList.remove("hidden");

    playButton.textContent = "PLAY AGAIN";
    overlay.classList.remove("hidden");
}

/* =========================================
   PAUSE
========================================= */

function pauseGame() {
    if (state === "playing") {
        state = "paused";
        clearControls();

        overlayTitle.textContent = "Game Paused";

        overlayText.textContent =
            "Your adventure is paused. Continue when ready.";

        finalStats.classList.add("hidden");
        playButton.textContent = "RESUME";

        overlay.classList.remove("hidden");

    } else if (state === "paused") {
        state = "playing";
        overlay.classList.add("hidden");
    }
}

/* =========================================
   START / RESTART
========================================= */

function startGame() {
    resetGame();

    state = "playing";

    finalStats.classList.add("hidden");
    overlay.classList.add("hidden");

    playButton.textContent = "START ADVENTURE";
}

playButton.addEventListener("click", () => {
    if (state === "paused") {
        pauseGame();
    } else {
        startGame();
    }
});

$("pauseButton").addEventListener(
    "click",
    pauseGame
);

/* =========================================
   JUMP
========================================= */

function jump() {
    if (state !== "playing" || !player) return;

    if (player.grounded) {
        player.vy = -JUMP_POWER;
        player.grounded = false;
    }
}

/* =========================================
   KEYBOARD CONTROLS
========================================= */

window.addEventListener("keydown", event => {
    if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)
    ) {
        event.preventDefault();
    }

    if (
        event.code === "ArrowLeft" ||
        event.code === "KeyA"
    ) {
        keys.left = true;
    }

    if (
        event.code === "ArrowRight" ||
        event.code === "KeyD"
    ) {
        keys.right = true;
    }

    if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
    ) {
        if (!event.repeat) jump();
    }

    if (event.code === "Escape") {
        pauseGame();
    }
});

window.addEventListener("keyup", event => {
    if (
        event.code === "ArrowLeft" ||
        event.code === "KeyA"
    ) {
        keys.left = false;
    }

    if (
        event.code === "ArrowRight" ||
        event.code === "KeyD"
    ) {
        keys.right = false;
    }
});

/* =========================================
   MOBILE TOUCH CONTROLS
========================================= */

document.querySelectorAll("[data-control]").forEach(button => {
    const control = button.dataset.control;

    button.addEventListener("pointerdown", event => {
        event.preventDefault();

        button.setPointerCapture(event.pointerId);
        button.classList.add("active");

        if (control === "jump") {
            jump();
        } else {
            keys[control] = true;
        }
    });

    function release(event) {
        event.preventDefault();

        button.classList.remove("active");

        if (control !== "jump") {
            keys[control] = false;
        }
    }

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
});

function clearControls() {
    keys.left = false;
    keys.right = false;

    document.querySelectorAll(".control-button").forEach(button => {
        button.classList.remove("active");
    });
}

/* =========================================
   PAUSE WHEN APP IS HIDDEN
========================================= */

document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "playing") {
        pauseGame();
    }
});

/* =========================================
   MAIN GAME LOOP
========================================= */

function gameLoop(time) {
    const dt = Math.min(
        (time - lastTime) / 1000 || 0,
        0.033
    );

    lastTime = time;

    update(dt);
    draw(time);

    requestAnimationFrame(gameLoop);
}

/* =========================================
   INITIALIZE
========================================= */

resetGame();

state = "menu";

overlayTitle.textContent = "Adventure Rush";

overlayText.textContent =
    "Move manually, jump over hazards, defeat monsters and collect coins. You have three lives.";

finalStats.classList.add("hidden");
playButton.textContent = "START ADVENTURE";

requestAnimationFrame(gameLoop);
