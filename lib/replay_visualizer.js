const kReplayVisualizerContainerHtml = `
<div class="awbwenhancements-replay-visualizer">
    Loading replay...
</div>
`;

function makeReplayVisualizerContainer() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kReplayVisualizerContainerHtml;
    return tempNode.children[0];
}

const kReplayVisualizerCanvasHtml = `
<canvas width="600" height="400"></canvas>
`;
function makeReplayVisualizerCanvas() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kReplayVisualizerCanvasHtml;
    return tempNode.children[0];
}

const kCountryLabelColors = {
    "os": { fill: "rgb(255, 79, 78)", border: "rgb(146, 50, 67)", },
    "bm": { fill: "rgb(148, 162, 253)", border: "rgb(70,110,254)", },
    "ge": { fill: "rgb(135, 226, 135)", border: "rgb(61, 194, 45)", },
    "yc": { fill: "rgb(240, 210, 4", border: "rgb(201, 189, 2)", },
    "bh": { fill: "rgb(187, 180, 165", border: "rgb(116, 89, 138)", },
    "rf": { fill: "rgb(194, 113, 132", border: "rgb(181, 39, 68)", },
    "gs": { fill: "rgb(151, 151, 151", border: "rgb(114, 114, 114)", },
    "bd": { fill: "rgb(173, 126, 95", border: "rgb(152, 83, 51)", },
    "ab": { fill: "rgb(254, 192, 120", border: "rgb(252, 163, 57)", },
    "js": { fill: "rgb(196, 215, 180", border: "rgb(166, 182, 153)", },
    "ci": { fill: "rgb(35, 66, 186", border: "rgb(11, 32, 112)", },
    "pc": { fill: "rgb(255, 153, 204", border: "rgb(255, 102, 204)", },
    "tg": { fill: "rgb(108, 217, 208", border: "rgb(60, 205, 193)", },
    "pl": { fill: "rgb(164, 71, 211", border: "rgb(111, 26, 155)", },
    "ar": { fill: "rgb(122, 157, 17", border: "rgb(97, 124, 14)", },
    "wn": { fill: "rgb(212, 191, 159", border: "rgb(205, 155, 154)", },
};

class ReplayVisualizer {
    constructor() {
        this.content = makeReplayVisualizerContainer();
    }

    setReplayState(replayState) {
        this.replayState = replayState;
        this.initializeVisualization();
    }

    getContent() {
        return this.content;
    }

    getIncomeData() {
        return this.getDataByTurn("Income by Turn", (turnState, player) => {
            return player.players_income;
        });
    }

    getUnitValueData() {
        return this.getDataByTurn("Unit Value by Turn", (turnState, player) => {
            return turnState.gameState.players_units_count[player.players_id].value;
        });
    }

    getDataByTurn(title, fn) {
        let labels = [];
        let datasetMap = {};
        for (let player of Object.values(this.replayState[0].gameState.players)) {
            let colors = kCountryLabelColors[player.countries_code] || {};
            datasetMap[player.players_id] = {
                label: player.users_username,
                backgroundColor: colors.fill,
                borderColor: colors.border,
                data: [],
            };
        }

        for (let turnState of this.replayState) {
            let currentPlayer = turnState.gameState.players[turnState.gameState.currentTurnPId];
            // TODO: improve the label?
            labels.push(turnState.day + " - " + currentPlayer.countries_code);
            for (let player of Object.values(turnState.gameState.players)) {
                let dataset = datasetMap[player.players_id];
                dataset.data.push(fn(turnState, player));
            }
        }

        let datasets = Object.values(datasetMap);
        return {title, labels, datasets};
    }

    initializeVisualization() {
        if (!this.replayState) {
            this.content.innerText = "Loading replay...";
            return;
        }

        while (this.content.firstChild) {
            this.content.removeChild(this.content.firstChild);
        }

        // TODO: add dataset picker
        let {title, labels, datasets} = this.getUnitValueData();

        this.canvas = makeReplayVisualizerCanvas();
        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: {labels, datasets},
            options: {
                scales: {
                    y: { beginAtZero: true }
                },
                plugins: {
                    title: {
                        display: true,
                        text: title,
                    }
                }
            }
        });

        this.content.appendChild(this.canvas);
    }
}
