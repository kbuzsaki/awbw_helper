// TODO: color key
// TODO: defense tiles
// TODO: towers
// TODO: CO d2ds
// TODO: CO powers
// TODO: health?
// TODO: ...luck ranges?
OptionsReader.instance().onOptionsReady((options) => {
    if (!options.options_enable_enhanced_damage_chart) {
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
        function getDamage(baseDamage, attacker, defender, isAir) {
            let attackCoeff = attacker.attack / 100 * attacker.hp / 10;
            let terrainDefense = isAir ? 0 : defender.terrainDefense * defender.hp / 10;
            let defenseCoeff = (200 - (defender.coDefense + terrainDefense)) / 100;

            let rawDamage = baseDamage * attackCoeff * defenseCoeff;
            let flooredDamage = Math.floor(rawDamage);
            let fraction = rawDamage - Math.floor(rawDamage);
            let roundedDamage = fraction >= 0.95 ? flooredDamage + 1 : flooredDamage;
            return roundedDamage;
        }

        let attackInput = document.getElementById("attack-rating");
        let attackHpInput = document.getElementById("attacker-hp");
        let coDefenseInput = document.getElementById("co-defense-rating");
        let defenseHpInput = document.getElementById("defender-hp");
        let terrainDefenseInput = document.getElementById("terrain-defense-rating");

        let attacker = {
            attack: parseFloat(attackInput.value),
            hp: parseFloat(attackHpInput.value),
        };
        let defender = {
            coDefense: parseFloat(coDefenseInput.value),
            hp: parseFloat(defenseHpInput.value),
            terrainDefense: parseFloat(terrainDefenseInput.value),
        };

        // TODO: check for NaN

        let highlight2hkos = false;

        let cells = damageTable.querySelectorAll("td.small");
        for (let cell of cells) {
            if (!cell.hasAttribute("base-damage")) {
                continue;
            }

            let isAir = (cell.id || "").match(/yc(t-copter|b-copter|fighter|bomber|stealth|blackbomb)/);

            let baseDamage = parseFloat(cell.getAttribute("base-damage"));
            let roundedDamage = getDamage(baseDamage, attacker, defender, isAir);

            let hasTwoHitKo = false;
            if (highlight2hkos) {
                let remainingHp = defender.hp * 10 - roundedDamage;
                if (roundedDamage > 0 && remainingHp > roundedDamage) {
                    let newDefender = Object.assign({}, defender);
                    newDefender.hp = Math.ceil(remainingHp / 10);
                    let secondHitDamage = getDamage(baseDamage, attacker, newDefender);
                    if (secondHitDamage >= remainingHp) {
                        console.log("Found 2hko!:", baseDamage);
                        hasTwoHitKo = true;
                    }
                }
            }

            cell.classList.remove("awbwenhancements-two-hit-ko");
            cell.textContent = roundedDamage;
            if (hasTwoHitKo) {
                cell.classList.add("awbwenhancements-two-hit-ko");
            }
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
<div id="damage-controls" style="margin-top: 5px; margin-bottom: 3px">
    <div>
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
        <input id="attack-rating" type="number" value="100" min="0" step="10"
            class="awbwenhancements-numeric-input" style="width: 3.5em;" />
        <label>
            HP:
        </label>
        <input id="attacker-hp" type="number" value="10" min="1" max="10" step="1"
            class="awbwenhancements-numeric-input" style="width: 3em;" />
        <label>
            CO Defense:
        </label>
        <input id="co-defense-rating" type="number" value="100" step="10"
            class="awbwenhancements-numeric-input" style="width: 3.5em;" />
        <label>
            HP:
        </label>
        <input id="defender-hp" type="number" value="10" min="1" max="10" step="1"
            class="awbwenhancements-numeric-input" style="width: 3em;" />
        <label>
            Terrain Defense:
        </label>
        <input id="terrain-defense-rating" type="number" value="0" min="0" step="10" max="100"
            class="awbwenhancements-numeric-input" style="width: 3em;" />
        <div class="info-box" style="margin-left: 5px;">
            ?
            <span class="info-box-text">
            Pink: 0-9   </br>
            Red: 10-24    </br>
            Orange: 25-49 </br>
            Yellow: 50-74 </br>
            Green: 75-99  </br>
            Blue: 100+    </br>
            </span>
        </div>
    </div>
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
