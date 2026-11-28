
/* =====================================
   EXCENARTINOS GAME MENU
   Individual game launcher
===================================== */

// Individual game registry
const GAME_REGISTRY = {

    adventure: {
        name: "Adventure Rush",
        path: "apps/game/adventure/adventure.html"
    },

    racing: {
        name: "Car Racing",
        path: "apps/game/racing/racing.html"
    },

    space: {
        name: "Space Combat",
        path: "apps/game/space/space.html"
    },

    snake: {
        name: "Snake",
        path: "apps/game/snake/snake.html"
    },

    block: {
        name: "Block Puzzle",
        path: "apps/game/block/block.html"
    },

    bike: {
        name: "Motorcycle Off-road",
        path: "apps/game/bike/bike.html"
    }

};


// Launch selected game inside the existing homepage workspace
document.querySelectorAll(".game-item").forEach(button => {

    button.addEventListener("click", () => {

        const gameId = button.dataset.game;
        const selectedGame = GAME_REGISTRY[gameId];

        if (!selectedGame) {
            console.error("Unknown game:", gameId);
            return;
        }

        window.parent.postMessage(
            {
                type: "EXOS_OPEN_APP",
                name: selectedGame.name,
                path: selectedGame.path
            },
            window.location.origin
        );

    });

});
