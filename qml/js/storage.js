.pragma library
.import "logic.js" as Logic
// Storage in a QtQuick.LocalStorage database (SQLite). Every function takes the database
// as a parameter so that the tests can pass a stand-in backed by Node's SQLite (tests/).
//
// items.collected = 0 (not collected) or the time of collecting in milliseconds.
// items.position = the order the user has dragged the items to buy into.
// history remembers every item ever added, for suggestions.
//
// ⚠️ Qt 5.6's LocalStorage binds an empty string as NULL, and quantity is NOT NULL →
// every quantity binding goes through COALESCE(?, '') (on the phone, tapping a suggestion
// failed with "NOT NULL constraint failed"). tests/load.js mimics this.

var SCHEMA = 1;

function _rows(result) {
    var r = [];
    for (var i = 0; i < result.rows.length; ++i)
        r.push(result.rows.item(i));
    return r;
}

// A new or restored item goes to the end of the items to buy.
var _NEXT = "(SELECT COALESCE(MAX(position), 0) + 1 FROM items WHERE collected = 0)";

function init(db) {
    db.transaction(function (tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT NOT NULL)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS items ("
                      + "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, name_key TEXT NOT NULL, "
                      + "quantity TEXT NOT NULL DEFAULT '', collected INTEGER NOT NULL DEFAULT 0, "
                      + "added INTEGER NOT NULL, position INTEGER NOT NULL DEFAULT 0)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS history ("
                      + "name_key TEXT PRIMARY KEY, name TEXT NOT NULL, times INTEGER NOT NULL, "
                      + "last_used INTEGER NOT NULL)");
        // Future schema upgrades: read the stored version here before overwriting it.
        tx.executeSql("INSERT OR REPLACE INTO settings (name, value) VALUES ('schema', ?)", [String(SCHEMA)]);
    });
}

function items(db) {
    var r = [];
    db.readTransaction(function (tx) {
        r = _rows(tx.executeSql("SELECT id, name, quantity, collected, added, position FROM items"));
    });
    return Logic.sortItems(r);
}

function history(db) {
    var r = [];
    db.readTransaction(function (tx) {
        r = _rows(tx.executeSql("SELECT name, times, last_used AS lastUsed FROM history"));
    });
    return r;
}

// Returns {status, id}: "empty" | "added" | "merged" (was already on the list to buy,
// quantities merged) | "restored" (was collected, put back to buy with the new quantity).
function add(db, input, now) {
    var p = Logic.parse(input);
    if (!p)
        return { status: "empty", id: -1 };
    var key = Logic.normalize(p.name);
    var result = null;
    db.transaction(function (tx) {
        var open = _rows(tx.executeSql(
            "SELECT id, quantity FROM items WHERE name_key = ? AND collected = 0 ORDER BY id LIMIT 1", [key]));
        if (open.length) {
            tx.executeSql("UPDATE items SET quantity = COALESCE(?, '') WHERE id = ?",
                          [Logic.mergeQuantities(open[0].quantity, p.quantity), open[0].id]);
            result = { status: "merged", id: open[0].id };
        } else {
            var collected = _rows(tx.executeSql(
                "SELECT id FROM items WHERE name_key = ? ORDER BY collected DESC, id DESC LIMIT 1", [key]));
            if (collected.length) {
                tx.executeSql("UPDATE items SET name = ?, quantity = COALESCE(?, ''), collected = 0, added = ?, "
                              + "position = " + _NEXT + " WHERE id = ?",
                              [p.name, p.quantity, now, collected[0].id]);
                result = { status: "restored", id: collected[0].id };
            } else {
                var r = tx.executeSql("INSERT INTO items (name, name_key, quantity, added, position) "
                                      + "VALUES (?, ?, COALESCE(?, ''), ?, " + _NEXT + ")",
                                      [p.name, key, p.quantity, now]);
                result = { status: "added", id: parseInt(r.insertId, 10) };
            }
        }
        // No upsert (ON CONFLICT needs SQLite 3.24; no guarantees from the Qt 5.6 driver).
        if (tx.executeSql("UPDATE history SET name = ?, times = times + 1, last_used = ? WHERE name_key = ?",
                          [p.name, now, key]).rowsAffected === 0)
            tx.executeSql("INSERT INTO history (name_key, name, times, last_used) VALUES (?, ?, 1, ?)",
                          [key, p.name, now]);
    });
    return result;
}

function toggleCollected(db, id, now) {
    db.transaction(function (tx) {
        tx.executeSql("UPDATE items SET collected = CASE collected WHEN 0 THEN ? ELSE 0 END WHERE id = ?",
                      [now, id]);
    });
}

// An empty name is rejected (returns false); otherwise name and quantity are replaced as given.
function edit(db, id, name, quantity) {
    var n = Logic.clean(name);
    if (n === "")
        return false;
    db.transaction(function (tx) {
        tx.executeSql("UPDATE items SET name = ?, name_key = ?, quantity = COALESCE(?, '') WHERE id = ?",
                      [n, Logic.normalize(n), Logic.clean(quantity), id]);
    });
    return true;
}

// After dragging: ids = the items to buy in their new order (1, 2, 3, …).
function setOrder(db, ids) {
    db.transaction(function (tx) {
        for (var i = 0; i < ids.length; ++i)
            tx.executeSql("UPDATE items SET position = ? WHERE id = ?", [i + 1, ids[i]]);
    });
}

function remove(db, id) {
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM items WHERE id = ?", [id]);
    });
}

function clearCollected(db) {
    var n = 0;
    db.transaction(function (tx) {
        n = tx.executeSql("DELETE FROM items WHERE collected != 0").rowsAffected;
    });
    return n;
}

function forget(db, name) {
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM history WHERE name_key = ?", [Logic.normalize(name)]);
    });
}

// User settings in the settings table (values are strings; "schema" is reserved).
function setting(db, name, fallback) {
    var r = [];
    db.readTransaction(function (tx) {
        r = _rows(tx.executeSql("SELECT value FROM settings WHERE name = ?", [name]));
    });
    return r.length ? r[0].value : fallback;
}

function setSetting(db, name, value) {
    db.transaction(function (tx) {
        tx.executeSql("INSERT OR REPLACE INTO settings (name, value) VALUES (?, ?)", [name, String(value)]);
    });
}
