getReplayMetricsByTurn = (function() {
    // TODO: also synthesize end turn state
    function analyzePlayerTurn(turns, index, player) {
        let currentTurn = turns[index];
        let unitCount = currentTurn.gameState.players_units_count[player.players_id].total;
        let unitValue = currentTurn.gameState.players_units_count[player.players_id].value;

        let coMeterFunds = currentTurn.gameState.players[player.players_id].players_co_power / 10;
        let maxMeterFunds = currentTurn.gameState.players[player.players_id].players_co_max_spower / 10;
        let coMeterPercent = 100 * (coMeterFunds / maxMeterFunds);

        // TODO: support initial starting funds
        let fundsGenerated = 0;
        for (let i = 0; i < turns.length; i++) {
            if (i > index) break;
            let includedTurn = turns[i];
            if (includedTurn.gameState.currentTurnPId === player.players_id) {
                fundsGenerated += includedTurn.gameState.players[player.players_id].players_income;
            }
        }

        return {
            income: player.players_income,
            unit_count: unitCount,
            unit_value: unitValue,
            unit_value_and_funds: unitValue + player.players_funds,
            co_meter_funds: coMeterFunds,
            max_meter_funds: maxMeterFunds,
            co_meter_percent: coMeterPercent,
            funds_generated: fundsGenerated,
        };
    }

    function analyzeTurn(turns, index) {
        let turn = turns[index];

        let playerTurnMetrics = {};
        for (let player of Object.values(turn.gameState.players)) {
            playerTurnMetrics[player.players_id] = analyzePlayerTurn(turns, index, player);
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
