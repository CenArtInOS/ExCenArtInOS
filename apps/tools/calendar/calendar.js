
// =========================================
// EXCENARTINOS CALENDAR
// Gregorian calendar: Year 1–3000
// Month navigation, date selection and today
// =========================================

const monthInput = document.getElementById("month");
const yearInput = document.getElementById("year");
const calendarGrid = document.getElementById("calendar");

const previousButton = document.getElementById("previousMonth");
const nextButton = document.getElementById("nextMonth");
const todayButton = document.getElementById("todayButton");
const clearButton = document.getElementById("clearSelection");

const calendarInfo = document.getElementById("calendarInfo");
const selectedDateDisplay = document.getElementById("selectedDate");
const calendarMessage = document.getElementById("calendarMessage");

const MONTH_NAMES = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
];

const WEEKDAYS = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday"
];

const MIN_YEAR = 1;
const MAX_YEAR = 3000;

// -----------------------------------------
// Current local date
// -----------------------------------------

const now = new Date();

const today = {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate()
};

// Currently displayed month
let currentMonth = today.month;
let currentYear = today.year;

// Selected date
let selectedDate = null;

// -----------------------------------------
// Leap year calculation
// Gregorian calendar rules
// -----------------------------------------

function isLeapYear(year) {
    return (
        year % 4 === 0 &&
        (year % 100 !== 0 || year % 400 === 0)
    );
}

// -----------------------------------------
// Number of days in a month
// -----------------------------------------

function getDaysInMonth(month, year) {
    const days = [
        31,
        isLeapYear(year) ? 29 : 28,
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ];

    return days[month];
}

// -----------------------------------------
// Weekday calculation
// Sunday = 0, Monday = 1, etc.
//
// setUTCFullYear avoids JavaScript's special
// handling of years 0–99 in Date constructor.
// -----------------------------------------

function getWeekday(year, month, day) {
    const date = new Date(0);

    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month, day);

    return date.getUTCDay();
}

// -----------------------------------------
// Date comparison
// -----------------------------------------

function sameDate(a, b) {
    return (
        a &&
        b &&
        a.year === b.year &&
        a.month === b.month &&
        a.day === b.day
    );
}

// -----------------------------------------
// Format selected date
// -----------------------------------------

function formatDate(date) {
    if (!date) {
        return "Select a date";
    }

    const weekday = getWeekday(
        date.year,
        date.month,
        date.day
    );

    return (
        WEEKDAYS[weekday] +
        ", " +
        MONTH_NAMES[date.month] +
        " " +
        date.day +
        ", " +
        date.year
    );
}

// -----------------------------------------
// Create one calendar day button
// -----------------------------------------

function createDayButton(day, year, month) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "calendar-day";
    button.textContent = day;

    const date = {
        year,
        month,
        day
    };

    // Different month indicator
    if (month !== currentMonth || year !== currentYear) {
        button.classList.add("other-month");
    }

    // Highlight today's date
    if (sameDate(date, today)) {
        button.classList.add("today");
        button.setAttribute("aria-label", formatDate(date) + ", today");
    } else {
        button.setAttribute("aria-label", formatDate(date));
    }

    // Highlight selected date
    if (sameDate(date, selectedDate)) {
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
    } else {
        button.setAttribute("aria-pressed", "false");
    }

    button.addEventListener("click", function() {
        selectDate(date);

        // Clicking a date from another month
        // automatically opens that month.
        if (month !== currentMonth || year !== currentYear) {
            currentMonth = month;
            currentYear = year;
        }

        renderCalendar();
    });

    return button;
}

// -----------------------------------------
// Select a date
// -----------------------------------------

function selectDate(date) {
    selectedDate = {
        year: date.year,
        month: date.month,
        day: date.day
    };

    selectedDateDisplay.textContent = formatDate(selectedDate);

    if (sameDate(selectedDate, today)) {
        calendarMessage.textContent = "This is today's date.";
    } else {
        calendarMessage.textContent = "Date selected successfully.";
    }
}

// -----------------------------------------
// Clear selected date
// -----------------------------------------

function clearSelectedDate() {
    selectedDate = null;

    selectedDateDisplay.textContent = "Select a date";
    calendarMessage.textContent = "Select any date to view it here";

    renderCalendar();
}

// -----------------------------------------
// Generate calendar
// -----------------------------------------

function generateCalendar() {
    const firstWeekday = getWeekday(
        currentYear,
        currentMonth,
        1
    );

    const totalDays = getDaysInMonth(
        currentMonth,
        currentYear
    );

    calendarGrid.replaceChildren();

    // Generate six complete weeks.
    // This keeps the calendar layout stable.
    for (let index = 0; index < 42; index++) {
        const dayOffset = index - firstWeekday + 1;

        let day;
        let month = currentMonth;
        let year = currentYear;

        if (dayOffset < 1) {
            // Previous month's dates
            month--;

            if (month < 0) {
                month = 11;
                year--;
            }

            const previousMonthDays = getDaysInMonth(month, year);

            day = previousMonthDays + dayOffset;

        } else if (dayOffset > totalDays) {
            // Next month's dates
            day = dayOffset - totalDays;

            month++;

            if (month > 11) {
                month = 0;
                year++;
            }

        } else {
            day = dayOffset;
        }

        // Prevent displaying dates outside supported range.
        if (year < MIN_YEAR || year > MAX_YEAR) {
            const emptyCell = document.createElement("div");
            calendarGrid.appendChild(emptyCell);
            continue;
        }

        calendarGrid.appendChild(
            createDayButton(day, year, month)
        );
    }
}

// -----------------------------------------
// Update calendar interface
// -----------------------------------------

function renderCalendar() {
    monthInput.value = currentMonth;
    yearInput.value = currentYear;

    calendarInfo.textContent =
        getDaysInMonth(currentMonth, currentYear) +
        " days";

    generateCalendar();

    previousButton.disabled =
        currentYear === MIN_YEAR && currentMonth === 0;

    nextButton.disabled =
        currentYear === MAX_YEAR && currentMonth === 11;

    previousButton.style.opacity =
        previousButton.disabled ? "0.35" : "1";

    nextButton.style.opacity =
        nextButton.disabled ? "0.35" : "1";
}

// -----------------------------------------
// Previous month
// -----------------------------------------

function goToPreviousMonth() {
    if (currentMonth === 0) {
        if (currentYear <= MIN_YEAR) return;

        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }

    renderCalendar();
}

// -----------------------------------------
// Next month
// -----------------------------------------

function goToNextMonth() {
    if (currentMonth === 11) {
        if (currentYear >= MAX_YEAR) return;

        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }

    renderCalendar();
}

// -----------------------------------------
// Jump to current date
// -----------------------------------------

function goToToday() {
    currentYear = today.year;
    currentMonth = today.month;

    selectDate(today);
    renderCalendar();
}

// -----------------------------------------
// Month selector
// -----------------------------------------

monthInput.addEventListener("change", function() {
    const month = Number(monthInput.value);

    if (
        Number.isInteger(month) &&
        month >= 0 &&
        month <= 11
    ) {
        currentMonth = month;
        renderCalendar();
    }
});

// -----------------------------------------
// Year input validation
// -----------------------------------------

yearInput.addEventListener("change", function() {
    const year = Number(yearInput.value);

    if (
        !Number.isInteger(year) ||
        year < MIN_YEAR ||
        year > MAX_YEAR
    ) {
        calendarMessage.textContent =
            "Enter a year between 1 and 3000.";

        yearInput.value = currentYear;
        return;
    }

    currentYear = year;
    renderCalendar();

    calendarMessage.textContent =
        "Showing calendar for " + currentYear + ".";
});

// -----------------------------------------
// Navigation events
// -----------------------------------------

previousButton.addEventListener(
    "click",
    goToPreviousMonth
);

nextButton.addEventListener(
    "click",
    goToNextMonth
);

todayButton.addEventListener(
    "click",
    goToToday
);

clearButton.addEventListener(
    "click",
    clearSelectedDate
);

// -----------------------------------------
// Initial calendar
// -----------------------------------------

selectDate(today);
renderCalendar();
