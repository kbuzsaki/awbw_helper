OptionsReader.instance().onOptionsReady((options) => {
    if (!options.options_enable_rate_limit_workaround) {
        console.log("Rate limit workaround disabled.");
        return;
    }
    console.log("Rate limit workaround enabled.");

    function injectRequestedScripts(options, done) {
        let scripts = [];
        scripts.push("/res/axios_throttler.js");
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

    injectRequestedScripts(options, () => {});
});
