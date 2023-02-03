function makeMoveTile() {
    let tile = document.createElement("span");
    tile.className = "movement-tile awbwenhancements-range-tile";
    return tile;
}

function makeNextDayMoveTile() {
    let tile = document.createElement("span");
    tile.className = "awbwenhancements-next-day-movement-tile awbwenhancements-range-tile";
    return tile;
}

function makeIntersectMoveTile() {
    let tile = document.createElement("span");
    tile.className = "awbwenhancements-intersect-movement-tile awbwenhancements-range-tile";
    return tile;
}

function makeAttackTile() {
    let tile = document.createElement("span");
    tile.className = "range-square check-range-square awbwenhancements-range-tile";
    return tile;
}

function setIntersect(lhs, rhs) {
    let res = {lhs: [], intersect: [], rhs: []};
    for (let id in lhs) {
        if (!(id in rhs)) {
            res.lhs[id] = lhs[id];
        } else {
            res.intersect[id] = lhs[id];
        }
    }
    for (let id in rhs) {
        if (!(id in lhs)) {
            res.rhs[id] = rhs[id];
        }
    }
    return res;
}

function coordsEqual(lhs, rhs) {
    return lhs.x === rhs.x && lhs.y === rhs.y;
}

function coordsToPositions(coords) {
    return Object.fromEntries(coords.map((coord) => [coord.x + "," + coord.y, coord]));
}

function getNeighbors(coord) {
    let neighborCoords = [
        {x: coord.x, y: coord.y - 1},
        {x: coord.x + 1, y: coord.y},
        {x: coord.x, y: coord.y + 1},
        {x: coord.x - 1, y: coord.y},
    ];

    return coordsToPositions(neighborCoords);
}

function getIndirectAttackRange(coords, minRange, maxRange) {
    let positions = {};
    for (let xOffset = -maxRange; xOffset <= maxRange; xOffset++) {
        for (let yOffset = -maxRange; yOffset <= maxRange; yOffset++) {
            let totalOffset = Math.abs(xOffset) + Math.abs(yOffset);
            if (minRange <= totalOffset && totalOffset <= maxRange) {
                let position = {
                    x: coords.x + xOffset,
                    y: coords.y + yOffset,
                };
                let positionId = position.x + "," + position.y;
                positions[positionId] = position;
            }
        }
    }
    return positions;
}

class MoveRangePreview {
    constructor(gamemap, terrainInfo, players) {
        this.gamemap = gamemap;
        this.terrainInfo = terrainInfo;
        this.maxX = maxMajorDimension(terrainInfo);
        this.maxY = maxMinorDimension(terrainInfo);

        this.playersByCountry = toDict(players, (player) => player.countries_code);

        this.units = [];
        this.unitsByCoords = {};

        this.cursorData = {coords: {x: 0, y: 0}};
        this.selectedUnit = undefined;
        this.isMovingUnit = false;
        this.needsUpdate = false;
        this.rangeTiles = [];

        gamemap.addEventListener("click", this.onClick.bind(this));
        let menu = document.getElementById("options-menu");
        menu.addEventListener("click", this.onClick.bind(this));
    }

    setCursorData(cursorData) {
        this.cursorData = cursorData;
        // Skip requiring an update if we have a selected unit, since the unit takes priority.
        // TODO: this doesn't work with lookahead range calculation, remove or refine conditional?
        if (!this.hasSelectedUnit()) {
            this.needsUpdate = true;
        }
    }

    setSelectedUnit(selectedUnit) {
        this.selectedUnit = selectedUnit;
        this.isMovingUnit = false;
        this.needsUpdate = true;
    }

    setIsMovingUnit() {
        this.isMovingUnit = true;
        this.needsUpdate = true;
    }

    clearSelectedUnit() {
        // TODO: consider skipping setting the update flag if we're already undefined
        this.selectedUnit = undefined;
        this.isMovingUnit = false;
        this.needsUpdate = true;
    }

    hasSelectedUnit() {
        return this.selectedUnit !== undefined;
    }

    onMapUpdate(mapEntities) {
        this.weather = mapEntities.weather;
        this.units = mapEntities.units;
        let unitsByCoords = {};
        for (let unit of mapEntities.units) {
            if (unitsByCoords[unit.coords.x] === undefined) {
                unitsByCoords[unit.coords.x] = [];
            }
            unitsByCoords[unit.coords.x][unit.coords.y] = unit;
        }
        this.unitsByCoords = unitsByCoords;
    }

    isInBounds(coord) {
        return coord.x >= 0 && coord.x < this.maxX
            && coord.y >= 0 && coord.y < this.maxY;
    }

    getUnitAt(coord) {
        return (this.unitsByCoords[coord.x] || {})[coord.y];
    }

    getTerrainAt(coord) {
        let terrainInfo = (this.terrainInfo[coord.x] || {})[coord.y];
        if (terrainInfo === undefined) {
            reportError("Missing terrain info at", coord, "(", this.terrainInfo, ")");
            return "properties";
        }
        let terrains = kTerrainById[terrainInfo.terrain_id];
        if (terrains === undefined || terrains.length < 1) {
            reportError("Failed to lookup terrain id:", terrainInfo.terrain_id);
            return "properties";
        } else if (terrains.length > 1) {
            reportError("Found more than one terrain with id:", terrainInfo.terrain_id);
        }
        return terrains[0];
    }

    isDamageCalculatorSelecting() {
        let selectAttacker = document.querySelector("#calculator .select-attacker");
        let selectDefender = document.querySelector("#calculator .select-defender");

        let selectingAttacker = selectAttacker?.style?.getPropertyValue("color") === "black";
        let selectingDefender = selectDefender?.style?.getPropertyValue("color") === "black";
        return selectingAttacker || selectingDefender;
    }

    onClick(event) {
        if (event.target.id === "move") {
            console.log("clicked move:", event);
            this.setIsMovingUnit();
        } else if (event.target.parentNode && event.target.parentNode.id.indexOf("unit_") !== -1) {
            // Ignore unit clicks that are for populating the damage calculator
            if (this.isDamageCalculatorSelecting()) {
                console.log("ignoring click because damage calculator is selecting");
                return;
            }
            console.log("clicked unit:", event);

            // TODO: remove range tiles check?
            if (this.rangeTiles.length > 0 && this.hasSelectedUnit()) {
                this.clearSelectedUnit();
            } else {
                let unitSpan = event.target.parentNode;
                this.setSelectedUnit(this.getUnitWithSpan(unitSpan));
            }
        } else {
            console.log("clicked something else:", event);
            this.clearSelectedUnit();
        }

        this.updateIfNeeded();
    }

    onCursorUpdate(cursorData) {
        this.setCursorData(cursorData);
        this.updateIfNeeded();
    }

    getUnitWithSpan(span) {
        for (let unit of this.units) {
            if (unit.element === span) {
                return unit;
            }
        }
        reportError("Failed to find unit with span:", span);
        return this.units[0];
    }

    updateIfNeeded() {
        if (!this.needsUpdate) {
            return;
        }

        // Moving a unit takes precedence over range hotkeys
        if (this.selectedUnit !== undefined) {
            this.clearMoveRange();
            if (this.cursorData.isQuickAttackRange) {
                this.showMoveAndAttackRangeFor(this.selectedUnit);
            } else {
                this.showMoveRangeFor(this.selectedUnit, this.cursorData.isQuickMoveRange);
            }
            return;
        }

        // Otherwise, check if we need to display quick preview at the cursor
        this.clearMoveRange();
        let infoUnit = this.cursorData.infoMode ? this.getUnitAt(this.cursorData.coords) : undefined;
        if (infoUnit) {
            if (this.cursorData.isQuickMoveRange) {
                this.showMoveRangeFor(infoUnit);
            } else if (this.cursorData.isQuickAttackRange) {
                this.showAttackRangeFor(infoUnit);
            }
        }
    }

    showMoveRangeFor(unit, showNextDayRange) {
        let positions = this.getPositionsInMoveRange(unit);

        let fullNextDay = !this.isMovingUnit || coordsEqual(this.cursorData.coords, unit.coords);
        let nextDayStart = fullNextDay ? positions : coordsToPositions([this.cursorData.coords]);
        let nextDayPositions = showNextDayRange ? this.getPositionsInMoveRange(unit, nextDayStart) : {};
        this.displayMoveRangeTiles(positions, nextDayPositions);
    }

    showAttackRangeFor(unit) {
        this.displayAttackRangeTiles(this.getPositionsInAttackRange(unit));
    }

    showMoveAndAttackRangeFor(unit) {
        let positions = this.getPositionsInMoveRange(unit);
        let attackPositions = this.getPositionsInAttackRange(unit, this.cursorData.coords);
        this.displayMoveAndAttackRangeTiles(positions, attackPositions);
    }

    getPositionsInMoveRange(unit, startingPositions) {
        if (startingPositions === undefined) {
            startingPositions = coordsToPositions([unit.coords]);
        }

        let unitData = kUnitsByName[unit.unit];
        let playerInfo = this.playersByCountry[unit.country.code];
        let moveCostMatrix = lookupMoveCostMatrix(this.weather, playerInfo);
        let startingMove = lookupUnitMoveForCo(unitData, playerInfo);

        let positions = {};
        let visited = {};
        let queue = [];
        for (let positionId in startingPositions) {
            let position = startingPositions[positionId];
            positions[positionId] = position;
            visited[positionId] = startingMove;
            queue.push({coord: position, remainingMove: startingMove});
        }
        let nextQueue = [];
        while (queue.length > 0) {
            for (let {coord, remainingMove} of queue) {
                let neighbors = getNeighbors(coord);
                for (let neighborId in neighbors) {
                    let neighbor = neighbors[neighborId];
                    if (!this.isInBounds(neighbor)) {
                        continue;
                    }

                    if (visited[neighborId] >= remainingMove) {
                        continue;
                    }
                    visited[neighborId] = remainingMove;

                    let unitAt = this.getUnitAt(neighbor);
                    if (unitAt) {
                        let unitAtPlayerInfo = this.playersByCountry[unitAt.country.code];
                        if (playerInfo.players_team !== unitAtPlayerInfo.players_team) {
                            continue;
                        }
                    }
                    let terrain = this.getTerrainAt(neighbor);
                    let terrainCost = moveCostMatrix[terrain][unitData.move_type];
                    if (terrainCost === 0 || terrainCost > remainingMove) {
                        continue;
                    }

                    let newRemainingMove = remainingMove - terrainCost;
                    positions[neighborId] = neighbor;
                    nextQueue.push({coord: neighbor, remainingMove: newRemainingMove});
                }
            }
            queue = nextQueue;
            nextQueue = [];
        }

        return positions;
    }

    getPositionsInAttackRange(unit, coords) {
        let unitData = kUnitsByName[unit.unit];
        let playerInfo = this.playersByCountry[unit.country.code];
        let [minRange, maxRange] = lookupUnitAttackRangeForCo(unitData, playerInfo);

        let unitCoords = coords !== undefined ? coords : unit.coords;

        if (minRange > 1) {
            return getIndirectAttackRange(unitCoords, minRange, maxRange);
        } else if (minRange === 0) {
            return {};
        }

        let attackPositions = {};
        let visited = {};
        let movePositions = this.getPositionsInMoveRange(unit, coordsToPositions([unitCoords]));
        for (let positionId in movePositions) {
            let position = movePositions[positionId];

            // TODO: should it show attacks from occupied squares?
            // TODO: should it show attacks onto units that it can't damage?
            let neighbors = getNeighbors(position);
            for (let neighborId in neighbors) {
                if (neighborId in visited) {
                    continue;
                }
                let neighbor = neighbors[neighborId];

                visited[neighborId] = true;
                attackPositions[neighborId] = neighbor;
            }
        }
        return attackPositions;
    }

    // TODO: add special highlighting for the position we started from
    displayMoveRangeTiles(positions, nextDayPositions) {
        let {lhs, intersect, rhs} = setIntersect(positions, nextDayPositions);
        this.displayRangeTiles([
            {positions: lhs, tileFactory: makeMoveTile},
            {positions: intersect, tileFactory: makeIntersectMoveTile},
            {positions: rhs, tileFactory: makeNextDayMoveTile},
        ]);
    }

    displayAttackRangeTiles(positions) {
        this.displayRangeTiles([{positions, tileFactory: makeAttackTile}]);
    }

    displayMoveAndAttackRangeTiles(positions, attackPositions) {
        let {lhs, intersect, rhs} = setIntersect(positions, attackPositions );
        this.displayRangeTiles([
            {positions: lhs, tileFactory: makeMoveTile},
            {positions: intersect, tileFactory: makeIntersectMoveTile},
            {positions: rhs, tileFactory: makeAttackTile},
        ]);
    }

    displayRangeTiles(displaySets) {
        for (let displaySet of displaySets) {
            let {positions, tileFactory} = displaySet;
            for (let positionId in positions) {
                let position = positions[positionId];
                if (!this.isInBounds(position)) {
                    continue;
                }

                let tile = tileFactory();
                this.rangeTiles.push(tile);

                let neighbors = getNeighbors(position);
                let borderWidths = [];
                for (let direction in neighbors) {
                    let neighbor = neighbors[direction];
                    let neighborId = neighbor.x + "," + neighbor.y;
                    if (!(neighborId in positions) && this.isInBounds(neighbor)) {
                        borderWidths.push("1px");
                    } else {
                        borderWidths.push("0px");
                    }
                }
                tile.style.setProperty("border-width", borderWidths.join(" "));

                let leftOffset = position.x * 16;
                let topOffset = position.y * 16;
                tile.style.setProperty("left", leftOffset + "px");
                tile.style.setProperty("top", topOffset + "px");
                this.gamemap.appendChild(tile);
            }
        }
    }

    clearMoveRange() {
        for (let rangeTile of this.rangeTiles) {
            rangeTile.remove();
        }
        this.rangeTiles = [];
    }
}
