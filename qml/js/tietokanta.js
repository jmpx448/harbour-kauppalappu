.pragma library
.import "logiikka.js" as Logiikka
// Tallennus QtQuick.LocalStorage-tietokantaan (SQLite). Jokainen funktio saa tietokannan
// parametrina, jotta testit voivat antaa Noden SQLiteen nojaavan vastineen (tests/).
//
// tuotteet.keratty = 0 (ostamatta) tai keräyshetki millisekunteina.
//
// ⚠️ Qt 5.6:n LocalStorage sitoo tyhjän merkkijonon NULLina, ja maara on NOT NULL →
// jokainen maara-sidonta kulkee COALESCE(?, '') -lausekkeen kautta (puhelimessa 26.10.
// ehdotuksen napautus kaatui "NOT NULL constraint failed"). tests/lataa.js matkii tätä.
// historia muistaa jokaisen koskaan lisätyn tuotteen ehdotuksia varten.

// Skeema 2 (0.1.6): tuotteet.jarjestys = käyttäjän raahaama järjestys ostettaville.
var SKEEMA = 2;

function _rivit(tulos) {
    var r = [];
    for (var i = 0; i < tulos.rows.length; ++i)
        r.push(tulos.rows.item(i));
    return r;
}

// Uusi tai takaisin palautettu tuote ostettavien loppuun.
var _SEURAAVA = "(SELECT COALESCE(MAX(jarjestys), 0) + 1 FROM tuotteet WHERE keratty = 0)";

function alusta(db) {
    db.transaction(function (tx) {
        tx.executeSql("CREATE TABLE IF NOT EXISTS asetukset (avain TEXT PRIMARY KEY, arvo TEXT NOT NULL)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS tuotteet ("
                      + "id INTEGER PRIMARY KEY AUTOINCREMENT, nimi TEXT NOT NULL, avain TEXT NOT NULL, "
                      + "maara TEXT NOT NULL DEFAULT '', keratty INTEGER NOT NULL DEFAULT 0, "
                      + "lisatty INTEGER NOT NULL, jarjestys INTEGER NOT NULL DEFAULT 0)");
        tx.executeSql("CREATE TABLE IF NOT EXISTS historia ("
                      + "avain TEXT PRIMARY KEY, nimi TEXT NOT NULL, kerrat INTEGER NOT NULL, "
                      + "viimeksi INTEGER NOT NULL)");
        var s = _rivit(tx.executeSql("SELECT arvo FROM asetukset WHERE avain = 'skeema'"));
        if (s.length && parseInt(s[0].arvo, 10) < 2) {
            // Vanhat rivit saavat 0:n → järjestyvät lisäysjärjestyksessä kuten ennenkin.
            tx.executeSql("ALTER TABLE tuotteet ADD COLUMN jarjestys INTEGER NOT NULL DEFAULT 0");
        }
        tx.executeSql("INSERT OR REPLACE INTO asetukset (avain, arvo) VALUES ('skeema', ?)", [String(SKEEMA)]);
    });
}

function tuotteet(db) {
    var r = [];
    db.readTransaction(function (tx) {
        r = _rivit(tx.executeSql("SELECT id, nimi, maara, keratty, lisatty, jarjestys FROM tuotteet"));
    });
    return Logiikka.jarjesta(r);
}

function historia(db) {
    var r = [];
    db.readTransaction(function (tx) {
        r = _rivit(tx.executeSql("SELECT nimi, kerrat, viimeksi FROM historia"));
    });
    return r;
}

// Palauttaa {tila, id}: "tyhja" | "lisatty" | "yhdistetty" (oli jo ostettavana, määrät
// yhdistetty) | "palautettu" (oli kerätty, palautettiin ostettavaksi uudella määrällä).
function lisaa(db, syote, nyt) {
    var p = Logiikka.jasenna(syote);
    if (!p)
        return { tila: "tyhja", id: -1 };
    var avain = Logiikka.normalisoi(p.nimi);
    var tulos = null;
    db.transaction(function (tx) {
        var auki = _rivit(tx.executeSql(
            "SELECT id, maara FROM tuotteet WHERE avain = ? AND keratty = 0 ORDER BY id LIMIT 1", [avain]));
        if (auki.length) {
            tx.executeSql("UPDATE tuotteet SET maara = COALESCE(?, '') WHERE id = ?",
                          [Logiikka.yhdistaMaarat(auki[0].maara, p.maara), auki[0].id]);
            tulos = { tila: "yhdistetty", id: auki[0].id };
        } else {
            var keratty = _rivit(tx.executeSql(
                "SELECT id FROM tuotteet WHERE avain = ? ORDER BY keratty DESC, id DESC LIMIT 1", [avain]));
            if (keratty.length) {
                tx.executeSql("UPDATE tuotteet SET nimi = ?, maara = COALESCE(?, ''), keratty = 0, lisatty = ?, "
                              + "jarjestys = " + _SEURAAVA + " WHERE id = ?",
                              [p.nimi, p.maara, nyt, keratty[0].id]);
                tulos = { tila: "palautettu", id: keratty[0].id };
            } else {
                var r = tx.executeSql("INSERT INTO tuotteet (nimi, avain, maara, lisatty, jarjestys) "
                                      + "VALUES (?, ?, COALESCE(?, ''), ?, " + _SEURAAVA + ")",
                                      [p.nimi, avain, p.maara, nyt]);
                tulos = { tila: "lisatty", id: parseInt(r.insertId, 10) };
            }
        }
        // Ei upsertia (ON CONFLICT vaatii SQLite 3.24:n; Qt 5.6:n ajurista ei takeita).
        if (tx.executeSql("UPDATE historia SET nimi = ?, kerrat = kerrat + 1, viimeksi = ? WHERE avain = ?",
                          [p.nimi, nyt, avain]).rowsAffected === 0)
            tx.executeSql("INSERT INTO historia (avain, nimi, kerrat, viimeksi) VALUES (?, ?, 1, ?)",
                          [avain, p.nimi, nyt]);
    });
    return tulos;
}

function vaihdaKeratty(db, id, nyt) {
    db.transaction(function (tx) {
        tx.executeSql("UPDATE tuotteet SET keratty = CASE keratty WHEN 0 THEN ? ELSE 0 END WHERE id = ?",
                      [nyt, id]);
    });
}

// Tyhjä nimi hylätään (palauttaa false); muuten nimi ja määrä korvataan sellaisenaan.
function muokkaa(db, id, nimi, maara) {
    var n = Logiikka.siisti(nimi);
    if (n === "")
        return false;
    db.transaction(function (tx) {
        tx.executeSql("UPDATE tuotteet SET nimi = ?, avain = ?, maara = COALESCE(?, '') WHERE id = ?",
                      [n, Logiikka.normalisoi(n), Logiikka.siisti(maara), id]);
    });
    return true;
}

// Raahauksen jälkeen: idt = ostettavat uudessa järjestyksessä (1, 2, 3, …).
function asetaJarjestys(db, idt) {
    db.transaction(function (tx) {
        for (var i = 0; i < idt.length; ++i)
            tx.executeSql("UPDATE tuotteet SET jarjestys = ? WHERE id = ?", [i + 1, idt[i]]);
    });
}

function poista(db, id) {
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM tuotteet WHERE id = ?", [id]);
    });
}

function tyhjennaKeratyt(db) {
    var n = 0;
    db.transaction(function (tx) {
        n = tx.executeSql("DELETE FROM tuotteet WHERE keratty != 0").rowsAffected;
    });
    return n;
}

function unohda(db, nimi) {
    db.transaction(function (tx) {
        tx.executeSql("DELETE FROM historia WHERE avain = ?", [Logiikka.normalisoi(nimi)]);
    });
}
