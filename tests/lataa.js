// Lataa QML:n .pragma library -JS-moduulin Noden vm-kontekstiin. ".import "x.js" as Nimi"
// -rivit ladataan rekursiivisesti ja annetaan moduulille nimellä, kuten QML tekee.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");

const JS = path.join(__dirname, "..", "qml", "js");

function lataa(tiedosto) {
    const lahde = fs.readFileSync(path.join(JS, tiedosto), "utf8");
    const konteksti = {};
    const rivit = lahde.split("\n").map((rivi) => {
        const m = /^\.import "([^"]+)" as (\w+)\s*$/.exec(rivi);
        if (m) {
            konteksti[m[2]] = lataa(m[1]);
            return "";
        }
        // Rivimäärä säilyy, jotta virheiden rivinumerot osuvat lähteeseen.
        return rivi.startsWith(".pragma ") ? "" : rivi;
    });
    vm.createContext(konteksti);
    vm.runInContext(rivit.join("\n"), konteksti, { filename: tiedosto });
    return konteksti;
}

// QtQuick.LocalStorage-tietokannan vastine: transaction/readTransaction, executeSql
// palauttaa {rows: {length, item(i)}, rowsAffected, insertId (merkkijono)}.
function valeTietokanta() {
    const sqlite = new DatabaseSync(":memory:");
    function tx(vainLuku) {
        return {
            executeSql(sql, args) {
                const lause = sql.trim().toUpperCase();
                const luku = lause.startsWith("SELECT");
                if (vainLuku && !luku)
                    throw new Error("Read-only Transaction");
                const stmt = sqlite.prepare(sql);
                // Qt 5.6:n LocalStorage sitoo tyhjän JS-merkkijonon NULLina (tyhjä QString
                // → null QVariant). Todettu puhelimessa 26.10.: "NOT NULL constraint failed".
                const a = (args || []).map((x) => (x === "" ? null : x));
                if (luku) {
                    const r = stmt.all(...a);
                    return { rows: { length: r.length, item: (i) => r[i] }, rowsAffected: 0, insertId: "" };
                }
                const r = stmt.run(...a);
                return { rows: { length: 0, item: () => undefined }, rowsAffected: Number(r.changes),
                         insertId: String(r.lastInsertRowid) };
            },
        };
    }
    function aja(cb, vainLuku) {
        sqlite.exec("BEGIN");
        try {
            cb(tx(vainLuku));
            sqlite.exec("COMMIT");
        } catch (e) {
            sqlite.exec("ROLLBACK");
            throw e;
        }
    }
    return {
        transaction: (cb) => aja(cb, false),
        readTransaction: (cb) => aja(cb, true),
        sqlite,
    };
}

module.exports = { lataa, valeTietokanta };
