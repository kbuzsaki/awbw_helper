const kNameOverrides = {
    8:   "Backspace",
    9:   "Tab",
    13:  "Enter",
    16:  "Shift",
    17:  "Ctrl",
    18:  "Alt",
    19:  "Pause/Break",
    20:  "Caps Lock",
    27:  "Esc",
    32:  "Spacebar",
    33:  "Page Up",
    34:  "Page Down",
    35:  "End",
    36:  "Home",
    37:  "Left Arrow",
    38:  "Up Arrow",
    39:  "Right Arrow",
    40:  "Down Arrow",
    45:  "Insert",
    46:  "Delete",
    91:  "Left Meta",
    92:  "Right Meta[1]",
    93:  "Right Meta[2]",
    96:  "Num 0",
    97:  "Num 1",
    98:  "Num 2",
    99:  "Num 3",
    100: "Num 4",
    101: "Num 5",
    102: "Num 6",
    103: "Num 7",
    104: "Num 8",
    105: "Num 9",
    106: "*",
    107: "+",
    109: "-",
    110: ".",
    112: "F1",
    113: "F2",
    114: "F3",
    115: "F4",
    116: "F5",
    117: "F6",
    118: "F7",
    119: "F8",
    120: "F9",
    121: "F10",
    122: "F11",
    123: "F12",
    144: "Num Lock",
    145: "Scroll Lock",
    186: ";",
    187: "=",
    188: ",",
    189: "-",
    190: ".",
    191: "/",
    192: "`",
    219: "[",
    220: "\\",
    221: "]",
    222: "'",
};
function keyCodeToName(keyCode) {
    keyCode = keyCode+0;
    let override = kNameOverrides[keyCode];
    if (override !== undefined) { return override; }
    let other = String.fromCharCode(keyCode);
    return other;
}

class KeybindListener {
    constructor(modalId) {
        this.keybindOptions = [];
        this.currentOption = undefined;
        this.modalElement = document.getElementById(modalId);
        this.modal = bootstrap.Modal.getOrCreateInstance(this.modalElement);

        this.modalElement.addEventListener("hidden.bs.modal", (event) => {
            this.cancelListen();
        });
        document.getElementById("clear-binding-btn").addEventListener("click", (event) => {
            this.handleClear();
        });

        document.addEventListener("keydown", (event) => {
            if (this.isActive()) {
                this.handleEvent(event);
                event.preventDefault();
                event.stopPropagation();
            }
        });
    }

    addKeybindOption(keybindOption) {
        this.keybindOptions.push(keybindOption);
    }

    isActive() { return this.currentOption !== undefined; }

    handleEvent(event) {
        console.log("Got keyCode:", event.keyCode,
            "(" + keyCodeToName(event.keyCode) + ") for option:", this.currentOption.optionId);

        let currentOption = this.currentOption;
        this.cancelListen();
        currentOption.setKeyCode(event.keyCode);
        for (let keybindOption of this.keybindOptions) {
            if (keybindOption !== currentOption && keybindOption.keyCode() === event.keyCode) {
                keybindOption.clearKeyCode();
            }
        }
    }

    handleClear() {
        let currentOption = this.currentOption;
        this.cancelListen();
        currentOption.clearKeyCode();
    }

    listen(option) {
        this.cancelListen();
        this.currentOption = option;

        let name = this.currentOption.name;
        let currentKey = this.currentOption.input.value || "None";
        let spans = this.modalElement.querySelectorAll(".modal-body span");
        spans[0].innerText = name;
        spans[1].innerText = currentKey;

        this.modal.show();
    }

    cancelListen() {
        if (this.modalElement.classList.contains("show")) {
            this.modal.hide();
        }
        this.currentOption = undefined;
    }
}

class KeybindOption {
    constructor(optionId, name, keybindListener){
        this.optionId = optionId;
        this.name = name;
        this.keybindListener = keybindListener;

        this.input = document.getElementById(this.optionId);
        this.input.addEventListener("click", (event) => { this.onClick(event); });
    }

    keyCode() {
        if (this.input.hasAttribute("rawkeycode")) {
            return parseInt(this.input.getAttribute("rawkeycode"));
        }
        return undefined;
    }

    onClick(event) {
        console.log("clicked:", this.optionId);

        if (this.keybindListener.currentOption === this) {
            this.keybindListener.cancelListen();
        } else {
            this.startListen();
        }
    }

    startListen() {
        this.keybindListener.listen(this);
    }

    setKeyCode(keyCode) {
        this.input.value = keyCodeToName(keyCode);
        this.input.setAttribute("rawkeycode", keyCode);
        this.input.dispatchEvent(new Event("change"));
    }

    clearKeyCode() {
        this.input.value = "";
        this.input.removeAttribute("rawkeycode");
        this.input.dispatchEvent(new Event("change"));
    }
}



function templateDescription(lines) {
    let description = "";
    for (let i = 0; i < lines.length; i++) {
        let padding = (i === (lines.length - 1)) ? 'mb-0' : 'mb-2';
        description += `<p class="${padding}">${lines[i]}</p>`;
    }
    return description;
}

function templateCheckboxOption(mapping) {
    let description = templateDescription(mapping.description);
    let requires = (mapping.requires || []).join(" ");

    return `
<div class="row mb-3">
  <div class="col">
    <div class="form-check">
      <input type="checkbox" class="form-check-input ${requires}" id="${mapping.id}">
      <label for="${mapping.id}" class="form-check-label">${mapping.label}</label>
    </div>
  </div>
  <div class="form-text">${description}</div>
</div>`;
}

function initializeCheckboxOptions() {
    for (let optionMapping of kCheckOptionsMapping) {
        let container = document.getElementById(optionMapping.id + "-container");
        container.innerHTML = DOMPurify.sanitize(templateCheckboxOption(optionMapping));
    }
}

function templateSelectOption(mapping) {
    let description = templateDescription(mapping.description);
    let requires = (mapping.requires || []).join(" ");

    let optionsHtml = "";
    for (let selectOption of mapping.options) {
        optionsHtml += `<option value="${selectOption.value}">${selectOption.label}</option>`;
    }

    return `
<div class="row mb-3">
  <div class="col-xs-6 col-sm-5 col-lg-4">
    <label for="${mapping.id}" class="form-check-label">${mapping.label}</label>
  </div>
  <div class="col">
    <select class="form-select ${requires}" id="${mapping.id}">
    ${optionsHtml}
    </select>
  </div>
  <div class="form-text">${description}</div>
</div>`;

}

function initializeSelectOptions() {
    for (let optionMapping of kSelectOptionsMapping) {
        let container = document.getElementById(optionMapping.id + "-container");
        container.innerHTML = DOMPurify.sanitize(templateSelectOption(optionMapping));
    }
}

function templateRangeOption(mapping) {
    let description = templateDescription(mapping.description);
    let requires = (mapping.requires || []).join(" ");

    return `
<div class="row mb-3">
  <div class="col-sm-4 col-lg-3">
    <label for="${mapping.id}" class="form-label">${mapping.label}</label>
  </div>
  <div class="col-sm-2 col-xl-1">
      <input type="text" readonly class="form-control" id="${mapping.previewId}" value="${mapping.default}">
  </div>
  <div class="col">
    <input type="range" id="${mapping.id}" class="form-range ${requires}"
           min="${mapping.min}" max="${mapping.max}" step="${mapping.step}">
  </div>
  <div class="form-text">${description}</div>
</div>
    `;
}

function initializeRangeOptions() {
    for (let optionMapping of kRangeOptionsMapping) {
        let container = document.getElementById(optionMapping.id + "-container");
        container.innerHTML = DOMPurify.sanitize(templateRangeOption(optionMapping));

        let inputElement = document.getElementById(optionMapping.id);
        let previewElement = document.getElementById(optionMapping.previewId);
        if (inputElement && previewElement) {
            inputElement.addEventListener("input", () => {
                previewElement.value = inputElement.value;
            });
        }
        previewElement.value = inputElement.value;
    }
}

const kMaxKeyboardBindings = 4;
function templateKeyboardOption(mapping) {
    let description = templateDescription(mapping.description);
    let bindingHtml = "";
    for (let i = 1; i <= kMaxKeyboardBindings; i++) {
        bindingHtml += `
<div class="col">
  <input type="text" readonly class="form-control" id="${mapping.id}-${i}">
</div>`;
    }

    return `
<div class="row mb-3">
  <label class="col-sm-3 col-lg-2 col-form-label">${mapping.label}</label>
  ${bindingHtml}
  <div class="form-text">${description}</div>
</div>`;
}

function initializeKeyboardOptions() {
    let keybindListener = new KeybindListener("keybinding-modal");
    for (let optionMapping of kKeyboardOptionsMapping) {
        let container = document.getElementById(optionMapping.id + "-container");
        container.innerHTML = DOMPurify.sanitize(templateKeyboardOption(optionMapping));

        for (let i = 1; i <= kMaxKeyboardBindings; i++) {
            let inputId = optionMapping.id + "-" + i;
            keybindListener.addKeybindOption(new KeybindOption(inputId, optionMapping.label, keybindListener));
        }
    }
}

function setOptionsOnPage(options) {
    console.log("Setting options:", options);
    for (let optionMapping of kCheckOptionsMapping) {
        if (options.hasOwnProperty(optionMapping.name)) {
            let inputElement = document.getElementById(optionMapping.id);
            if (inputElement) {
                inputElement.checked = options[optionMapping.name];
            }
        }
    }

    for (let optionMapping of kSelectOptionsMapping) {
        if (options.hasOwnProperty(optionMapping.name)) {
            let inputElement = document.getElementById(optionMapping.id);
            if (inputElement) {
                inputElement.value = options[optionMapping.name];
            }
        }
    }

    for (let optionMapping of kRangeOptionsMapping) {
        if (options.hasOwnProperty(optionMapping.name)) {
            let inputElement = document.getElementById(optionMapping.id);
            if (inputElement) {
                inputElement.value = options[optionMapping.name];
            }
            let previewElement = document.getElementById(optionMapping.previewId);
            if (previewElement) {
                previewElement.value = options[optionMapping.name];
            }
        }
    }

    for (let optionMapping of kKeyboardOptionsMapping) {
        if (options.hasOwnProperty(optionMapping.name)) {
            let bindings = options[optionMapping.name];
            for (let i = 0; i < kMaxKeyboardBindings; i++) {
                let inputElement = document.getElementById(optionMapping.id + "-" + (i + 1));
                if (inputElement) {
                    if (i < bindings.length) {
                        inputElement.value = keyCodeToName(bindings[i]);
                        inputElement.setAttribute("rawkeycode", bindings[i]);
                    } else {
                        inputElement.value = "";
                        inputElement.removeAttribute("rawkeycode");
                    }
                }
            }
        }
    }
}

function parseOptionsFromPage() {
    let parsedOptions = {};

    for (let optionMapping of kCheckOptionsMapping) {
        let inputElement = document.getElementById(optionMapping.id);
        if (inputElement) {
            parsedOptions[optionMapping.name] = inputElement.checked;
        }
    }

    for (let optionMapping of kSelectOptionsMapping) {
        let inputElement = document.getElementById(optionMapping.id);
        if (inputElement) {
            parsedOptions[optionMapping.name] = inputElement.value;
        }
    }

    for (let optionMapping of kRangeOptionsMapping) {
        let inputElement = document.getElementById(optionMapping.id);
        if (inputElement) {
            parsedOptions[optionMapping.name] = parseFloat(inputElement.value);
        }
    }

    for (let optionMapping of kKeyboardOptionsMapping) {
        let bindings = [];
        for (let i = 0; i < kMaxKeyboardBindings; i++) {
            let inputElement = document.getElementById(optionMapping.id + "-" + (i + 1));
            if (inputElement) {
                if (inputElement.hasAttribute("rawkeycode")) {
                    bindings.push(parseInt(inputElement.getAttribute("rawkeycode")));
                }
            }
        }
        parsedOptions[optionMapping.name] = bindings;
    }

    return parsedOptions;
}

initializeCheckboxOptions();
initializeSelectOptions();
initializeRangeOptions();
initializeKeyboardOptions();

chrome.storage.sync.get(kOptionDefaults, (result) => {
    setOptionsOnPage(result);

    let isFirefox = chrome.runtime.getManifest().browser_specific_settings?.hasOwnProperty("gecko");
    console.log("is firefox:", isFirefox);
    if (isFirefox) {
        let chromeOnlyOptions = document.getElementsByClassName("js-requires-chrome");
        for (let childOption of chromeOnlyOptions) {
            childOption.disabled = true;
        }
    }

    // TODO: generalize this
    let moveplannerPlusChildOptions = document.getElementsByClassName("js-requires-moveplanner-plus");
    for (let childOption of moveplannerPlusChildOptions) {
        childOption.disabled = !result.options_enable_moveplanner_plus;
    }

    let speedyEventPanelChildOptions = document.getElementsByClassName("js-requires-speedy-event-panel");
    for (let childOption of speedyEventPanelChildOptions) {
        childOption.disabled = !result.options_enable_speedy_event_panel;
    }

    let onChangeHandler = () => {
        let parsedOptions = parseOptionsFromPage();
        console.log("Updating options:", parsedOptions);
        chrome.storage.sync.set(parsedOptions);

        let moveplannerPlusDisabled = !parsedOptions.options_enable_moveplanner_plus;
        for (let childOption of moveplannerPlusChildOptions) {
            childOption.disabled = moveplannerPlusDisabled;
        }

        let speedyEventPanelDisabled = !parsedOptions.options_enable_speedy_event_panel;
        for (let childOption of speedyEventPanelChildOptions) {
            childOption.disabled = speedyEventPanelDisabled;
        }
    };

    for (let input of document.querySelectorAll("input")) {
        input.addEventListener("change", onChangeHandler);
    }
    for (let select of document.querySelectorAll("select")) {
        select.addEventListener("change", onChangeHandler);
    }

    let resetDefaultsBtn = document.getElementById("reset-defaults-btn");
    resetDefaultsBtn.addEventListener("click", (event) => {
        chrome.storage.sync.set(kOptionDefaults, () => {
            setOptionsOnPage(kOptionDefaults);
            inputs[0].dispatchEvent(new Event("change"));
        });
    });

    let form = document.getElementById("optionsForm");
    form.classList.remove("d-none");
});
