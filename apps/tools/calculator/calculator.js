
// =========================================
// EXCENARTINOS CALCULATOR
// Safe mathematical expression parser
// Keyboard and touch support
// =========================================

const display = document.getElementById("calcDisplay");
const expressionDisplay = document.getElementById("expressionDisplay");
const statusDisplay = document.getElementById("statusDisplay");
const keypad = document.getElementById("calculatorKeypad");
const displayPanel = document.querySelector(".calculator-display");

let expression = "";
let justCalculated = false;
let hasError = false;

const operators = ["+", "-", "*", "/"];

// -----------------------------------------
// Display helpers
// -----------------------------------------

function updateDisplay() {
    display.value = expression || "0";

    expressionDisplay.textContent = expression
        .replace(/\*/g, " × ")
        .replace(/\//g, " ÷ ")
        .replace(/\+/g, " + ")
        .replace(/-/g, " − ");

    displayPanel.classList.toggle("error", hasError);
}

function setStatus(message) {
    statusDisplay.textContent = message;
}

function resetError() {
    hasError = false;
    displayPanel.classList.remove("error");
}

// -----------------------------------------
// Number formatting
// -----------------------------------------

function formatNumber(number) {
    if (!Number.isFinite(number)) {
        return "Error";
    }

    if (Object.is(number, -0)) {
        number = 0;
    }

    // Avoid displaying floating-point precision noise.
    const rounded = Number(number.toPrecision(12));

    if (Math.abs(rounded) >= 1e12 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 1e-9)) {
        return rounded.toExponential(6).replace(/\.?0+e/, "e");
    }

    return String(rounded);
}

// -----------------------------------------
// Safe mathematical expression parser
// Supports:
// + - * /
// Parentheses
// Decimal numbers
// Unary negative numbers
// Postfix percentage
// -----------------------------------------

function evaluateExpression(input) {
    let position = 0;

    function skipSpaces() {
        while (input[position] === " ") {
            position++;
        }
    }

    function parseExpression() {
        let value = parseTerm();

        while (true) {
            skipSpaces();

            const operator = input[position];

            if (operator !== "+" && operator !== "-") {
                break;
            }

            position++;

            const right = parseTerm();

            if (operator === "+") {
                value += right;
            } else {
                value -= right;
            }
        }

        return value;
    }

    function parseTerm() {
        let value = parseUnary();

        while (true) {
            skipSpaces();

            const operator = input[position];

            if (operator !== "*" && operator !== "/") {
                break;
            }

            position++;

            const right = parseUnary();

            if (operator === "*") {
                value *= right;
            } else {
                if (right === 0) {
                    throw new Error("Cannot divide by zero");
                }

                value /= right;
            }
        }

        return value;
    }

    function parseUnary() {
        skipSpaces();

        if (input[position] === "+") {
            position++;
            return parseUnary();
        }

        if (input[position] === "-") {
            position++;
            return -parseUnary();
        }

        return parsePercentage();
    }

    function parsePercentage() {
        let value = parsePrimary();

        while (true) {
            skipSpaces();

            if (input[position] !== "%") {
                break;
            }

            position++;
            value /= 100;
        }

        return value;
    }

    function parsePrimary() {
        skipSpaces();

        if (input[position] === "(") {
            position++;

            const value = parseExpression();

            skipSpaces();

            if (input[position] !== ")") {
                throw new Error("Missing closing bracket");
            }

            position++;

            return value;
        }

        return parseNumber();
    }

    function parseNumber() {
        skipSpaces();

        const start = position;
        let decimalFound = false;
        let digitFound = false;

        while (position < input.length) {
            const character = input[position];

            if (character >= "0" && character <= "9") {
                digitFound = true;
                position++;
                continue;
            }

            if (character === "." && !decimalFound) {
                decimalFound = true;
                position++;
                continue;
            }

            break;
        }

        if (!digitFound) {
            throw new Error("Invalid expression");
        }

        const number = Number(input.slice(start, position));

        if (!Number.isFinite(number)) {
            throw new Error("Invalid number");
        }

        return number;
    }

    if (!input.trim()) {
        throw new Error("Enter a calculation");
    }

    const result = parseExpression();

    skipSpaces();

    if (position < input.length) {
        throw new Error("Invalid expression");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Result is too large");
    }

    return result;
}

// -----------------------------------------
// Input handling
// -----------------------------------------

function appendValue(value) {
    resetError();

    // Start a fresh calculation after equals
    // when entering a new number.
    if (justCalculated && /[0-9.]/.test(value)) {
        expression = "";
    }

    justCalculated = false;

    const lastCharacter = expression.slice(-1);

    // Number input
    if (/^[0-9]$/.test(value)) {
        // Avoid unnecessary leading zeroes.
        if (lastCharacter === "0") {
            const previousCharacter = expression.slice(-2, -1);

            if (
                expression.length === 1 ||
                operators.includes(previousCharacter) ||
                previousCharacter === "("
            ) {
                expression = expression.slice(0, -1) + value;
                updateDisplay();
                setStatus("Ready");
                return;
            }
        }

        // Prevent numbers immediately following a percentage
        // from becoming an invalid expression.
        if (lastCharacter === "%") {
            expression += "*";
        }

        expression += value;
    }

    // Decimal point
    else if (value === ".") {
        if (lastCharacter === "%") {
            expression += "*0.";
        } else if (lastCharacter === ")") {
            expression += "*0.";
        } else {
            const currentNumber = expression.split(/[+\-*/()%]/).pop();

            if (currentNumber.includes(".")) {
                return;
            }

            if (
                expression === "" ||
                operators.includes(lastCharacter) ||
                lastCharacter === "("
            ) {
                expression += "0.";
            } else {
                expression += ".";
            }
        }
    }

    // Mathematical operators
    else if (operators.includes(value)) {
        if (expression === "") {
            if (value === "-") {
                expression = "-";
            } else {
                return;
            }
        } else if (lastCharacter === "(") {
            if (value === "-") {
                expression += "-";
            } else {
                return;
            }
        } else if (operators.includes(lastCharacter)) {
            // Allow a negative number after multiplication/division.
            if (
                value === "-" &&
                (lastCharacter === "*" || lastCharacter === "/")
            ) {
                expression += value;
            } else if (
                expression.length >= 2 &&
                expression.slice(-2, -1) === "*" &&
                lastCharacter === "-"
            ) {
                expression = expression.slice(0, -2) + value;
            } else if (
                expression.length >= 2 &&
                expression.slice(-2, -1) === "/" &&
                lastCharacter === "-"
            ) {
                expression = expression.slice(0, -2) + value;
            } else {
                expression = expression.slice(0, -1) + value;
            }
        } else {
            expression += value;
        }
    }

    // Opening bracket
    else if (value === "(") {
        if (/[0-9.)%]/.test(lastCharacter)) {
            expression += "*";
        }

        expression += "(";
    }

    // Closing bracket
    else if (value === ")") {
        const openCount = (expression.match(/\(/g) || []).length;
        const closeCount = (expression.match(/\)/g) || []).length;

        if (
            openCount > closeCount &&
            expression !== "" &&
            !operators.includes(lastCharacter) &&
            lastCharacter !== "("
        ) {
            expression += ")";
        } else {
            return;
        }
    }

    // Percentage
    else if (value === "%") {
        if (/[0-9)]/.test(lastCharacter)) {
            expression += "%";
        } else {
            return;
        }
    }

    updateDisplay();
    setStatus("Ready");
}

// -----------------------------------------
// Clear all
// -----------------------------------------

function clearDisplay() {
    expression = "";
    justCalculated = false;
    resetError();

    updateDisplay();
    setStatus("Cleared");
}

// -----------------------------------------
// Delete last character
// -----------------------------------------

function deleteLast() {
    if (justCalculated || hasError) {
        clearDisplay();
        return;
    }

    expression = expression.slice(0, -1);

    resetError();
    updateDisplay();
    setStatus("Ready");
}

// -----------------------------------------
// Calculate result
// -----------------------------------------

function calculateResult() {
    if (!expression.trim()) {
        setStatus("Enter a calculation");
        return;
    }

    try {
        const originalExpression = expression;
        const result = evaluateExpression(originalExpression);

        expression = formatNumber(result);
        justCalculated = true;

        resetError();
        updateDisplay();

        expressionDisplay.textContent =
            originalExpression.replace(/\*/g, " × ").replace(/\//g, " ÷ ") + " =";

        setStatus("Calculation complete");

    } catch (error) {
        hasError = true;
        displayPanel.classList.add("error");

        display.value = "Error";
        statusDisplay.textContent = error.message || "Invalid calculation";

        justCalculated = false;
    }
}

// -----------------------------------------
// Keypad touch and click events
// -----------------------------------------

keypad.addEventListener("click", function(event) {
    const button = event.target.closest("button");

    if (!button) return;

    const action = button.dataset.action;
    const value = button.dataset.value;

    if (action === "clear") {
        clearDisplay();
    } else if (action === "delete") {
        deleteLast();
    } else if (action === "calculate") {
        calculateResult();
    } else if (value !== undefined) {
        appendValue(value);
    }
});

// -----------------------------------------
// Physical keyboard support
// -----------------------------------------

document.addEventListener("keydown", function(event) {
    const key = event.key;

    if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        appendValue(key);
    } else if (["+", "-", "*", "/", "(", ")", "%", "."].includes(key)) {
        event.preventDefault();
        appendValue(key);
    } else if (key === "Enter" || key === "=") {
        event.preventDefault();
        calculateResult();
    } else if (key === "Backspace") {
        event.preventDefault();
        deleteLast();
    } else if (key === "Escape" || key === "Delete") {
        event.preventDefault();
        clearDisplay();
    }
});

// -----------------------------------------
// Initial state
// -----------------------------------------

updateDisplay();
setStatus("Ready");
