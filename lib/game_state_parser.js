function parseIdFromResourceUrl(url) {
    let filename = url.split("/").at(-1);
    let filenameWithoutExtension = filename.substring(0, filename.lastIndexOf("."));
    let decoded = decodeURIComponent(filenameWithoutExtension);
    return decoded.replace(" ", "");
}

function parseBaseUrlFromResourceUrl(url) {
    let lastSeparatorIndex = url.lastIndexOf("/");
    return url.substring(0, lastSeparatorIndex);
}

const kSpecialNeutralTiles = [
  "missilesilo",
  "missilesiloempty",
  "hpiperubble",
  "hpipeseam",
  "vpiperubble",
  "vpipeseam",
  "hpipe",
  "vpipe",
  "nepipe",
  "espipe",
  "swpipe",
  "wnpipe",
  "epipeend",
  "npipeend",
  "spipeend",
  "wpipeend",
];
function parseCountryFromId(id) {
    // Waited units have the "gs_" prefix on their images?
    let is_waited = false;
    if (id.startsWith("gs_")) {
        is_waited = true;
        id = id.substr(3);
    }

    if (id.endsWith("_snow")) {
        id = id.substr(0, id.length - 5);
    }
    if (id.endsWith("_rain")) {
        id = id.substr(0, id.length - 5);
    }

    // Special "property" tiles don't have a country
    if (kSpecialNeutralTiles.indexOf(id) !== -1) {
        let country = kCountries[0];
        let remainder = id;
        return {is_waited, country, remainder};
    }

    for (let country of kCountries) {
        if (id.startsWith(country.code)) {
            let remainder = id.substr(country.code.length);
            return {is_waited, country, remainder};
        } else if (id.startsWith(country.flatName)) {
            let remainder = id.substr(country.flatName.length);
            return {is_waited, country, remainder};
        }
    }

    reportError("Failed to parse country from id: ", id);
    let country = kCountries[0];
    let remainder = id;
    return {is_waited, country, remainder};
}

function parseEntityImages(element) {
    let images = element.getElementsByTagName("img");
    let srcs = [];
    for (let image of images) {
        srcs.push(image.src);
    }
    return srcs;
}

function parseCoordinatesFromPropertySpan(span) {
    // Round coordinates because they can sometimes be offset 1 pixel
    return {
        x: Math.round(span.offsetLeft / 16),
        // HQ images cover the square above them too, so compute the "lower square" by offsetting from the bottom
        y: Math.round(parseInt(span.offsetTop + span.offsetHeight - 16) / 16)
    };
}

function parseCoordinatesFromUnitSpan(span) {
    // Round coordinates because they can sometimes be offset 1 pixel
    return {
        x: Math.round(span.offsetLeft / 16),
        y: Math.round(span.offsetTop / 16)
    };
}

class Property {
    // TODO: stop holding a reference to the actual element here and in Unit
    constructor(element, country, tile, coords) {
        this.element = element;
        this.country = country;
        this.tile = tile;
        this.coords = coords;
    }

    // TODO: get coordinates
    static fromElement(element) {
        let srcs = parseEntityImages(element);

        let id = parseIdFromResourceUrl(srcs[0]);
        let {country, remainder} = parseCountryFromId(id);

        let coords = parseCoordinatesFromPropertySpan(element);

        return new Property(element, country, remainder, coords);
    }

    producesIncome() {
        return ["hq", "city", "base", "airport", "port"].indexOf(this.tile) !== -1;
    }

    isTower() {
        return ["comtower"].indexOf(this.tile) !== -1;
    }
}

class Unit {
    constructor(element, country, unit, coords, hp, is_waited, others) {
        this.id = element.id.split("_")[1];
        this.element = element;
        this.country = country;
        this.coords = coords;
        this.unit = unit;
        this.is_waited = is_waited;
        this.hp = hp;
        this.others = others;
        this.is_capture = false;
        for (let other of others) {
            if (other === "capture" || other === "gs_capture") {
                this.is_capture = true;
            }
        }
    }

    static fromElement(element) {
        let srcs = parseEntityImages(element);

        // assume that the first src is the unit itself
        let id = parseIdFromResourceUrl(srcs[0]);
        let {is_waited, country, remainder} = parseCountryFromId(id);

        let coords = parseCoordinatesFromUnitSpan(element);

        let hp = "";
        let others = [];
        for (let src of srcs.slice(1)) {
            let id = parseIdFromResourceUrl(src);
            if (id == "?" || !isNaN(id)) {
                hp = id;
            } else {
                others.push(id);
            }
        }

        return new Unit(element, country, remainder, coords, hp, is_waited, others);
    }

    unitData() {
        return kUnitsByName[this.unit];
    }

    unitValue() {
        return this.unitData().cost * (parseInt(this.hp) / 10);
    }
}

class GameStateParser {
    constructor(gamemap) {
        this.gamemap = gamemap;
        this.listeners = [];
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    handleMapUpdate() {
        let mapEntities = this.parseMapEntities();
        for (let listener of this.listeners) {
            listener(mapEntities);
        }
    }

    parseMapEntities() {
        function isPropertyElement(element) {
            return element.id?.startsWith("building")
                || element.classList?.contains("game-building");
        }
        function isUnitElement(element) {
            return element.id?.startsWith("unit")
                || element.classList?.contains("game-unit");
        }

        let mapEntities = {
            properties: [],
            units: [],
            weather: kWeatherClear,
        };

        let mapImage = document.getElementById("map-background");
        if (mapImage) {
            let mapId = parseIdFromResourceUrl(mapImage.src);
            if (mapId.startsWith("R")) {
                mapEntities.weather = kWeatherRain;
            } else if (mapId.startsWith("S")) {
                mapEntities.weather = kWeatherSnow;
            }
        }

        let dynamicElements = this.gamemap.getElementsByTagName("span");
        for (let element of dynamicElements) {
            if (isPropertyElement(element)) {
                mapEntities.properties.push(Property.fromElement(element));
                if (!mapEntities.baseUrl) {
                    let url = element.firstChild.src;
                    if (url) {
                        mapEntities.baseUrl = parseBaseUrlFromResourceUrl(url);
                    }
                }
            } else if (isUnitElement(element)) {
                mapEntities.units.push(Unit.fromElement(element));
            }
        }


        return mapEntities;
    }
}
