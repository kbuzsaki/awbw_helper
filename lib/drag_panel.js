const kDragPanelHtml = `
<div class="awbwenhancements-panel awbwenhancements-hidden">
    <header class="awbwenhancements-grab-header">
        Replay Analysis
        <div class="reverse-info-box calculator-help">
        ?
        <span class="info-box-text">No help text.</span>
        </div>
        <span class="awbwenhancements-close-panel">✕</span>
    </header>
    <div class="awbwenhancements-panel-content">
    </div>
</div>`;

function makeDragPanelElement() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kDragPanelHtml;
    return tempNode.children[0];
}

class DragPanel {
    constructor(id) {
        this.panel = makeDragPanelElement();
        this.panel.id = id;
        document.body.appendChild(this.panel);

        this.grabHeader = this.panel.querySelector(".awbwenhancements-grab-header");
        this.grabHeader.addEventListener("mousedown", this.onStartGrab.bind(this));
        window.addEventListener("mouseup", this.onStopGrab.bind(this));
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.grabbing = false;
        this.setCoordinates(200, 200);

        this.panel.querySelector(".awbwenhancements-close-panel").addEventListener("click", () => {
            this.setVisible(false);
        });

        this.panelContent = this.panel.querySelector(".awbwenhancements-panel-content");
    }

    setContent(content) {
        while (this.panelContent.firstChild) {
            this.panelContent.removeChild(this.panelContent.firstChild);
        }
        this.panelContent.appendChild(content);
    }

    setVisible(visible) {
        if (visible) {
            this.panel.classList.remove("awbwenhancements-hidden");
        } else {
            this.panel.classList.add("awbwenhancements-hidden");
        }
    }

    toggleVisible() {
        this.panel.classList.toggle("awbwenhancements-hidden");
    }

    setCoordinates(x, y) {
        this.panelX = x;
        this.panelY = y;
        this.panel.style.top = y + "px";
        this.panel.style.left = x + "px";
    }

    onStartGrab(event) {
        if (event.target === this.grabHeader) {
            this.grabHeader.classList.add("awbwenhancements-grabbing");
            this.grabbing = true;
        }
        this.cursorOffsetX = event.pageX - this.panelX;
        this.cursorOffsetY = event.pageY - this.panelY;
    }

    onStopGrab(event) {
        this.grabHeader.classList.remove("awbwenhancements-grabbing");
        this.grabbing = false;
    }

    onMouseMove(event) {
        if (this.grabbing) {
            this.setCoordinates(event.pageX - this.cursorOffsetX, event.pageY - this.cursorOffsetY);
        }
    }
}
