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
    let replayVisualizer = new ReplayVisualizer();

    let replayPanel = new DragPanel("replay-analysis-panel");
    replayPanel.setContent(replayVisualizer.getContent());

    let replayControls = document.querySelector("section.replay-controls");
    let chartButton = makeChartButton();
    chartButton.addEventListener("click", (event) => {
        replayPanel.toggleVisible();

        replayFetcher.fetchReplay(gameId).then((replayState) => {
            console.log("Fetched replay state:", replayState);
            replayVisualizer.setReplayState(replayState);
        }).catch((error) => {
            console.log("Failed to fetch replay state:", error);
            replayVisualizer.setError(error);
        });
    });
    replayControls.parentNode.insertBefore(chartButton, replayControls.nextSibling);
});
