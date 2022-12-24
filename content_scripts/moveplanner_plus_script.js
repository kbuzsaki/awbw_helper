/*
{
    "users_username": "saltor",
    "players_id": 1299238,
    "players_team": "1299238",
    "players_countries_id": 1,
    "players_eliminated": "N",
    "players_co_id": 22,
    "co_name": "Jake",
    "co_max_power": 270000,
    "co_max_spower": 540000,
    "players_co_power": 0,
    "players_co_power_on": "N",
    "players_co_max_power": 270000,
    "players_co_max_spower": 540000,
    "players_co_image": "jake.png",
    "players_funds": 11000,
    "countries_code": "os",
    "countries_name": "Orange Star",
    "cities": 8,
    "labs": 0,
    "towers": 0,
    "other_buildings": 11,
    "players_turn_clock": 1896396,
    "players_turn_start": "2021-11-25 19:56:14",
    "players_order": 19,
    "players_income": 11000
}
 */


// Initialize to undefined to catch illegal use before we initialize it properly.
let fundsPerProperty = undefined;

function makeFakePlayerInfo(country, funds, isFirst) {
    return {
        users_username: country.name,
        players_id: 0,
        co_name: "Andy",
        co_max_power: 270000,
        co_max_spower: 540000,
        players_funds: funds,
        countries_code: country.code,
        countries_name: country.name,
        is_current_turn: isFirst,
    };
}

async function getInitialPlayerState(options, mapEntities) {
    let propertiesByCountry =
        partitionBy(mapEntities.properties, (property) => property.country.code);

    let players = scrapePlayersInfo();

    // If the moveplanner was loaded from a replay then the scraped players info
    // will be incorrect, so load it from the API instead.
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has("ndx")) {
        let replayId = parseInt(urlParams.get("replays_id"));
        let ndx = parseInt(urlParams.get("ndx"));
        players = await fetchPlayersInfo(replayId, ndx);
    }

    if (players.length !== 0) {
        let latestPlayer = undefined;
        let latestPlayerStartTime = 0;
        for (let playerInfo of players) {
            let country = kCountriesByCode[playerInfo.countries_code];
            let startTime = Date.parse(playerInfo.players_turn_start);
            if (startTime > latestPlayerStartTime) {
                latestPlayer = playerInfo;
                latestPlayerStartTime = startTime;
            }
            playerInfo.is_current_turn = false;

            if (playerInfo.users_username === undefined) {
                playerInfo.users_username = country.name;
            }
            if (playerInfo.co_max_power === undefined) {
                playerInfo.co_max_power = 270000;
            }
            if (playerInfo.co_max_spower === undefined) {
                playerInfo.co_max_spower = 540000;
            }

            // If income is set and non-zero, try to infer the funding level
            if (playerInfo.players_income && playerInfo.cities != "?" && !fundsPerProperty) {
                let properties = propertiesByCountry[playerInfo.countries_code];
                let incomeProperties = properties.filter((p) => p.producesIncome()).length;
                fundsPerProperty = playerInfo.players_income / incomeProperties;
                if (playerInfo.co_name === "Sasha") {
                    fundsPerProperty -= 100;
                }
            }
        }
        // TODO: add better handling for if playerInfo is incomplete.
        if (latestPlayer === undefined) {
            latestPlayer = players[0];
        }
        latestPlayer.is_current_turn = true;

        if (!fundsPerProperty) {
            fundsPerProperty = options.options_default_funding;
        }
    } else {
        // If there's no player data, fabricate some based on the predeployed properties.
        fundsPerProperty = options.options_default_funding;;

        let isFirst = true;
        for (let country of kCountries) {
            if (country.flatName === "neutral"
             || !propertiesByCountry.hasOwnProperty(country.code)) {
                continue;
            }

            let funds = 0;
            if (isFirst) {
                let properties = propertiesByCountry[country.code];
                let incomeProperties = properties.filter((p) => p.producesIncome()).length;
                funds = incomeProperties * fundsPerProperty;
            }

            players.push(makeFakePlayerInfo(country, funds, isFirst));
            isFirst = false;
        }
    }

    return players;
}

async function getMergedTerrainInfo() {
    let terrainInfo = scrapeTerrainInfo();
    let buildingsInfo = scrapeBuildingsInfo();

    let mergedTerrainInfo = undefined;
    if (!terrainInfo || !buildingsInfo) {
        console.log("Failed to load one of terrainInfo:", terrainInfo, "or buildingsInfo:", buildingsInfo);
    } else {
        let merged = mergeMatrices(terrainInfo, buildingsInfo);
        if (matrixHasHoles(merged)) {
            console.log("Merged terrainInfo had holes, refusing to use it:", merged);
        } else {
            console.log("Loaded merged terrain info from page:", merged);
            mergedTerrainInfo = merged;
        }
    }

    // TODO: handling for broken pipe seams
    if (!mergedTerrainInfo) {
        let urlParams = new URLSearchParams(window.location.search);
        let mapsId = undefined;
        if (urlParams.has("maps_id")) {
            mapsId = parseInt(urlParams.get("maps_id"));
            console.log("Got maps_id from URL:", mapsId);
        } else {
            let mapsIdInput = document.querySelector("input[name=maps_id]");
            if (mapsIdInput && !isNaN(parseInt(mapsIdInput.value))) {
                mapsId = parseInt(mapsIdInput.value);
                console.log("Got maps_id from form input:", mapsId);
            }
        }

        if (mapsId) {
            console.log("Falling back to fetching map text.");
            mergedTerrainInfo = await fetchTerrainInfo(mapsId);
        } else {
            reportError("Couldn't find maps_id, failed to fetch map data.");
        }
    }

    return mergedTerrainInfo;
}

// TODO: support for "undo"

function injectRequestedStyles(options) {
    if (options.options_menu_opacity === 1) {
        return;
    }

    let s = document.createElement("style");
    s.appendChild(document.createTextNode(`
    #options-menu ul, #build-menu ul {
      background-color: rgb(221, 221, 221, ${options.options_menu_background_alpha});
    }
    #options-menu ul li:hover, #build-menu ul li:hover {
      background-color: rgb(190, 190, 190, ${options.options_menu_background_alpha});
    }`));
    (document.head || document.documentElement).appendChild(s);
}

function injectRequestedScripts(options, done) {
    let snapshotElement = document.createElement("div");
    snapshotElement.id = "awbw_enhancements-savestate-snapshot";
    document.body.appendChild(snapshotElement);

    let requestElement = document.createElement("div");
    requestElement.id = "awbw_enhancements-playersInfo-patch";
    document.body.appendChild(requestElement);

    let scripts = [];
    if (options.options_enable_savestate_interception) {
        scripts.push("/res/savestate_injector.js");
    }
    scripts.push("/res/unitsinfo_patcher.js#" + JSON.stringify(options));
    scripts.push("/res/playersinfo_patcher.js");
    console.log("Injecting requested scripts:", scripts);

    function injectScript(scriptName, onload) {
        let s = document.createElement("script");
        s.src = chrome.runtime.getURL(scriptName);
        s.onload = onload;
        (document.head || document.documentElement).appendChild(s);
    }

    let numFinished = 0;
    for (let script of scripts) {
        injectScript(script, () => {
            numFinished++;
            if (numFinished === scripts.length) {
                done();
            }
        });
    }
}

OptionsReader.instance().onOptionsReady((options) => {
    injectRequestedStyles(options);
    // Inject scripts before performing other setup so that all of the patches are in place.
    injectRequestedScripts(options, async () => {
        if (!options.options_enable_moveplanner_plus) {
            console.log("Moveplanner plus disabled, exiting setup");
            return;
        }

        let gamemap = document.getElementById("gamemap");
        let replayContainer = document.getElementById("replay-container");
        if (!gamemap || !replayContainer) {
            reportError("Failed to find gamemap (", gamemap, ") or replayContainer (", replayContainer, ")");
            return;
        }

        let parser = new GameStateParser(gamemap);
        let initialMapEntities = parser.parseMapEntities();
        let baseUrl = initialMapEntities.baseUrl || "https://awbw.amarriner.com/terrain/ani/";
        let players = await getInitialPlayerState(options, initialMapEntities);

        let profileSettingsReader = await ProfileSettingsReader.instance();
        let playersPanel = new PlayersPanel(replayContainer, baseUrl, profileSettingsReader, players);
        parser.addListener((mapEntities) => {
            playersPanel.handleUpdate(mapEntities);
        });

        let buildMenu = document.getElementById("build-menu");
        let buildMenuListener = new BuildMenuListener(buildMenu, initialMapEntities.properties);
        parser.addListener((mapEntities) => {
            buildMenuListener.onMapUpdate(mapEntities);
        });
        buildMenuListener.addUnitBuildListener((property, builtUnit) => {
            playersPanel.handleUnitBuilt(property, builtUnit);
        });

        if (options.options_enable_move_range_preview) {
            let mergedTerrainInfo = await getMergedTerrainInfo();
            if (mergedTerrainInfo) {
                let cursorTracker = new CursorTracker(options);
                let rangePreview = new MoveRangePreview(gamemap, mergedTerrainInfo, players);
                parser.addListener(rangePreview.onMapUpdate.bind(rangePreview));
                cursorTracker.addCursorUpdateListener(rangePreview.onCursorUpdate.bind(rangePreview));
            }
        }

        if (options.options_enable_savestate_interception) {
            let loadStateInput = document.getElementById("load-state-input");
            let savestateInterceptor = new SavestateInterceptor(options, loadStateInput, [playersPanel]);

            let controlsTable = document.getElementById("game-controls-table");
            let savestateManager = new SavestateManager(controlsTable, baseUrl, savestateInterceptor);
            savestateInterceptor.addOnUploadListener(savestateManager.onSavestateUpload.bind(savestateManager));
            playersPanel.addTurnStartListener(savestateManager.onTurnStart.bind(savestateManager));
        }

        let observer = new MutationObserver((mutations, observer) => {
            // Ignore cursor-only mutations, they can't affect game state.
            let isInteresting = false;
            for (let mutation of mutations) {
                if (mutation.target.id != "cursor") {
                    isInteresting = true;
                    break;
                }
            }

            if (isInteresting) {
                parser.handleMapUpdate();
            }
        });
        observer.observe(gamemap, {subtree: true, childList: true, attributes: true});

        if (options.options_enable_bugfix_restore_clobbers_removed_unit_icons) {
            let removedUnitsPanel = document.getElementById("planner_removed_units");
            if (removedUnitsPanel) {
                (new MutationObserver(() => {
                    let childSpans = removedUnitsPanel.getElementsByTagName("span");
                    for (let child of childSpans) {
                        if (child.id.startsWith("unit_")) {
                            child.removeAttribute("id");
                        }
                    }
                })).observe(removedUnitsPanel, {subtree: true, childList: true});
            }
        }

        // Grab initial state to initialize stuff
        parser.handleMapUpdate();

        playersPanel.startFirstTurn();
    });
});
