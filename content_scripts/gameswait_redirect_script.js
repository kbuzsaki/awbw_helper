OptionsReader.instance().onOptionsReady((options) => {
    if (!options.options_enable_gameswait_redirect) {
        console.log("gameswait redirect disabled.");
        return;
    }
    console.log("gameswait redirect enabled.");

    let redirectElement = document.querySelector("section#main span b");
    if (redirectElement && redirectElement.textContent.startsWith("Invalid game ID! You will be redirected")) {
        console.log("gameswait was invalid, attempting to redirect to 2030.php");
        var urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("games_id")) {
            let gamesId = urlParams.get("games_id");
            let url = "https://awbw.amarriner.com/2030.php?games_id=" + gamesId;
            console.log("Got games_id:", gamesId, "redirecting to", url);
            setTimeout(() => { window.location = url; }, 200);
        } else {
            console.log("Failed to parse game id from", window.location.search);
        }
    } else {
        console.log("gameswait was valid, not redirecting.");
    }
});
