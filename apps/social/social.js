
/* =========================================
   ExCenArtInOS - Social Launcher
   Opens each social platform independently
========================================= */

const socialPlatforms = {
    facebook: {
        name: "Facebook",
        url: "https://www.facebook.com/"
    },
    instagram: {
        name: "Instagram",
        url: "https://www.instagram.com/"
    },
    x: {
        name: "X",
        url: "https://x.com/"
    },
    wechat: {
        name: "WeChat",
        url: "https://web.wechat.com/"
    },
    line: {
        name: "LINE",
        url: "https://line.me/"
    },
    telegram: {
        name: "Telegram",
        url: "https://web.telegram.org/"
    },
    reddit: {
        name: "Reddit",
        url: "https://www.reddit.com/"
    },
    pinterest: {
        name: "Pinterest",
        url: "https://www.pinterest.com/"
    },
    snapchat: {
        name: "Snapchat",
        url: "https://web.snapchat.com/"
    }
};

const siteAddress = document.getElementById("siteAddress");
const platformButtons = document.querySelectorAll(".social-icon");

let currentPlatform = "facebook";

/* Open the selected platform */
function openSocialPlatform(platform) {
    const details = socialPlatforms[platform];

    if (!details) return;

    currentPlatform = platform;

    /* Update selected icon */
    platformButtons.forEach(button => {
        const selected = button.dataset.platform === platform;

        button.classList.toggle("active", selected);
        button.setAttribute("aria-pressed", selected);
    });

    /* Update displayed address */
    if (siteAddress) {
        siteAddress.textContent = new URL(details.url).hostname;
    }

    /* Open website in a separate browser tab */
    const openedWindow = window.open(
        details.url,
        "_blank"
    );

    /* Fallback if popup opening is blocked */
    if (!openedWindow) {
        window.location.href = details.url;
    }
}

/* Connect all nine icons */
platformButtons.forEach(button => {
    button.addEventListener("click", () => {
        openSocialPlatform(button.dataset.platform);
    });
});

/* Open the selected site from the external button */
const externalButton = document.getElementById("externalButton");

if (externalButton) {
    externalButton.addEventListener("click", () => {
        openSocialPlatform(currentPlatform);
    });
}

/* Refresh button opens the selected site again */
const refreshButton = document.getElementById("refreshButton");

if (refreshButton) {
    refreshButton.addEventListener("click", () => {
        openSocialPlatform(currentPlatform);
    });
}

/* Fallback button */
const fallbackButton = document.getElementById("openFallbackButton");

if (fallbackButton) {
    fallbackButton.addEventListener("click", () => {
        openSocialPlatform(currentPlatform);
    });
}

/* Default selection */
platformButtons.forEach(button => {
    button.classList.toggle(
        "active",
        button.dataset.platform === currentPlatform
    );
});
