const kReplayFetcherCacheStorageKey = "replay_fetcher_cache";

// TODO: limit cache based on actual size in bytes
const kReplayFetcherCacheLimit = 5;

class ReplayFetcher {
    constructor() {
        // TODO: factor this out into a generic throttled client?
        this.throttleMs = 1000;
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
        return new Promise((resolve) => {
            let request = {};
            request[kReplayFetcherCacheStorageKey] = {};
            chrome.storage.local.get(request, (result) => {
                let cache = result[kReplayFetcherCacheStorageKey];
                if (!(gameId in cache)) {
                    console.log("No replay fetcher cache entry for", gameId);
                    resolve([]);
                    return;
                }

                let cacheEntry = cache[gameId];
                console.log("Game", gameId, "has cache entry:", cacheEntry);
                cacheEntry.lastUsedMs = Date.now();
                chrome.storage.local.set(result);

                let raw = cacheEntry.compressedState;
                let json = LZString.decompressFromUTF16(raw);
                let replayState = JSON.parse(json);
                resolve(replayState);
            });
        });
    }

    _setCachedReplayState(gameId, allTurns) {
        console.log("Setting replay state:", gameId, allTurns);
        // This races if there are concurrent writes, but that's okay because it's just a cache.
        let request = {};
        request[kReplayFetcherCacheStorageKey] = {};
        chrome.storage.local.get(request, (result) => {
            let cache = result[kReplayFetcherCacheStorageKey];
            // Don't cache the last turn because it could be incomplete.
            let replayState = allTurns.slice(0, allTurns.length - 1);
            let json = JSON.stringify(replayState);
            cache[gameId] = {
                gameId: gameId,
                compressedState: LZString.compressToUTF16(json),
                lastUsedMs: Date.now(),
            };
            console.log("Cache is now:", cache);

            // Prune oldest entry if we're over the limit
            let cacheEntries = Object.values(cache);
            if (cacheEntries.length > kReplayFetcherCacheLimit) {
                let numEvicted = cacheEntries.length - kReplayFetcherCacheLimit;
                console.log("Cache is over limit of", kReplayFetcherCacheLimit, ", evicting", numEvicted);
                // Sort entries with oldest at the beginning.
                cacheEntries.sort((lhs, rhs) => { return lhs.lastUsedMs - rhs.lastUsedMs; });

                let evictedEntries = cacheEntries.slice(0, numEvicted);
                console.log("Evicting entries:", evictedEntries);
                for (let evicted of evictedEntries) {
                    delete cache[evicted.gameId];
                }
            }
            console.log("Storing cache:", cache, "which has size:", JSON.stringify(cache).length);
            chrome.storage.local.set(result);
        });
    }

    fetchReplay(gameId, forceRefresh) {
        return Promise.all([
            this._fetchReplayStateForTurn(gameId, 0, true),
            this._getCachedReplayState(gameId)])
        .then(([firstTurnState, cachedTurns]) => {
            let numTurns = firstTurnState.daySelector.length;
            let numCachedTurns = cachedTurns.length;
            console.log("Got cached turns:", numCachedTurns);

            let fetchedTurnPromises = [];
            for (let turn = numCachedTurns; turn < numTurns; turn++) {
                fetchedTurnPromises.push(this._fetchReplayStateForTurn(gameId, turn));
            }

            return Promise.all(fetchedTurnPromises).then((fetchedTurns) => {
                let allTurns = cachedTurns.concat(fetchedTurns);
                console.log("Calling setCachedReplayState");
                this._setCachedReplayState(gameId, allTurns);
                return allTurns;
            });
        });
    }

    clearReplayCache() {
        console.log("Clearing replay fetcher cache!");
        chrome.storage.local.remove(kReplayFetcherCacheStorageKey);
    }
}
