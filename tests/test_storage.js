"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { load, fakeDatabase } = require("./load");

const S = load("storage.js");
const j = (x) => JSON.parse(JSON.stringify(x));

function fresh() {
    const db = fakeDatabase();
    S.init(db);
    return db;
}
const names = (db) => j(S.items(db)).map((t) => t.name);

test("init is repeatable and records the schema", () => {
    const db = fresh();
    S.init(db);
    const r = db.sqlite.prepare("SELECT value FROM settings WHERE name = 'schema'").all();
    assert.deepEqual(j(r), [{ value: "1" }]);
});

test("add: new item, empty input", () => {
    const db = fresh();
    const r = j(S.add(db, "2 l milk", 1000));
    assert.equal(r.status, "added");
    assert.equal(typeof r.id, "number");
    assert.deepEqual(j(S.items(db)), [{ id: r.id, name: "milk", quantity: "2 l", collected: 0, added: 1000, position: 1 }]);
    assert.equal(j(S.add(db, "   ", 1001)).status, "empty");
    assert.equal(S.items(db).length, 1);
});

test("add: same item already to buy → quantities merged, no duplicate", () => {
    const db = fresh();
    const a = j(S.add(db, "Milk 2", 1));
    const b = j(S.add(db, "MILK 3", 2));
    assert.deepEqual(b, { status: "merged", id: a.id });
    const t = S.items(db);
    assert.equal(t.length, 1);
    assert.equal(t[0].quantity, "5");
    assert.equal(t[0].name, "Milk", "merging does not change the name");
});

test("add: a collected item is put back to buy with the new quantity", () => {
    const db = fresh();
    const a = j(S.add(db, "Bread 2", 1));
    S.toggleCollected(db, a.id, 50);
    const b = j(S.add(db, "bread", 60));
    assert.deepEqual(b, { status: "restored", id: a.id });
    assert.deepEqual(j(S.items(db)), [{ id: a.id, name: "bread", quantity: "", collected: 0, added: 60, position: 1 }]);
});

test("toggleCollected back and forth, and ordering", () => {
    const db = fresh();
    const a = j(S.add(db, "a", 1)).id;
    const b = j(S.add(db, "b", 2)).id;
    j(S.add(db, "c", 3));
    S.toggleCollected(db, a, 10);
    S.toggleCollected(db, b, 20);
    assert.deepEqual(names(db), ["c", "b", "a"]);
    S.toggleCollected(db, a, 30);
    assert.deepEqual(names(db), ["a", "c", "b"]);
    assert.equal(S.items(db).find((t) => t.name === "a").collected, 0);
});

test("clearCollected removes only collected items and returns their count", () => {
    const db = fresh();
    const a = j(S.add(db, "a", 1)).id;
    const b = j(S.add(db, "b", 2)).id;
    j(S.add(db, "c", 3));
    S.toggleCollected(db, a, 10);
    S.toggleCollected(db, b, 11);
    assert.equal(S.clearCollected(db), 2);
    assert.deepEqual(names(db), ["c"]);
    assert.equal(S.clearCollected(db), 0);
});

test("edit: name and quantity, empty name rejected, key updated", () => {
    const db = fresh();
    const a = j(S.add(db, "milk", 1)).id;
    assert.equal(S.edit(db, a, "  Oat drink ", " 2 "), true);
    assert.deepEqual(j(S.items(db)).map((t) => [t.name, t.quantity]), [["Oat drink", "2"]]);
    assert.equal(S.edit(db, a, "   ", "3"), false);
    assert.equal(S.items(db)[0].name, "Oat drink");
    // New key: "oat drink" merges into the edited row.
    assert.equal(j(S.add(db, "oat drink 1", 2)).status, "merged");
});

test("remove", () => {
    const db = fresh();
    const a = j(S.add(db, "a", 1)).id;
    j(S.add(db, "b", 2));
    S.remove(db, a);
    assert.deepEqual(names(db), ["b"]);
});

test("history: count grows, latest spelling kept, forget removes", () => {
    const db = fresh();
    const a = j(S.add(db, "milk", 1)).id;
    S.toggleCollected(db, a, 2);
    S.clearCollected(db);
    j(S.add(db, "Milk", 3));
    j(S.add(db, "bread", 4));
    const h = j(S.history(db)).sort((x, y) => x.name.localeCompare(y.name, "en"));
    assert.deepEqual(h, [{ name: "bread", times: 1, lastUsed: 4 }, { name: "Milk", times: 2, lastUsed: 3 }]);
    S.forget(db, "MILK");
    assert.deepEqual(j(S.history(db)).map((x) => x.name), ["bread"]);
});

test("an error during a transaction rolls it back completely", () => {
    const db = fresh();
    j(S.add(db, "a", 1));
    assert.throws(() => db.transaction((tx) => {
        tx.executeSql("DELETE FROM items");
        tx.executeSql("SELECT * FROM no_such_table");
    }));
    assert.deepEqual(names(db), ["a"]);
});

test("a read transaction rejects writes (like Qt)", () => {
    const db = fresh();
    assert.throws(() => db.readTransaction((tx) => tx.executeSql("DELETE FROM items")), /Read-only/);
});

test("setOrder: the dragged order is kept, a new item goes last", () => {
    const db = fresh();
    const a = j(S.add(db, "a", 1)).id, b = j(S.add(db, "b", 2)).id, c = j(S.add(db, "c", 3)).id;
    S.setOrder(db, [c, a, b]);
    assert.deepEqual(names(db), ["c", "a", "b"]);
    j(S.add(db, "d", 4));
    assert.deepEqual(names(db), ["c", "a", "b", "d"]);
    // Collected and unticked again (tap) returns to its old place.
    S.toggleCollected(db, a, 5);
    assert.deepEqual(names(db), ["c", "b", "d", "a"]);
    S.toggleCollected(db, a, 6);
    assert.deepEqual(names(db), ["c", "a", "b", "d"]);
    // A collected item added again goes last.
    S.toggleCollected(db, c, 7);
    j(S.add(db, "c 2", 8));
    assert.deepEqual(names(db), ["a", "b", "d", "c"]);
});

test("settings: fallback when unset, stored value after setSetting, survives init", () => {
    const db = fresh();
    assert.equal(S.setting(db, "watch", "0"), "0");
    S.setSetting(db, "watch", "1");
    assert.equal(S.setting(db, "watch", "0"), "1");
    S.setSetting(db, "watch", "0");
    S.init(db);
    assert.equal(S.setting(db, "watch", "1"), "0");
    assert.equal(S.setting(db, "schema", ""), "1");
});
