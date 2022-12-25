// TODO: color key
// TODO: defense tiles
// TODO: towers
// TODO: CO d2ds
// TODO: CO powers
// TODO: health?
// TODO: ...luck ranges?
OptionsReader.instance().onOptionsReady((options) => {
    if (!options.options_enable_gameswait_redirect) {
        console.log("Enhanced damage chart disabled.");
        return;
    }
    console.log("Enhanced damage chart enabled.");

    let damageTable = document.querySelector("table#tablehighlight");
    if (!damageTable) {
        console.log("Failed to find damage table.");
        return;
    }

    let thresholds = [
        {min:   0, color: "#f3d9f7"}, // purple
        {min:  10, color: "#ffbabc"}, // red
        {min:  25, color: "#ffcaa8"}, // orange
        {min:  50, color: "#ffe68d"}, // yellow
        {min:  75, color: "#bfe2af"}, // green
        {min: 100, color: "#b0c6ea"}, // blue
    ];
    function updateHighlights() {
        let cells = damageTable.querySelectorAll("td.small");
        for (let cell of cells) {
            let damage = parseFloat(cell.textContent);
            if (isNaN(damage)) {
                continue;
            }

            let maxColor = "";
            for (let threshold of thresholds) {
                if (damage >= threshold.min) {
                    maxColor = threshold.color;
                }
            }

            cell.style.backgroundColor = maxColor;
        }
    }

    function initializeDamage() {
        let cells = damageTable.querySelectorAll("td.small");
        for (let cell of cells) {
            let damage = parseFloat(cell.textContent);
            if (isNaN(damage)) {
                continue;
            }
            cell.setAttribute("base-damage", cell.textContent);
        }
    }

    function updateDamage() {
        let attackInput = document.getElementById("attack-rating");
        let attackRating = parseFloat(attackInput.value);
        let attackCoeff = attackRating / 100;
        let defenseInput = document.getElementById("defense-rating");
        let defenseRating = parseFloat(defenseInput.value);
        let defenseCoeff = (200 - defenseRating) / 100;

        if (isNaN(attackCoeff) || isNaN(defenseCoeff)) {
            // TODO: reportError
            console.log("Got NaN attack or defense:", attackCoeff, defenseCoeff);
            return;
        }

        let cells = damageTable.querySelectorAll("td.small");
        for (let cell of cells) {
            if (!cell.hasAttribute("base-damage")) {
                continue;
            }

            let damage = parseFloat(cell.getAttribute("base-damage"));
            let rawDamage = damage * attackCoeff * defenseCoeff;
            let flooredDamage = Math.floor(rawDamage);
            let fraction = rawDamage - Math.floor(rawDamage);
            let roundedDamage = fraction >= 0.95 ? flooredDamage + 1 : flooredDamage;

            cell.textContent = roundedDamage;
        }

        updateHighlights();
    }

    let kAlphabetical = "alphabetical_order";
    let kBuild = "build_order";
    let currentOrder = kAlphabetical;
    let kBToA = [0, 7, 4, 5, 15, 24, 20, 19, 17, 25, 22, 16, 1, 21, 10, 2, 13, 8, 12, 11, 3, 9, 18, 23, 14, 6];
    let kAToB = [0, 12, 15, 20, 2, 3, 25, 1, 17, 21, 14, 19, 18, 16, 24, 4, 11, 8, 22, 7, 6, 13, 10, 23, 5, 9];
    function arrangeRows(order) {
        let newOrderArray = [];
        if (currentOrder === kAlphabetical && order === kBuild) {
            newOrderArray = kAToB;
        } else if (currentOrder === kBuild && order === kAlphabetical) {
            newOrderArray = kBToA;
        } else {
            return;
        }
        currentOrder = order;

        function arrangeChildren(element, children, orderArray) {
            let newChildren = [];
            for (let oldPos of orderArray) {
                newChildren.push(children[oldPos]);
            }
            for (let child of newChildren) {
                element.removeChild(child);
                element.appendChild(child);
            }
        }

        let body = damageTable.querySelector("tbody");
        let rows = body.querySelectorAll("tr");
        arrangeChildren(body, rows, newOrderArray);
        for (let row of rows) {
            let cells = row.querySelectorAll("td");
            arrangeChildren(row, cells, newOrderArray);
        }
    }

    // TODO: style the number inputs
    function makeControlsNode() {
        const kControlsHtml = `
<div id="damage-controls">
    <label>
        Sort:
    </label>
    <select id="order-select">
        <option>Alphabetical Order</option>
        <option selected>Production Order</option>
    </select>
    <label>
        Attack:
    </label>
    <input id="attack-rating" type="number" value="100" step="10"
           class="awbwenhancements-numeric-input" style="width: 3.5em;" />
    <label>
        Defense:
    </label>
    <input id="defense-rating" type="number" value="100" step="10"
           class="awbwenhancements-numeric-input" style="width: 3.5em;" />
</div>`;
        let tempNode = document.createElement("div");
        tempNode.innerHTML = kControlsHtml;
        return tempNode.children[0];
    }

    function initializeControls() {
        let main = document.getElementById("main");
        main.prepend(makeControlsNode());

        let orderSelect = main.querySelector("#order-select");
        orderSelect.addEventListener("change", (event) => {
            let order = orderSelect.value === "Production Order" ? kBuild : kAlphabetical;
            arrangeRows(order);
        });

        let inputs = document.querySelectorAll("#damage-controls input");
        for (let input of inputs) {
            input.addEventListener("change", (event) => {
                updateDamage();
            });
        }
    }

    initializeDamage();
    initializeControls();
    updateHighlights();
    arrangeRows(kBuild);
});
