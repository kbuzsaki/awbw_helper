const kSidebarContainerHtml = `
<div class="awbwenhancements-sidebar-outer-container">
  <div id="awbwenhancements-sidebar-container" class="awbwenhancements-sidebar-inner-container">
    <div id="awbwenhancements-sidebar-contents" class="awbwenhancements-sidebar-contents">
      <div id="awbwenhancements-players-panel" class="awbwenhancements-sidebar-entry"></div>
      <div id="awbwenhancements-removed-units"></div>
    </div>
  </div>
</div>
`;

function makeSidebarContainer() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kSidebarContainerHtml;
    return tempNode.children[0];
}

class PlayersPanel {
    constructor(replayContainer, baseUrl, profileSettingsReader, players) {
        this.replayContainer = replayContainer;
        this.profileSettingsReader = profileSettingsReader;
        this.players = players;

        this.playersInfoPatchElement = document.getElementById("awbw_enhancements-playersInfo-patch");

        // TODO: is this necessary or can it be done once?
        profileSettingsReader.addProfileSettingsUpdateListener(() => {
            let portraitsPrefix = profileSettingsReader.getCoPortraitsPrefix();
            for (let countryCode in this.playerPanels) {
                let panel = this.playerPanels[countryCode];
                panel.setCoPortraitsPrefix(portraitsPrefix);
            }
            this.coSelectPanel.setCoPortraitsPrefix(portraitsPrefix);
        });
        let portraitsPrefix = profileSettingsReader.getCoPortraitsPrefix();

        // TODO: get the actual day by scraping 2030.php?
        this.day = 1;
        this.turnStartListeners = [];

        this.sidebarContainer = makeSidebarContainer();
        this.replayContainer.appendChild(this.sidebarContainer);

        this.playerInfoContainer = document.getElementById("awbwenhancements-players-panel");
        this.removedUnitsContainer = document.getElementById("awbwenhancements-removed-units");
        this.removedUnitsContainer.appendChild(document.getElementById("planner_removed_units"));

        this.gameInfo = {baseUrl, portraitsPrefix};
        this.coSelectPanel = new CoSelectPanel(this.sidebarContainer, this.gameInfo);

        this.playerPanels = {};
        for (let i = 0; i < this.players.length; i++) {
            let playerInfo = this.players[i];
            let playerPanel = new PlayerPanel(this.playerInfoContainer, this.coSelectPanel, this.gameInfo, playerInfo,
                () => { this.handleTurnEndedFor(i); },
                () => { this.handleCopUpdate(); }
            );
            this.playerPanels[playerInfo.countries_code] = playerPanel;
        }
    }

    addTurnStartListener(listener) {
        this.turnStartListeners.push(listener);
    }

    stateId() {
        return "players_panel";
    }

    assembleSavestateData() {
        let panelStates = [];
        for (let countryCode in this.playerPanels) {
            let playerPanel = this.playerPanels[countryCode];
            panelStates.push({
                country_code: countryCode,
                state: playerPanel.assembleSavestateData(),
            });
        }
        return {day: this.day, panel_states: panelStates};
    }

    applySavestateData(data) {
        if (data.day !== undefined) {
            this.day = data.day;
        }

        for (let {country_code, state} of data.panel_states) {
            let playerPanel = this.playerPanels[country_code];
            playerPanel.applySavestateData(state);
        }
        this.injectPlayersInfoPatch();
    }

    startFirstTurn() {
        let currentPlayer;
        for (let countryCode in this.playerPanels) {
            let panel = this.playerPanels[countryCode];
            if (panel.liveInfo.is_current_turn) {
                currentPlayer = panel.playerInfo.users_username;
            }
        }

        for (let listener of this.turnStartListeners) {
            listener(this.day, currentPlayer);
        }
    }

    handleTurnEndedFor(endedIndex) {
        // TODO: add a day counter?
        let nextIndex = (endedIndex + 1) % this.players.length;
        if (nextIndex == 0) {
            this.day += 1;
        }

        let endedPlayer = this.players[endedIndex];
        let endedPanel = this.playerPanels[endedPlayer.countries_code];
        endedPanel.endTurn();
        document.getElementById(endedPlayer.countries_code + "-logo").click();
        document.getElementById("unwait-all").click();

        let nextPlayer = this.players[nextIndex];
        let nextPanel = this.playerPanels[nextPlayer.countries_code];
        nextPanel.startTurn();
        document.getElementById(nextPlayer.countries_code + "-logo").click();

        for (let listener of this.turnStartListeners) {
            listener(this.day, nextPlayer.users_username);
        }
    }

    handleCopUpdate() {
        this.injectPlayersInfoPatch();
    }

    injectPlayersInfoPatch() {
        // Inject the patch data for the damage calculator
        let patches = [];
        for (let country in this.playerPanels) {
            let panel = this.playerPanels[country];
            patches.push({
                id: "" + panel.playerInfo.players_id,
                data: {
                    "players_co_power_on": panel.liveInfo.co_power,
                    "towers": panel.liveInfo.towers,
                    "players_co_id": panel.playerInfo.players_co_id,
                    "co_name": panel.playerInfo.co_name,
                }
            });
        }

        this.playersInfoPatchElement.setAttribute("data", JSON.stringify({patches}));
        this.playersInfoPatchElement.click();
    }

    handleUpdate(mapEntities) {
        let propertiesByCountry =
            partitionBy(mapEntities.properties, (property) => property.country.code);
        let unitsByCountry =
            partitionBy(mapEntities.units, (unit) => unit.country.code);

        let needsUpdate = false;
        for (let playerId in this.playerPanels) {
            let playerPanel = this.playerPanels[playerId];
            let countryCode = playerPanel.playerInfo.countries_code;

            let properties = propertiesByCountry[countryCode] || [];
            let units = unitsByCountry[countryCode] || [];
            needsUpdate |= playerPanel.setMapInfo(properties, units);
        }

        if (needsUpdate) {
            this.injectPlayersInfoPatch();
        }
    }

    handleUnitBuilt(property, builtUnitName) {
        let playerPanel = this.playerPanels[property.country.code];
        playerPanel.handleUnitBuilt(builtUnitName);
    }
}
