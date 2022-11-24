(function(){
    let oldPost = axios.post;

    class AxiosThrottler {
        constructor() {
            this.debug = true;
            this.throttleMs = 10 * 1000;
            this.retryBackoffMs = 2 * 1000;
            this.maxRetries = 2;
            this.requestCache = new Map();
        }

        // Only throttle specific request types so that we don't accidentally break the
        // game state by returning incorrect information.
        isCacheableRequest(req) {
            return req.url === "api/game/fetch_game_activity_date.php";
        }

        // Only retry specific request types so that we don't accidentally retry
        // destructive operations.
        isRetriableRequest(req) {
            return req.url === "api/game/load_replay.php";
        }

        doWithCacheThrottling(req) {
            let key = JSON.stringify({url: req.url, data: req.data});
            let cacheEntry = this.requestCache.get(key);

            if (cacheEntry === undefined) {
                if (this.debug) console.log("No cached response for throttlable request, proceeding.");
            } else if (this.throttleMs < (Date.now() - cacheEntry.timeMs)) {
                if (this.debug) console.log("Cached response for throttlable request is stale, proceeding.");
            } else {
                if (this.debug) console.log("Cached response is fresh enough, throttling.");
                return cacheEntry.promise;
            }

            let promise = oldPost(req.url, req.data, req.config);
            this.requestCache.set(key, {promise: promise, timeMs: Date.now()});
            return promise.then((res) => {
                if (this.debug) console.log("Newly cached promise for:", key, "got value:", res);
                return res;
            });
        }

        doWithRetries(id, promiseFn) {
            var hasRetried = false;

            return promiseFn().then((res) => {
                if (this.debug) console.log("Retriable req got: url:", id, "with value:", res);
                return res;
            }).catch((res) => {
                if (this.debug) console.log("Error from retriable req: url:", id, "with value:", res);
                let shouldRetry = res.response.status === 503 && !hasRetried;
                hasRetried = true;

                if (shouldRetry) {
                    console.log("Retriable request was 503'd!");
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            console.log("Retrying 503'd request...");
                            promiseFn().then(resolve);
                        }, this.retryBackoffMs);
                    });
                } else {
                    throw res;
                }
            });
        }

        // Monkey patch axios.post to implement two pieces of functionality:
        // 1. throttle known noisy requests to avoid hitting the rate limit.
        // 2. if we do hit the rate limit, block and retry them?
        wrappedPost(url, data, config) {
            let req = {url: url, data: data, config: config};

            if (this.isCacheableRequest(req)) {
                return this.doWithCacheThrottling(req);
            } else if (this.isRetriableRequest(req)) {
                return this.doWithRetries(url, () => { return oldPost(url, data, config); });
            }

            return oldPost(url, data, config);
        }
    }

    let throttler = new AxiosThrottler();
    axios.post = function(url, data, config) { return throttler.wrappedPost(url, data, config); };
})();

