const kIsDebugMode = false;

function reportError() {
    console.log.apply(console, arguments);
    if (kIsDebugMode) {
        let errorMessage = "";
        for (let el of Array.from(arguments)) {
            let str = "" + el;
            if (str === "[object Object]") {
                str = JSON.stringify(el);
                if (str.length > 100) {
                    str = str.substring(0, 100) + "...";
                }
            }
            errorMessage += str;
            errorMessage += " ";
        }
        let shouldThrow = confirm("An error occurred: " + errorMessage + ". Throw exception?");
        if (shouldThrow) {
            throw "ReportError: " + errorMessage;
        }
    }
}

function toDict(array, fn) {
    let data = {};
    for (let element of array) {
        let key = fn(element);
        data[key] = element;
    }
    return data;
}

function invertDict(d) {
    let out = {};
    for (let k in d) {
        for (let v of d[k]) {
            if (!(v in out)) {
                out[v] = [];
            }
            out[v].push(k);
        }
    }
    return out;
}

function partitionBy(array, fn) {
    let data = {};
    for (let element of array) {
        let key = fn(element);
        if (!data.hasOwnProperty(key)) {
            data[key] = [];
        }
        data[key].push(element);
    }
    return data;
}

function maxMajorDimension(matrix) {
    if (Array.isArray(matrix)) {
        return matrix.length;
    } else {
        // Plus 1 because length is 1 greater than the largest valid index.
        return Object.keys(matrix).reduce((ac, el) => Math.max(parseInt(ac), parseInt(el))) + 1;
    }
}

function maxMinorDimension(matrix) {
    if (!Array.isArray(matrix)) {
        matrix = Object.values(matrix);
    }
    return matrix.map((el) => maxMajorDimension(el)).reduce((ac, el) => Math.max(ac, el));
}

function mergeMatrices() {
    let output = {};
    for (let matrix of Array.from(arguments)) {
        for (let rowId in matrix) {
            if (!(rowId in output)) {
                output[rowId] = {};
            }
            let outputRow = output[rowId];

            let row = matrix[rowId];
            for (let colId in row) {
                if (colId in outputRow) {
                    reportError("mergeMatrices found duplicate entry for rowId", rowId, ", colId", colId);
                }
                let cell = row[colId];
                outputRow[colId] = cell;
            }
        }
    }
    return output;
}

function matrixHasHoles(matrix) {
    let majorDim = maxMajorDimension(matrix);
    let minorDim = maxMinorDimension(matrix);

    for (let x = 0; x < majorDim; x++) {
        let row = matrix[x];
        if (row === undefined) {
            return true;
        }

        for (let y = 0; y < minorDim; y++) {
            let cell = row[y];
            if (cell === undefined) {
                return true;
            }
        }
    }

    return false;
}


// Hack to get the json data that is embedded in a (templated?) script tag on the page
// TODO: implement using an injected script instead?
function scrapeScriptVariable(variable) {
    let scripts = document.getElementsByTagName("script");
    for (let script of scripts) {
        if (script.innerHTML.indexOf(variable) !== -1) {
            let assignment = variable + " = ";
            let lines = script.innerHTML.split("\n");
            for (let line of lines) {
                if (line.indexOf(assignment) !== -1) {
                    // Remove the left hand side of the assignment and the trailing semicolon.
                    let rhs = line.substr(line.indexOf("=") + 1).trim();
                    let literal = rhs.substr(0, rhs.length - 1);

                    if ((literal.startsWith("'") && literal.endsWith("'"))
                     || (literal.startsWith('"') && literal.endsWith('"'))) {
                        return literal.slice(1, -1);
                    }
                    let obj = JSON.parse(literal);
                    return obj;
                }
            }
        }
    }
}

function scrapePlayersInfo() {
    let playersInfo = scrapeScriptVariable("playersInfo");
    if (!playersInfo) {
        return [];
    }
    return Object.values(playersInfo).sort(
        (lhs, rhs) => lhs.players_order - rhs.players_order);
}

function scrapeTerrainInfo() {
    return scrapeScriptVariable("terrainInfo");
}

function scrapeBuildingsInfo() {
    return scrapeScriptVariable("buildingsInfo");
}

function scrapeWeatherCode() {
    return scrapeScriptVariable("weatherCode");
}

async function fetchPlayersInfo(replayId, ndx) {
    const response = await fetch("https://awbw.amarriner.com/api/game/load_replay.php", {
        method: "POST",
        body: JSON.stringify({
            gameId: replayId,
            turn: ndx,
            initial: false,
        }),
    });
    return response.json().then((replayInfo) => {
        let playersInfo = replayInfo.gameState.players;
        for (let player of replayInfo.players) {
            let playerInfo = playersInfo[player.id];
            if (playerInfo.hasOwnProperty("players_order") && player.hasOwnProperty("order")) {
                playerInfo.players_order = player.order;
            }
        }
        return Object.values(playersInfo).sort(
            (lhs, rhs) => lhs.players_order - rhs.players_order);
    });
}

async function fetchTerrainInfo(mapsId) {
    let url = new URL("https://awbw.amarriner.com/text_map.php");
    url.search = new URLSearchParams({maps_id: mapsId});
    let response = await fetch(url);
    return response.text().then((html) => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');
        let innerTable = doc.querySelector("#main table table");
        let tableText = innerTable.innerText.replace(/\n\s*\n/g, '\n').trim();

        let terrainInfo = {};
        let lines = tableText.split("\n");
        for (let y = 0; y < lines.length; y++) {
            let cells = lines[y].split(",");
            for (let x = 0; x < cells.length; x++) {
                if (!(x in terrainInfo)) {
                    terrainInfo[x] = {};
                }
                terrainInfo[x][y] = {
                    terrain_id: parseInt(cells[x]),
                };
            }
        }
        return terrainInfo;
    });;
}

async function fetchProfileSettings() {
    let response = await fetch("https://awbw.amarriner.com/userinfo.php");
    return response.text().then((html) => {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, 'text/html');

        let portraitsSelect = doc.querySelector("select[name='cop']");
        let portraitsValue = (portraitsSelect ? portraitsSelect.value : "ds");
        return {
            settings_co_portraits_prefix: "terrain/ani/" +  portraitsValue,
        };
    });
}
