const kReplayVisualizerContainerHtml = `
<div class="awbwenhancements-replay-visualizer">
    Loading replay...
</div>
`;

function makeReplayVisualizerContainer() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kReplayVisualizerContainerHtml;
    return tempNode.children[0];
}

class ReplayVisualizer {
    constructor() {
        this.content = makeReplayVisualizerContainer();
    }

    getContent() {
        return this.content;
    }

    setReplayState(replayState) {
        this.content.innerText = "Loaded replay with " + replayState.length + " turns!";
    }
}
