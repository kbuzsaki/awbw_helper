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
            <option>Funds Generated</option>
            <option>Co Meter (Funds)</option>
            <option>Co Meter (Percent)</option>
        </select>
        <label>
            Time:
        </label>
        <select class="awbwenhancements-select awbwenhancements-replay-visualizer-view-select">
            <option>Turn Start</option>
            <option>Turn End</option>
            <option>Day Average (Start)</option>
            <option>Day Average (End)</option>
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

        this.replayFetcher.fetchReplay(this.gameId, this.onProgressUpdate.bind(this)).then((replayState) => {
            console.log("Fetched replay state:", replayState);
            this.setReplayState(replayState);
        }).catch((error) => {
            console.log("Failed to fetch replay state:", error);
            this.setError(error);
        });
    }

    onProgressUpdate(progress, total) {
        console.log("progress update:", progress, total);
        let textProgress = progress + "/" + total;
        let text = "Loading replay... (" + textProgress + ", this may take a while for large replays)";
        if (this.replayState === undefined) {
            this.setTextContent(text);
        }
    }

    setTextContent(text) {
        this.content.innerText = text;
    }

    setReplayState(replayState) {
        // TODO: clear progress tracker
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
                fn: ({turnMetrics}) => turnMetrics.co_meter_funds,
                secondaryLabel: "(Max Meter)",
                secondaryFn: ({turnMetrics}) => turnMetrics.max_meter_funds,
            },
            "Co Meter (Percent)": {
                title: "CO Meter",
                fn: ({turnMetrics}) => turnMetrics.co_meter_percent,
            },
            "Income": {
                title: "Income",
                fn: ({turnMetrics}) => turnMetrics.income,
            },
            "Funds Generated": {
                title: "Funds Generated",
                fn: ({turnMetrics}) => turnMetrics.funds_generated,
            },
            "Unit Count": {
                title: "Unit Count",
                fn: ({turnMetrics}) => turnMetrics.unit_count,
            },
            "Unit Value": {
                title: "Unit Value",
                fn: ({turnMetrics}) => turnMetrics.unit_value,
                secondaryLabel: "(Value + Funds)",
                secondaryFn: ({turnMetrics}) => turnMetrics.unit_value_and_funds,
            },
        }[metricSelected];

        let average = (data) => data.length === 0 ? 0 : data.reduce((a, b) => a + b, 0) / data.length;
        let hasAllPlayers = ({turns, players}) => turns.length === players.length;

        let aggregationSelected = this.viewSelect.value;
        let aggregation = {
            // TODO: improve the label?
            "Turn Start": {
                title: "Turn",
                selectFn: ({playerMetrics}) => playerMetrics.start,
                labelFn: ({turn}) => turn.day + " - " + turn.active_country,
                aggregateFn: average,
                filterFn: () => true,
            },
            "Turn End": {
                title: "Turn",
                selectFn: ({playerMetrics}) => playerMetrics.end,
                labelFn: ({turn}) => turn.day + " - " + turn.active_country,
                aggregateFn: average,
                filterFn: () => true,
            },
            // TODO: this would make more sense as using the day end data
            "Day Average (End)": {
                title: "Day (Average)",
                selectFn: ({playerMetrics}) => playerMetrics.end,
                labelFn: ({turn}) => turn.day,
                aggregateFn: average,
                filterFn: hasAllPlayers
            },
            "Day Average (Start)": {
                title: "Day (Average)",
                selectFn: ({playerMetrics}) => playerMetrics.start,
                labelFn: ({turn}) => turn.day,
                aggregateFn: average,
                filterFn: hasAllPlayers
            }
        }[aggregationSelected];

        return this.getDataset(metric, aggregation);
    }

    getDataset(metric, aggregation) {
        let playersMap = this.replayState[0].gameState.players;
        let players = Object.values(playersMap).sort(
            (lhs, rhs) => lhs.players_order - rhs.players_order);
        let firstPlayer = players[0];
        let replayMetrics = getReplayMetricsByTurn(this.replayState);

        // Assign labels to turns, which are also used for aggregation
        let candidateLabels = [];
        let turnsByLabel = {};
        for (let turn of replayMetrics) {
            let isFirstPlayer = firstPlayer.players_id == turn.active_player_id;
            let label = aggregation.labelFn({turn, isFirstPlayer});

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
        let dataMap = {};
        for (let player of players) {
            dataMap[player.players_id] = {
                data: [],
                secondary_data: [],
            };
        }

        for (let label of labels) {
            // Get the data points for each turn belonging to a particular label
            let labelDataMap = Object.fromEntries(players.map(
                (player) => [player.players_id, {data: [], secondary_data: []}]));
            for (let turn of turnsByLabel[label]) {
                for (let playerId in turn.player_metrics) {
                    let labelData = labelDataMap[playerId];
                    let playerMetrics = turn.player_metrics[playerId];
                    let turnMetrics = aggregation.selectFn({playerMetrics});
                    labelData.data.push(metric.fn({turnMetrics}));
                    if (metric.secondaryFn) {
                        labelData.secondary_data.push(metric.secondaryFn({turnMetrics}));
                    }
                }
            }

            // Aggregate the data points under that label into a single point for the final dataset
            for (let playerId in labelDataMap) {
                let labelData = labelDataMap[playerId];
                let playerData = dataMap[playerId];
                playerData.data.push(aggregation.aggregateFn(labelData.data));
                if (labelData.secondary_data.length > 0) {
                    playerData.secondary_data.push(aggregation.aggregateFn(labelData.secondary_data));
                }
            }
        }

        function makeDataset(player, data, isSecondary) {
            let colors = kCountryLabelColors[player.countries_code] || {};
            let dataset = {
                label: player.users_username,
                backgroundColor: colors.fill,
                borderColor: colors.border,
                data: data,
            };
            if (isSecondary) {
                dataset.label += " " + metric.secondaryLabel;
                dataset["borderDash"] = [10, 5];
                dataset.backgroundColor = dataset.backgroundColor.replace(")", ", 0.5)");
                dataset.borderColor = dataset.borderColor.replace(")", ", 0.5)");
            }
            return dataset;
        }

        let datasets = [];
        let secondaryDatasets = [];
        for (let playerId in dataMap) {
            let player = playersMap[playerId];
            let playerData = dataMap[playerId];
            datasets.push(makeDataset(player, playerData.data, /*isDashed=*/false));
            if (playerData.secondary_data.length > 0) {
                secondaryDatasets.push(makeDataset(player, playerData.secondary_data, /*isDashed=*/true));
            }
        }

        let title = metric.title + " by " + aggregation.title;
        return {title, labels, datasets: datasets.concat(secondaryDatasets)};
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
