function templateCoSelectPanel(gameInfo, selectedCo) {
    let coTableContents = `<div class="co-menu awbwenhancements-co-menu">`;
    for (let coName of kCoNaturalNationOrder) {
        let co = kCosByName[coName];
        let coNameSlug = co.name.toLowerCase().replace(" ", "");
        coTableContents += `<img class="js-co" value="${co.name}" src="${gameInfo.portraitsPrefix}${coNameSlug}.png">`;
    }
    coTableContents += `</div>`;
    return coTableContents;
}

class CoSelectPanel {
    constructor(parentPanel, gameInfo) {
        this.parentPanel = parentPanel;
        this.gameInfo = gameInfo;

        this.panel = document.createElement("div");
        this.panel.classList.add("awbwenhancements-co-menu-container");
        this.panel.style.visibility = "hidden";
        this.hidden = true;
        parentPanel.appendChild(this.panel);

        this.selectCallback = undefined;
    }

    generateHtml() {
        return templateCoSelectPanel(this.gameInfo, this.selectedCo);
    }

    updateHtml() {
        this.panel.innerHTML = DOMPurify.sanitize(this.generateHtml());

        let cos = this.panel.getElementsByClassName("js-co");
        for (let co of cos) {
            co.addEventListener("click", (event) => {
                this.onCoClick(co.getAttribute("value"));
            });
        }
    }

    setCoPortraitsPrefix(portraitsPrefix) {
        this.gameInfo.portraitsPrefix = portraitsPrefix;
        this.updateHtml();
    }

    openPanel(targetRect, selectCallback) {
        let parentRect = this.parentPanel.getBoundingClientRect();

        let x = targetRect.x - parentRect.x;
        let y = targetRect.bottom - parentRect.y;

        this.panel.style.top = y + "px";
        this.panel.style.left = x + "px";

        this.selectCallback = selectCallback;
        this.updateHtml();
        this.showPanel();
    }

    showPanel() {
        this.panel.style.visibility = "visible";
        this.hidden = false;
    }

    hidePanel() {
        this.panel.style.visibility = "hidden";
        this.hidden = true;
    }

    onCoClick(coName) {
        console.log("Co select panel clicked:", coName);
        if (this.selectCallback) {
            this.selectCallback(coName);
        }
        this.hidePanel();
    }
}

