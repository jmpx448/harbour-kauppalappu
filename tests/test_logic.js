"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { load } = require("./load");

const L = load("logic.js");
// Objects from the vm context come from another realm → compare as JSON.
const j = (x) => JSON.parse(JSON.stringify(x));

test("parse: name only and empty input", () => {
    assert.deepEqual(j(L.parse("  Milk  ")), { name: "Milk", quantity: "" });
    assert.equal(L.parse("   "), null);
    assert.equal(L.parse(""), null);
    assert.equal(L.parse(undefined), null);
});

test("parse: quantity first, last and with a times sign", () => {
    assert.deepEqual(j(L.parse("2 milk")), { name: "milk", quantity: "2" });
    assert.deepEqual(j(L.parse("500 g minced meat")), { name: "minced meat", quantity: "500 g" });
    assert.deepEqual(j(L.parse("2kpl banaaneja")), { name: "banaaneja", quantity: "2 kpl" });
    assert.deepEqual(j(L.parse("Pepsi Max 1,5 l")), { name: "Pepsi Max", quantity: "1,5 l" });
    assert.deepEqual(j(L.parse("Water 0.5L")), { name: "Water", quantity: "0.5 l" });
    assert.deepEqual(j(L.parse("eggs x2")), { name: "eggs", quantity: "2" });
    assert.deepEqual(j(L.parse("Apple 6")), { name: "Apple", quantity: "6" });
    assert.deepEqual(j(L.parse("3 pcs lemons")), { name: "lemons", quantity: "3 pcs" });
    assert.deepEqual(j(L.parse("2 lb flour")), { name: "flour", quantity: "2 lb" });
});

test("parse: parts separated by plus signs are kept as the quantity verbatim", () => {
    assert.deepEqual(j(L.parse("Maito 3 + 2sin")), { name: "Maito", quantity: "3 + 2sin" });
    assert.deepEqual(j(L.parse("Milk 3+2")), { name: "Milk", quantity: "3 + 2" });
    assert.deepEqual(j(L.parse("Yoghurt 2 strawberry + 1 vanilla")),
                     { name: "Yoghurt", quantity: "2 strawberry + 1 vanilla" });
    assert.deepEqual(j(L.parse("Coffee 2 + 1 + 1")), { name: "Coffee", quantity: "2 + 1 + 1" });
    // A plus without a number in the latter part is not a quantity notation.
    assert.deepEqual(j(L.parse("Detergent 2 + softener")), { name: "Detergent 2 + softener", quantity: "" });
    assert.deepEqual(j(L.parse("Disney+ 2")), { name: "Disney+", quantity: "2" });
});

test("parse: numbers that belong to the name", () => {
    assert.deepEqual(j(L.parse("1 % milk")), { name: "1 % milk", quantity: "" });
    assert.deepEqual(j(L.parse("7up")), { name: "7up", quantity: "" });
    // "Box 2": without the required space the x pattern would give the name "Bo".
    assert.deepEqual(j(L.parse("Box 2")), { name: "Box", quantity: "2" });
    // "2 lohta" / "2 lemons": the l unit must not eat the start of a word.
    assert.deepEqual(j(L.parse("2 lohta")), { name: "lohta", quantity: "2" });
    assert.deepEqual(j(L.parse("2 lemons")), { name: "lemons", quantity: "2" });
    assert.deepEqual(j(L.parse("3 grillimakkaraa")), { name: "grillimakkaraa", quantity: "3" });
});

test("normalize: case and spaces, non-ASCII letters are kept", () => {
    assert.equal(L.normalize("  Ruis   LEIPÄ "), "ruis leipä");
    assert.equal(L.normalize("ÄÖÅ"), "äöå");
});

test("mergeQuantities", () => {
    assert.equal(L.mergeQuantities("", ""), "");
    assert.equal(L.mergeQuantities("2", ""), "2");
    assert.equal(L.mergeQuantities("", "3"), "3");
    assert.equal(L.mergeQuantities("2", "3"), "5");
    assert.equal(L.mergeQuantities("1,5 l", "1 l"), "2,5 l");
    assert.equal(L.mergeQuantities("0.1 kg", "0.2 kg"), "0.3 kg");
    // Different units or free text: chained, nothing is lost.
    assert.equal(L.mergeQuantities("500 g", "1 kg"), "500 g + 1 kg");
    assert.equal(L.mergeQuantities("big bag", "2"), "big bag + 2");
    assert.equal(L.mergeQuantities("3 + 2sin", "1"), "3 + 2sin + 1");
});

test("suggestions: start matches first, then most often and most recently bought", () => {
    const h = [
        { name: "Milk", times: 5, lastUsed: 100 },
        { name: "Milkshake", times: 9, lastUsed: 50 },
        { name: "Oat milk", times: 20, lastUsed: 10 },
        { name: "Mint", times: 1, lastUsed: 999 },
        { name: "Cheese", times: 30, lastUsed: 1 },
    ];
    assert.deepEqual(j(L.suggestions(h, "mil", {}, 5)), ["Milkshake", "Milk", "Oat milk"]);
    assert.deepEqual(j(L.suggestions(h, "MI", {}, 2)), ["Milkshake", "Milk"]);
    assert.deepEqual(j(L.suggestions(h, "mil", { milk: true }, 5)), ["Milkshake", "Oat milk"]);
    assert.deepEqual(j(L.suggestions(h, "  ", {}, 5)), []);
    assert.deepEqual(j(L.suggestions(h, "x", {}, 5)), []);
    // A fully typed name does not suggest itself, longer ones do.
    const s = [{ name: "Onion", times: 9, lastUsed: 1 }, { name: "Onion soup", times: 1, lastUsed: 1 }];
    assert.deepEqual(j(L.suggestions(s, "onion", {}, 5)), ["Onion soup"]);
    assert.deepEqual(j(L.suggestions(s, "Onion ", {}, 5)), ["Onion soup"]);
    assert.deepEqual(j(L.suggestions(s, "oni", {}, 5)), ["Onion", "Onion soup"]);
    // On a tie the most recently bought first.
    const t = [{ name: "a1", times: 1, lastUsed: 1 }, { name: "a2", times: 1, lastUsed: 2 }];
    assert.deepEqual(j(L.suggestions(t, "a", {}, 5)), ["a2", "a1"]);
});

test("sortItems: items to buy in order of adding, collected below newest first", () => {
    const t = [
        { id: 1, name: "a", collected: 0, added: 30 },
        { id: 2, name: "b", collected: 500, added: 10 },
        { id: 3, name: "c", collected: 0, added: 20 },
        { id: 4, name: "d", collected: 900, added: 5 },
    ];
    assert.deepEqual(j(L.sortItems(t)).map((x) => x.name), ["c", "a", "d", "b"]);
    assert.equal(t[0].name, "a", "the original array must not change");
});

test("fillText: name and a space, a typed quantity after the name", () => {
    assert.equal(L.fillText("Onion", ""), "Onion ");
    assert.equal(L.fillText(" Milk ", "3"), "Milk 3 ");
    // The filled text parses back into the same item.
    assert.deepEqual(j(L.parse(L.fillText("Milk", "3"))), { name: "Milk", quantity: "3" });
    assert.deepEqual(j(L.parse(L.fillText("Onion", "") + "2 kg")), { name: "Onion", quantity: "2 kg" });
    assert.deepEqual(j(L.parse(L.fillText("Maito", "") + "3 + 2sin")), { name: "Maito", quantity: "3 + 2sin" });
});

test("watchText: one line per item, quantity after, empty list = empty", () => {
    assert.equal(L.watchText([{ name: " Maito ", quantity: "3 + 2sin" }, { name: "Onion", quantity: "" },
                              { name: "Bread", quantity: null }]),
                 "Maito 3 + 2sin\nOnion\nBread");
    assert.equal(L.watchText([]), "");
});

test("sortItems: the user's order wins over the order of adding, missing = 0", () => {
    const t = [
        { id: 1, name: "a", collected: 0, added: 1, position: 3 },
        { id: 2, name: "b", collected: 0, added: 2, position: 1 },
        { id: 3, name: "c", collected: 0, added: 3, position: 2 },
        { id: 4, name: "old", collected: 0, added: 9 },
        { id: 5, name: "collected", collected: 5, added: 0, position: 0 },
    ];
    assert.deepEqual(j(L.sortItems(t)).map((x) => x.name), ["old", "b", "c", "a", "collected"]);
});
