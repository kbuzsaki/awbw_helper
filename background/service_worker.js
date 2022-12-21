function isReplayDownload(item) {
    return item.url.includes("replay_download.php") && item.mime === "application/zip";
}

function getGameId(item) {
    let search = item.url.substring(item.url.indexOf("?"));
    let urlParams = new URLSearchParams(search);
    if (urlParams.has("games_id")) {
        return parseInt(urlParams.get("games_id"));
    }
    return undefined;
}

function fetchReplayState(gameId) {
    return fetch("https://awbw.amarriner.com/api/game/load_replay.php", {
        method: "POST",
        body: JSON.stringify({
            gameId: gameId,
            turn: 1,
            initial: false,
        }),
    }).then((resp) => {
        return resp.json();
    });
}

function fetchMapName(gameId) {
    let gameUrl = new URL("https://awbw.amarriner.com/2030.php");
    gameUrl.search = new URLSearchParams({games_id: gameId});

    return fetch(gameUrl).then((resp) => {
        return resp.text();
    }).then((html) => {
        // DOMParser isn't available in service workers, but the map link is easy enough to find
        let matches = html.match(/prevmaps\.php\?maps_id=\d+">([^<]+)</);
        if (matches.length > 1) {
            return matches[1];
        }
        console.log("Failed to find map name for game", gameId);
        return "";
    });
}

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    chrome.storage.sync.get({
        options_enable_automatic_replay_renaming: false
    }, (result) => {
        if (!result.options_enable_automatic_replay_renaming) {
            console.log("Automatic replay renaming disabled:", result, ", ignoring download:", downloadItem);
            suggest();
            return;
        }
        console.log("Renamer with options", result, "inspecting download", downloadItem);

        if (!isReplayDownload(downloadItem)) {
            console.log("*** NOT renaming download:", downloadItem);
            suggest();
            return;
        }

        let gameId = getGameId(downloadItem);
        if (gameId === undefined) {
            console.log("Failed to get game id for download:", downloadItem);
            suggest();
            return;
        }
        console.log("Renaming replay with game id:", gameId);

        Promise.all([
            fetchMapName(gameId),
            fetchReplayState(gameId)
        ]).then(([
            gameName,
            replayState
        ]) => {
            let nameComponents = ["" + gameId];

            if (gameName && gameName !== "") {
                nameComponents.push(gameName);
            }

            let players = replayState.gameState.players;
            let playerStr = Object.values(players).map((player) => {
                return player.users_username + " (" + player.co_name + ")";
            }).join(" vs ");

            nameComponents.push(playerStr);

            let filename = nameComponents.join(" - ") + ".zip";
            suggest({filename});
        }).catch((e) => {
            console.log("Encountered error while loading player data for replay download:", e);
            suggest();
        });
    });

    return true;
});
