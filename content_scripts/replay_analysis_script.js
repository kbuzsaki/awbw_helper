(function() {
    const kSidebarButtonHtml = `
    <section>
        <div class="game-tools-btn" style="margin-left: 5px;">
            <div class="game-tools-bg">
                <img src="terrain/userstats.gif" style="">
            </div>
            <span class="game-tools-btn-text small_text">Replay Analysis</span>
        </div>
    </section>
    `;
    function makeChartButton() {
        let tempNode = document.createElement("div");
        tempNode.innerHTML = kSidebarButtonHtml;
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

    // TODO: should this hide when the replay is closed?
    let replayControls = document.querySelector("section.replay-controls");
    let chartButton = makeChartButton();
    replayControls.parentNode.insertBefore(chartButton, replayControls.nextSibling);

    let gameId = getGameId();

    let replayFetcher = new ReplayFetcher();
    let replayPanel = new DragPanel("replay-analysis-panel");
    replayPanel.setContent(document.createTextNode("foo bar baz"));
    chartButton.addEventListener("click", (event) => {
        console.log("Clicked analysis button");
        replayPanel.toggleVisible();
        /*
        replayFetcher.fetchReplay(gameId).then((result) => {
            console.log("Fetched replay state:", result);
        });
        */
    });

})();
