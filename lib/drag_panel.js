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

const kDragPanelBaseZIndex = 800;

function makeDragPanelElement() {
    let tempNode = document.createElement("div");
    tempNode.innerHTML = kDragPanelHtml;
    return tempNode.children[0];
}

class DragPanel {
    constructor(onClose, bringToFront) {
        this.panel = makeDragPanelElement();
        this.onClose = onClose;
        this.grabbing = false;
        this.setCoordinates(200, 200);

        this.grabHeader = this.panel.querySelector(".awbwenhancements-grab-header");
        this.panelContent = this.panel.querySelector(".awbwenhancements-panel-content");
        this.closeButton = this.panel.querySelector(".awbwenhancements-close-panel");

        let onMouseDownAnywhere = () => { bringToFront(this); };
        let onMouseDownHeader = this.onStartGrab.bind(this);
        let onMouseUp = this.onStopGrab.bind(this);
        let onMouseMove = this.onMouseMove.bind(this);
        let onClickClose = this.closePanel.bind(this);

        this.panel.addEventListener("mousedown", onMouseDownAnywhere);
        this.grabHeader.addEventListener("mousedown", onMouseDownHeader);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("mousemove", onMouseMove);
        this.closeButton.addEventListener("click", onClickClose);

        this.unregisterListeners = () => {
            this.panel.removeEventListener("mousedown", onMouseDownAnywhere);
            this.grabHeader.removeEventListener("mousedown", onMouseDownHeader);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("mousemove", onMouseMove);
            this.closeButton.removeEventListener("click", onClickClose);
        };

        document.body.appendChild(this.panel);
    }

    closePanel() {
        if (this.onClose) {
            this.onClose(this);
        } else {
            this.setVisible(false);
        }
    }

    remove() {
        this.unregisterListeners();
        this.panel.remove();
    }

    setContent(content) {
        while (this.panelContent.firstChild) {
            this.panelContent.removeChild(this.panelContent.firstChild);
        }
        this.panelContent.appendChild(content);
    }

    getVisible() {
        return !this.panel.classList.contains("awbwenhancements-hidden");
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

    setZIndexOffset(offset) {
        this.panel.style.zIndex = kDragPanelBaseZIndex + offset;
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
