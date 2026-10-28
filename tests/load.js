// Loads a QML ".pragma library" JS module into a Node vm context. '.import "x.js" as Name'
// lines are loaded recursively and given to the module under that name, as QML does.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");

const JS = path.join(__dirname, "..", "qml", "js");

function load(file) {
    const source = fs.readFileSync(path.join(JS, file), "utf8");
    const context = {};
    const lines = source.split("\n").map((line) => {
        const m = /^\.import "([^"]+)" as (\w+)\s*$/.exec(line);
        if (m) {
            context[m[2]] = load(m[1]);
            return "";
        }
        // The line count is kept so that error line numbers match the source.
        return line.startsWith(".pragma ") ? "" : line;
    });
    vm.createContext(context);
    vm.runInContext(lines.join("\n"), context, { filename: file });
    return context;
}

// Stand-in for a QtQuick.LocalStorage database: transaction/readTransaction, executeSql
// returns {rows: {length, item(i)}, rowsAffected, insertId (string)}.
function fakeDatabase() {
    const sqlite = new DatabaseSync(":memory:");
    function tx(readOnly) {
        return {
            executeSql(sql, args) {
                const isSelect = sql.trim().toUpperCase().startsWith("SELECT");
                if (readOnly && !isSelect)
                    throw new Error("Read-only Transaction");
                const stmt = sqlite.prepare(sql);
                // Qt 5.6's LocalStorage binds an empty JS string as NULL (empty QString →
                // null QVariant). Seen on the phone: "NOT NULL constraint failed".
                const a = (args || []).map((x) => (x === "" ? null : x));
                if (isSelect) {
                    const r = stmt.all(...a);
                    return { rows: { length: r.length, item: (i) => r[i] }, rowsAffected: 0, insertId: "" };
                }
                const r = stmt.run(...a);
                return { rows: { length: 0, item: () => undefined }, rowsAffected: Number(r.changes),
                         insertId: String(r.lastInsertRowid) };
            },
        };
    }
    function run(cb, readOnly) {
        sqlite.exec("BEGIN");
        try {
            cb(tx(readOnly));
            sqlite.exec("COMMIT");
        } catch (e) {
            sqlite.exec("ROLLBACK");
            throw e;
        }
    }
    return {
        transaction: (cb) => run(cb, false),
        readTransaction: (cb) => run(cb, true),
        sqlite,
    };
}

module.exports = { load, fakeDatabase };
