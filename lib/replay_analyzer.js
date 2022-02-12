getReplayMetricsByTurn = (function() {
    function getTurnStateMetrics(turnState, playerId) {
        let player = turnState.players[playerId];
        let unitCount = turnState.players_units_count[playerId].total;
        let unitValue = turnState.players_units_count[playerId].value;

        let coMeterFunds = turnState.players[playerId].players_co_power / 10;
        let maxMeterFunds = turnState.players[playerId].players_co_max_spower / 10;
        let coMeterPercent = 100 * (coMeterFunds / maxMeterFunds);

        return {
            income: player.players_income,
            unit_count: unitCount,
            unit_value: unitValue,
            unit_value_and_funds: unitValue + player.players_funds,
            co_meter_funds: coMeterFunds,
            max_meter_funds: maxMeterFunds,
            co_meter_percent: coMeterPercent,
        };
    }

    function analyzePlayerTurnStart(turnState, turns, index, playerId) {
        // TODO: support initial starting funds
        // TODO: implement this for end state?
        let fundsGenerated = 0;
        for (let i = 0; i < turns.length; i++) {
            if (i > index) break;
            let includedTurn = turns[i];
            if (includedTurn.gameState.currentTurnPId === playerId) {
                fundsGenerated += includedTurn.gameState.players[playerId].players_income;
            }
        }

        let metrics = getTurnStateMetrics(turnState, playerId);
        metrics.funds_generated = fundsGenerated;
        return metrics;
    }

    // TODO: oh no fog
    function getTurnStateWithActionsApplied(turn) {
        let gameState = JSON.parse(JSON.stringify(turn.gameState));
        for (let action of turn.actions) {
            // Ignore actions that don't affect metrics that we care about
            // TODO: also exclude the following?
            // AttackSeam, Hide, Unhide, Elimination, SetDraw, Resign, Follow, Pause, BootAET, SwapVision
            if (action.action === "Move"
             || action.action === "Load"
             || action.action === "Unload"
             || action.action === "Supply"
             || action.action === "NextTurn"
             || action.action === "Resign") {
            } else if (action.action === "Capt") {
                for (let playerId in (action.newIncome || {})) {
                    let newIncome = action.newIncome[playerId];
                    gameState.players[playerId].players_income = newIncome.income;
                }
            } else if (action.action === "Build") {
                let unit = action.newUnit;
                let playerId = unit.units_players_id;
                gameState.players[playerId].players_funds -= unit.units_cost;
                gameState.players_units_count[playerId].total += 1;
                gameState.players_units_count[playerId].value += unit.units_cost;
            } else if (action.action === "Fire") {
                function updateUnitAndGetResult(combatant) {
                    let unit = gameState.units[combatant.units_id];
                    let hpLost = unit.units_hit_points - combatant.units_hit_points;
                    unit.units_hit_points = combatant.units_hit_points;
                    let valueLost = unit.units_cost * (hpLost / 10);
                    let unitsLost = unit.units_hit_points === 0 ? 1 : 0;
                    return {playerId: unit.units_players_id, hpLost, valueLost, unitsLost};
                }

                let attRes = updateUnitAndGetResult(action.attacker);
                gameState.players_units_count[attRes.playerId].value -= attRes.valueLost;
                gameState.players_units_count[attRes.playerId].total -= attRes.unitsLost;

                let defRes = updateUnitAndGetResult(action.defender);
                gameState.players_units_count[defRes.playerId].value -= defRes.valueLost;
                gameState.players_units_count[defRes.playerId].total -= defRes.unitsLost;

                // TODO: power charge after combat

            // TODO: powers are complicated...
            // TODO: Delete action
            // TODO: Explode action
            // TODO: Launch action
            } else {
                console.log("Failed to recognize action:", action, ", from turn:", turn);
            }
        }
        return gameState;
    }

    function analyzePlayerTurnEnd(turnState, turns, index, playerId) {
        return getTurnStateMetrics(turnState, playerId);
    }

    function analyzeTurn(turns, index) {
        let turn = turns[index];
        let endTurnState = getTurnStateWithActionsApplied(turn);

        let playerTurnMetrics = {};
        for (let playerId in turn.gameState.players) {
            playerTurnMetrics[playerId] = {
                start: analyzePlayerTurnStart(turn.gameState, turns, index, playerId),
                end: analyzePlayerTurnEnd(endTurnState, turns, index, playerId),
            };
        }

        let currentPlayer = turn.gameState.players[turn.gameState.currentTurnPId];
        return {
            day: turn.day,
            active_country: currentPlayer.countries_code,
            active_player_id: currentPlayer.players_id,
            player_metrics: playerTurnMetrics,
        };
    }

    return function(replayState) {
        let replayMetricsByTurn = [];
        for (let index = 0; index < replayState.length; index++) {
            replayMetricsByTurn.push(analyzeTurn(replayState, index));
        }
        return replayMetricsByTurn;
    };
})();
