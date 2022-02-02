getReplayMetricsByTurn = (function() {
    // TODO: also synthesize end turn state
    function analyzePlayerTurn(turn, player) {
        let unitCount = turn.gameState.players_units_count[player.players_id].total;
        let unitValue = turn.gameState.players_units_count[player.players_id].value;

        let coMeterFunds = turn.gameState.players[player.players_id].players_co_power / 10;
        let maxMeterFunds = turn.gameState.players[player.players_id].players_co_max_spower / 10;
        let coMeterPercent = 100 * (coMeterFunds / maxMeterFunds);

        return {
            income: player.players_income,
            unit_count: unitCount,
            unit_value: unitValue,
            co_meter_funds: coMeterFunds,
            co_meter_percent: coMeterPercent,
        };
    }

    function analyzeTurn(turn) {
        let playerTurnMetrics = {};
        for (let player of Object.values(turn.gameState.players)) {
            playerTurnMetrics[player.players_id] = analyzePlayerTurn(turn, player);
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
        return replayState.map(analyzeTurn);
    };
})();
