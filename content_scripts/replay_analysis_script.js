OptionsReader.instance().onOptionsReady((options) => {
    const kChartButtonHtml = `
    <section>
        <div class="game-tools-btn" style="margin-left: 5px;">
            <div class="game-tools-bg">
                <img src="terrain/userstats.gif" style="">
            </div>
            <span class="game-tools-btn-text small_text">Replay Analysis</span>
        </div>
    </section>`;

    function makeChartButton() {
        let tempNode = document.createElement("div");
        tempNode.innerHTML = kChartButtonHtml;
        return tempNode.children[0];
    }

    function getGameId() {
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("games_id")) {
            return parseInt(urlParams.get("games_id"));
        } else if (urlParams.has("replays_id")) {
            return parseInt(urlParams.get("replays_id"));
        }
        return undefined;
    }

    let gameId = getGameId();
    let replayFetcher = new ReplayFetcher();

    let replayPanels = [];

    function createNewVisualizer() {
        let newVisualizer = new ReplayVisualizer(replayFetcher, createNewVisualizer);
        let newPanel = new DragPanel(undefined, /*deleteOnClose=*/true, (toRemove) => {
            let index = replayPanels.indexOf(toRemove);
            console.log("Removing panel at index:", index);
            if (index > -1) {
                replayPanels.splice(index);
            }
        });
        replayPanels.push(newPanel);
        newPanel.setContent(newVisualizer.getContent());
        newPanel.setVisible(true);
        newVisualizer.reload(gameId);
    };

    let replayVisualizer = new ReplayVisualizer(replayFetcher, createNewVisualizer);

    let replayPanel = new DragPanel("replay-analysis-panel");
    replayPanel.setContent(replayVisualizer.getContent());
    replayPanels.push(replayPanel);

    let replayControls = document.querySelector("section.replay-controls");
    let chartButton = makeChartButton();
    chartButton.addEventListener("click", (event) => {
        let newVisible = !replayPanels[0].getVisible();
        for (let panel of replayPanels) {
            panel.setVisible(newVisible);
        }
        replayVisualizer.reload(gameId);
    });
    replayControls.parentNode.insertBefore(chartButton, replayControls.nextSibling);
});
