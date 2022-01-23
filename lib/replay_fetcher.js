class ReplayFetcher {
    constructor() {
        // TODO: factor this out?
        this.throttleMs = 150;
        this.nextMinimumRequestTimeMs = 0;
    }

    getCacheKey(gameId) {
        return "replay_fetcher_cache_" + gameId;
    }

    _throttledFetch(url, init) {
        let nowMs = Date.now();
        let backoffMs = this.nextMinimumRequestTimeMs - nowMs;

        // No need to throttle
        if (backoffMs <= 0) {
            console.log("Permitting fetch:", url, init);
            this.nextMinimumRequestTimeMs = nowMs + this.throttleMs;
            return fetch(url, init);
        }
        console.log("Backoff greater than 0:", backoffMs);

        // We need to throttle
        this.nextMinimumRequestTimeMs += this.throttleMs;
        return new Promise(resolve => {
            setTimeout(() => {
                console.log("Throttled fetch running:", url, init);
                fetch(url, init).then(resolve);
            }, backoffMs);
        });
    }

    _fetchReplayStateForTurn(gameId, turn, initial) {
        return this._throttledFetch("https://awbw.amarriner.com/api/game/load_replay.php", {
            method: "POST",
            body: JSON.stringify({
                gameId: gameId,
                turn: turn,
                initial: initial || false,
            }),
        }).then((resp) => resp.json());
    }

    _getCachedReplayState(gameId) {
        return [];
    }

    fetchReplay(gameId, forceRefresh) {
        // 1. get turn count
        // 2. read what we have from cache
        // 3. get remaining items

        return Promise.all([
            this._fetchReplayStateForTurn(gameId, 0, true),
            this._getCachedReplayState(gameId)])
        .then(([firstTurnState, cachedTurns]) => {
            let numTurns = firstTurnState.daySelector.length;
            let numCachedTurns = cachedTurns.length;

            let fetchedTurnPromises = [];
            for (let turn = numCachedTurns; turn < numTurns; turn++) {
                fetchedTurnPromises.push(this._fetchReplayStateForTurn(gameId, turn));
            }

            return Promise.all(fetchedTurnPromises, (fetchedTurns) => {
                let allTurns = cachedTurns.concat(fetchedTurns);
                this._setCachedReplayState(gameId, allTurns);
                return allTurns;
            });
        });
    }

    // TODO: is this necessary?
    clearReplayCache(gameId) {
    }
}
