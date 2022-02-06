class CursorTracker {
    constructor(options) {
        this.cursor = document.getElementById("cursor");
        this.listeners = [];
        this.quickMovePreviewBindings = options.options_bindings_hold_quick_move_range_preview;
        this.quickAttackRangePreviewBindings = options.options_bindings_hold_quick_attack_range_preview;
        this.heldKeys = {};
        this.coords = {x: 0, y: 0};

        let observer = new MutationObserver(this.onCursorMutation.bind(this));
        observer.observe(this.cursor, {attributes: true});

        document.addEventListener("keydown", this.onKeyDown.bind(this));
        document.addEventListener("keyup", this.onKeyUp.bind(this));
        window.addEventListener("blur", this.onTabBlur.bind(this));
    }

    addCursorUpdateListener(listener) {
        this.listeners.push(listener);
    }

    getCursorCoords() {
        let top_offset = this.cursor.style.top.substr(0, this.cursor.style.top.length - 2);
        let left_offset = this.cursor.style.left.substr(0, this.cursor.style.left.length - 2);
        return {
            x: Math.round((parseInt(left_offset) + 5) / 16),
            y: Math.round((parseInt(top_offset) + 5) / 16),
        };
    }

    onCursorMutation() {
        this.coords = this.getCursorCoords();
        this.updateListeners();
    }

    // TODO: factor this out into a generic keyboard listener?
    onKeyDown(event) {
        let code = event.keyCode;
        if (!this.quickMovePreviewBindings.includes(code)
         && !this.quickAttackRangePreviewBindings.includes(code)) {
            return;
        }

        this.heldKeys[code] = true;
        this.updateListeners();
    }

    onKeyUp(event) {
        let code = event.keyCode;
        if (!this.quickMovePreviewBindings.includes(code)
         && !this.quickAttackRangePreviewBindings.includes(code)) {
            return;
        }

        delete this.heldKeys[code];
        this.updateListeners();
    }

    onTabBlur(event) {
        this.heldKeys = {};
        this.updateListeners();
    }

    updateListeners() {
        let isQuickMoveRange = Object.keys(this.heldKeys).some(
            (code) => this.quickMovePreviewBindings.includes(parseInt(code)));
        let isQuickAttackRange = Object.keys(this.heldKeys).some(
            (code) => this.quickAttackRangePreviewBindings.includes(parseInt(code)));

        let data = {
            coords: this.coords,
            infoMode: isQuickMoveRange || isQuickAttackRange,
            isQuickMoveRange,
            isQuickAttackRange,
        };

        for (let listener of this.listeners) {
            listener(data);
        }
    }
}
