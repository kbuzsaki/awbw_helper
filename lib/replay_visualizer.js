const kReplayVisualizerContainerHtml = `
<div class="awbwenhancements-replay-visualizer">
    <div class="awbwenhancements-replay-visualizer-toolbar">
        <label>
            Metric:
        </label>
        <select class="awbwenhancements-select awbwenhancements-replay-visualizer-metric-select">
            <option>Unit Value</option>
            <option>Unit Count</option>
            <option>Income</option>
            <option>Co Meter (Funds)</option>
            <option>Co Meter (Percent)</option>
        </select>
        <label>
            Time:
        </label>
        <select class="awbwenhancements-select awbwenhancements-replay-visualizer-view-select">
            <option>Day Average</option>
            <option>Turn Start</option>
        </select>
        <div class="game-tools-btn awbwenhancements-replay-visualizer-reload-btn" style="border-right: none;">
            <div class="game-tools-bg">
                <img src="terrain/endturn.gif">
            </div>
            <span class="game-tools-btn-text small_text">Reload Data</span>
        </div>
        <div class="game-tools-btn awbwenhancements-replay-visualizer-new-panel-btn">
            <div class="game-tools-bg">
              <span class="awbwenhancements-text-button">+</span>
            </div>
            <span class="game-tools-btn-text small_text">Open Another Panel</span>
        </div>
    </div>
    <div class="awbwenhancements-replay-visualizer-content">
        Loading replay... (this may take a while for large replays)
    </div>
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
    constructor(replayFetcher, createNewVisualizerPanel) {
        this.replayFetcher = replayFetcher;
        this.container = makeReplayVisualizerContainer();
        this.content = this.container.querySelector(".awbwenhancements-replay-visualizer-content");

        this.metricSelect = this.container.querySelector(".awbwenhancements-replay-visualizer-metric-select");
        this.metricSelect.addEventListener("change", () => this.initializeVisualization());

        this.viewSelect = this.container.querySelector(".awbwenhancements-replay-visualizer-view-select");
        this.viewSelect.addEventListener("change", () => this.initializeVisualization());

        this.reloadButton = this.container.querySelector(".awbwenhancements-replay-visualizer-reload-btn");
        this.reloadButton.addEventListener("click", () => this.reload(this.gameId, true));

        this.newPanelButton = this.container.querySelector(".awbwenhancements-replay-visualizer-new-panel-btn");
        this.newPanelButton.addEventListener("click", createNewVisualizerPanel);
    }

    // TODO: should reload clear the fetch cache?
    reload(gameId, forceReload) {
        if (this.gameId === gameId && this.replayState !== undefined && !forceReload) {
            return;
        }

        if (gameId) {
            this.gameId = gameId;
        }

        this.replayFetcher.fetchReplay(this.gameId).then((replayState) => {
            console.log("Fetched replay state:", replayState);
            this.setReplayState(replayState);
        }).catch((error) => {
            console.log("Failed to fetch replay state:", error);
            this.setError(error);
        });
    }

    setReplayState(replayState) {
        this.replayState = replayState;
        this.initializeVisualization();
    }

    setError(error) {
        let message = error;
        if (error.hasOwnProperty("stack")) {
            message = error.stack;
        }

        this.content.innerText = "Failed to load replay:";
        let errorNode = document.createElement("pre");
        errorNode.innerText = message;
        this.content.appendChild(errorNode);
    }

    getContent() {
        return this.container;
    }

    getSelectedDataset() {
        let metricSelected = this.metricSelect.value;
        let metric = {
            "Co Meter (Funds)": {
                title: "CO Meter",
                fn: ({player, turn}) => turn.gameState.players[player.players_id].players_co_power / 10,
            },
            "Co Meter (Percent)": {
                title: "CO Meter",
                fn: ({player, turn}) => {
                    let meter = turn.gameState.players[player.players_id].players_co_power;
                    let maxMeter = turn.gameState.players[player.players_id].players_co_max_spower;
                    return 100 * (meter / maxMeter);
                }
            },
            "Income": {
                title: "Income",
                fn: ({player, turn}) => player.players_income,
            },
            "Unit Count": {
                title: "Unit Count",
                fn: ({player, turn}) => turn.gameState.players_units_count[player.players_id].total,
            },
            "Unit Value": {
                title: "Unit Value",
                fn: ({player, turn}) => turn.gameState.players_units_count[player.players_id].value,
            },
        }[metricSelected];

        let aggregationSelected = this.viewSelect.value;
        let aggregation = {
            "Turn Start": {
                title: "Turn",
                // TODO: improve the label?
                labelFn: ({turn}) => {
                    let currentPlayer = turn.gameState.players[turn.gameState.currentTurnPId];
                    return turn.day + " - " + currentPlayer.countries_code;
                },
                aggregateFn: (data) => data[0],
                filterFn: () => true,
            },
            "Day Average": {
                title: "Day (Average)",
                labelFn: ({turn}) => turn.day,
                aggregateFn: (data) => {
                    if (data.length === 0) return 0;
                    return data.reduce((a, b) => a + b, 0) / data.length;
                },
                filterFn: ({turns, players}) => {
                    return turns.length === players.length;
                }
            }
        }[aggregationSelected];

        return this.getDataset(metric, aggregation);
    }

    getDataset(metric, aggregation) {
        let players = Object.values(this.replayState[0].gameState.players);

        // Assign labels to turns, which are also used for aggregation
        let candidateLabels = [];
        let turnsByLabel = {};
        for (let turn of this.replayState) {
            let label = aggregation.labelFn({turn});
            if (!(label in turnsByLabel)) {
                candidateLabels.push(label);
                turnsByLabel[label] = [];
            }
            turnsByLabel[label].push(turn);
        }
        let labels = [];
        for (let label of candidateLabels) {
            let turns = turnsByLabel[label];
            if (aggregation.filterFn({turns, players})) {
                labels.push(label);
            }
        }

        // Prepare empty dataset objects for each player
        let datasetMap = {};
        for (let player of players) {
            let colors = kCountryLabelColors[player.countries_code] || {};
            datasetMap[player.players_id] = {
                label: player.users_username,
                backgroundColor: colors.fill,
                borderColor: colors.border,
                data: [],
            };
        }

        for (let label of labels) {
            // Get the data points for each turn belonging to a particular label
            let labelDatasetMap = Object.fromEntries(players.map((player) => [player.players_id, []]));
            for (let turn of turnsByLabel[label]) {
                for (let player of Object.values(turn.gameState.players)) {
                    let labelDataset = labelDatasetMap[player.players_id];
                    labelDataset.push(metric.fn({turn, player}));
                }
            }

            // Aggregate the data points under that label into a single point for the final dataset
            for (let playerId in labelDatasetMap) {
                let labelDataset = labelDatasetMap[playerId];
                let dataset = datasetMap[playerId];
                dataset.data.push(aggregation.aggregateFn(labelDataset));
            }
        }

        let title = metric.title + " by " + aggregation.title;
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

        let {title, labels, datasets} = this.getSelectedDataset();

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
