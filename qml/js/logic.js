.pragma library
// Pure shopping list logic: input parsing, merging quantities, suggestions and ordering.
// No QML or database dependencies, so it is tested with Node (tests/).
//
// NOTE: Sailfish OS 5.2 ships Qt 5.6, whose JavaScript engine is ES5. No let/const,
// arrow functions, template strings or classes — tests/test_es5.js guards this.

// Recognised units. The Finnish ones (kpl = pieces, pkt = packet, prk = tub, pss = bag,
// tlk = can, rs = box, plo = bottle) are what the app was first written for.
var UNITS = ["kg", "g", "l", "dl", "cl", "ml", "kpl", "pkt", "prk", "pss", "tlk", "rs", "plo",
             "pcs", "oz", "lb"];

var _UNIT = "(" + UNITS.join("|") + ")";
var _NUMBER = "(\\d+(?:[.,]\\d+)?)";
var _LEADING = new RegExp("^" + _NUMBER + "\\s*(?:" + _UNIT + "\\.?)?\\s+(.+)$", "i");
var _TRAILING = new RegExp("^(.+?)\\s+" + _NUMBER + "\\s*(?:" + _UNIT + "\\.?)?$", "i");
// "Milk 3 + 2 skimmed": at least two parts starting with a digit, separated by plus signs →
// the whole tail is the user's own notation and is kept as the quantity verbatim.
var _PLUSES = /^(.+?)\s+(\d[^+]*(?:\+\s*\d[^+]*)+)$/;
// The space before x is required: otherwise "Box 2" would parse as the name "Bo".
var _TIMES = /^(.+?)\s+[x×]\s*(\d+)$/i;

function clean(text) {
    return String(text === undefined || text === null ? "" : text)
        .replace(/\s+/g, " ").replace(/^ | $/g, "");
}

function normalize(name) {
    return clean(name).toLowerCase();
}

function _quantity(number, unit) {
    return unit ? number + " " + unit.toLowerCase() : number;
}

// "2 milk" / "milk 2 l" / "eggs x2" → {name, quantity}; empty input → null.
// The quantity is free text ("2", "1,5 l") because it is only displayed and merged.
function parse(input) {
    var s = clean(input);
    if (s === "")
        return null;
    var m = _PLUSES.exec(s);
    if (m)
        return { name: m[1], quantity: clean(m[2]).replace(/\s*\+\s*/g, " + ") };
    m = _TIMES.exec(s);
    if (m)
        return { name: m[1], quantity: m[2] };
    m = _LEADING.exec(s);
    // "1 % milk": the percentage belongs to the name, it is not a quantity.
    if (m && m[3].charAt(0) !== "%")
        return { name: m[3], quantity: _quantity(m[1], m[2]) };
    m = _TRAILING.exec(s);
    if (m)
        return { name: m[1], quantity: _quantity(m[2], m[3]) };
    return { name: s, quantity: "" };
}

function _splitQuantity(quantity) {
    var m = /^(\d+(?:[.,]\d+)?)(?: (\S+))?$/.exec(clean(quantity));
    if (!m)
        return null;
    return { number: parseFloat(m[1].replace(",", ".")), comma: m[1].indexOf(",") >= 0,
             unit: (m[2] || "").toLowerCase() };
}

// The same item is added again: equal units are summed, otherwise the notations are
// chained with a plus ("3 + 2 skimmed" and "1" → "3 + 2 skimmed + 1") so nothing is lost.
function mergeQuantities(old, added) {
    old = clean(old);
    added = clean(added);
    if (added === "")
        return old;
    if (old === "")
        return added;
    var a = _splitQuantity(old), b = _splitQuantity(added);
    if (!a || !b || a.unit !== b.unit)
        return old + " + " + added;
    var sum = String(Math.round((a.number + b.number) * 1000) / 1000);
    if (a.comma || b.comma)
        sum = sum.replace(".", ",");
    return _quantity(sum, b.unit);
}

// history: [{name, times, lastUsed}], onList: {key: true} (items not yet collected).
// Matches at the start of the whole name first, then matches at the start of a word;
// within each, the most often and most recently bought first.
function suggestions(history, prefix, onList, n) {
    var p = normalize(prefix);
    if (p === "")
        return [];
    var hits = [];
    for (var i = 0; i < history.length; ++i) {
        var h = history[i];
        var key = normalize(h.name);
        // The exactly typed name is not a suggestion: tapping has already filled it in.
        if ((onList && onList[key]) || key === p)
            continue;
        var rank = -1;
        if (key.indexOf(p) === 0)
            rank = 0;
        else if ((" " + key).indexOf(" " + p) >= 0)
            rank = 1;
        if (rank >= 0)
            hits.push({ h: h, rank: rank });
    }
    hits.sort(function (x, y) {
        return (x.rank - y.rank) || (y.h.times - x.h.times) || (y.h.lastUsed - x.h.lastUsed)
            || (normalize(x.h.name) < normalize(y.h.name) ? -1 : 1);
    });
    var result = [];
    for (var j = 0; j < hits.length && j < (n || 5); ++j)
        result.push(hits[j].h.name);
    return result;
}

// Tapping a suggestion fills the field with the name and a space, so the quantity can be
// typed after it ("Onion " → "Onion 3"). A quantity already typed moves after the name.
function fillText(name, quantity) {
    var q = clean(quantity);
    return clean(name) + " " + (q ? q + " " : "");
}

// Body of the watch notification: items to buy one per line, quantity after the name.
function watchText(items) {
    var lines = [];
    for (var i = 0; i < items.length; ++i) {
        var q = clean(items[i].quantity);
        lines.push(clean(items[i].name) + (q ? " " + q : ""));
    }
    return lines.join("\n");
}

// Items to buy on top in the user's order (position, then order of adding),
// collected items below, most recently collected first.
function sortItems(items) {
    var copy = items.slice();
    copy.sort(function (x, y) {
        var xc = x.collected ? 1 : 0, yc = y.collected ? 1 : 0;
        if (xc !== yc)
            return xc - yc;
        if (xc)
            return (y.collected - x.collected) || (y.id - x.id);
        return ((x.position || 0) - (y.position || 0)) || (x.added - y.added) || (x.id - y.id);
    });
    return copy;
}
