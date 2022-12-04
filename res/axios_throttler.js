(function(){
    let oldPost = axios.post;

    class AxiosThrottler {
        constructor() {
            this.debug = false;
            this.requestCache = new Map();
            // Minimum interval between "throttled" requests
            this.throttleMs = 10 * 1000;
            // Interval between retries for retriable requests
            this.retryBackoffMs = 2 * 1000;
            // Maxmimum number of *additional* retries for retriable requests
            this.maxRetries = 2;
        }

        // Only throttle specific request types so that we don't accidentally break the
        // game state by returning incorrect information.
        isCacheableRequest(req) {
            let currentUrlParams = new URLSearchParams(window.location.search);
            let inReplayMode = currentUrlParams.has("ndx");
            return inReplayMode && req.url === "api/game/fetch_game_activity_date.php";
        }

        // Only retry specific request types so that we don't accidentally retry
        // destructive operations.
        isRetriableRequest(req) {
            return req.url === "api/game/load_replay.php";
        }

        // Fulfill the request with cache-based "throttling" of duplicate requests within
        // the throttle interval. This can return data that is up to throttleMs stale.
        // Behavior is to:
        // 1. always allow requests if they:
        //     a. haven't been seen before (aren't in the cache)
        //     b. have a cache entry that is stale (older than throttleMs)
        // 2. return the cached value if the request was last made within throttleMs
        // 3. coalesce concurrent requests onto a single outgoing request
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

            // Store the promise in the cache, not the value, so that concurrent requests
            // will all block on a single outgoing request, rather than concurrently making requests
            // and fighting over who can write to the cache.
            let promise = oldPost(req.url, req.data, req.config);
            this.requestCache.set(key, {promise: promise, timeMs: Date.now()});
            return promise.then((res) => {
                if (this.debug) console.log("Newly cached promise for:", key, "got value:", res);
                return res;
            });
        }

        // Fulfill the request with a limited backoff and retry loop on 503 errors.
        doWithRetriesInternal(req, retriesRemaining) {
            if (this.debug) console.log("Doing retriable request", req.url, "with retries left", retriesRemaining);
            return oldPost(req.url, req.data, req.config).catch((res) => {
                let wasRateLimited = res.response.status === 503;
                let shouldRetry = wasRateLimited && retriesRemaining > 0;

                if (shouldRetry) {
                    console.log("Retriable request", req.url, "was 503'd! Retrying with backoff:",
                                this.retryBackoffMs, "and", retriesRemaining, "retries remaining.");
                    return new Promise((resolve, reject) => {
                        setTimeout(() => {
                            console.log("Retrying 503'd request for", req.url);
                            this.doWithRetriesInternal(req, retriesRemaining - 1).then(resolve).catch(reject);
                        }, this.retryBackoffMs);
                    });
                } else if (wasRateLimited) {
                    console.log("Retriable request", req.url, "was 503'd and has no more retries!");
                    throw res;
                } else {
                    console.log("Retriable request", req.url, "hit an unexpected error!", res.response);
                    throw res;
                }
            });
        }

        doWithRetries(req) {
            return this.doWithRetriesInternal(req, this.maxRetries);
        }

        // Monkey patch axios.post to implement two pieces of functionality:
        // 1. throttle known noisy requests to avoid hitting the rate limit.
        // 2. if we do hit the rate limit for important retriable requests, retry them
        wrappedPost(url, data, config) {
            let req = {url: url, data: data, config: config};

            if (this.isCacheableRequest(req)) {
                return this.doWithCacheThrottling(req);
            } else if (this.isRetriableRequest(req)) {
                return this.doWithRetries(req);
            }

            return oldPost(url, data, config);
        }
    }

    let throttler = new AxiosThrottler();
    axios.post = function(url, data, config) { return throttler.wrappedPost(url, data, config); };
})();

