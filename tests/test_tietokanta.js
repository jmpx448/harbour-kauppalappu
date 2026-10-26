"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { lataa, valeTietokanta } = require("./lataa");

const T = lataa("tietokanta.js");
const j = (x) => JSON.parse(JSON.stringify(x));

function uusi() {
    const db = valeTietokanta();
    T.alusta(db);
    return db;
}
const nimet = (db) => j(T.tuotteet(db)).map((t) => t.nimi);

test("alusta on toistettava ja kirjaa skeeman", () => {
    const db = uusi();
    T.alusta(db);
    const r = db.sqlite.prepare("SELECT arvo FROM asetukset WHERE avain = 'skeema'").all();
    assert.deepEqual(j(r), [{ arvo: "1" }]);
});

test("lisaa: uusi tuote, tyhjä syöte", () => {
    const db = uusi();
    const r = j(T.lisaa(db, "2 l maitoa", 1000));
    assert.equal(r.tila, "lisatty");
    assert.equal(typeof r.id, "number");
    assert.deepEqual(j(T.tuotteet(db)), [{ id: r.id, nimi: "maitoa", maara: "2 l", keratty: 0, lisatty: 1000 }]);
    assert.equal(j(T.lisaa(db, "   ", 1001)).tila, "tyhja");
    assert.equal(T.tuotteet(db).length, 1);
});

test("lisaa: sama tuote ostettavana → määrät yhdistetään, ei kaksoiskappaletta", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "Maito 2", 1));
    const b = j(T.lisaa(db, "MAITO 3", 2));
    assert.deepEqual(b, { tila: "yhdistetty", id: a.id });
    const t = T.tuotteet(db);
    assert.equal(t.length, 1);
    assert.equal(t[0].maara, "5");
    assert.equal(t[0].nimi, "Maito", "yhdistäminen ei muuta nimeä");
});

test("lisaa: kerätty tuote palautetaan ostettavaksi uudella määrällä", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "Leipä 2", 1));
    T.vaihdaKeratty(db, a.id, 50);
    const b = j(T.lisaa(db, "leipä", 60));
    assert.deepEqual(b, { tila: "palautettu", id: a.id });
    assert.deepEqual(j(T.tuotteet(db)), [{ id: a.id, nimi: "leipä", maara: "", keratty: 0, lisatty: 60 }]);
});

test("vaihdaKeratty edestakaisin ja järjestys", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "a", 1)).id;
    const b = j(T.lisaa(db, "b", 2)).id;
    j(T.lisaa(db, "c", 3));
    T.vaihdaKeratty(db, a, 10);
    T.vaihdaKeratty(db, b, 20);
    assert.deepEqual(nimet(db), ["c", "b", "a"]);
    T.vaihdaKeratty(db, a, 30);
    assert.deepEqual(nimet(db), ["a", "c", "b"]);
    assert.equal(T.tuotteet(db).find((t) => t.nimi === "a").keratty, 0);
});

test("tyhjennaKeratyt poistaa vain kerätyt ja palauttaa määrän", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "a", 1)).id;
    const b = j(T.lisaa(db, "b", 2)).id;
    j(T.lisaa(db, "c", 3));
    T.vaihdaKeratty(db, a, 10);
    T.vaihdaKeratty(db, b, 11);
    assert.equal(T.tyhjennaKeratyt(db), 2);
    assert.deepEqual(nimet(db), ["c"]);
    assert.equal(T.tyhjennaKeratyt(db), 0);
});

test("muokkaa: nimi ja määrä, tyhjä nimi hylätään, avain päivittyy", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "maito", 1)).id;
    assert.equal(T.muokkaa(db, a, "  Kaurajuoma ", " 2 "), true);
    assert.deepEqual(j(T.tuotteet(db)).map((t) => [t.nimi, t.maara]), [["Kaurajuoma", "2"]]);
    assert.equal(T.muokkaa(db, a, "   ", "3"), false);
    assert.equal(T.tuotteet(db)[0].nimi, "Kaurajuoma");
    // Uusi avain: "kaurajuoma" yhdistyy muokattuun riviin.
    assert.equal(j(T.lisaa(db, "kaurajuoma 1", 2)).tila, "yhdistetty");
});

test("poista", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "a", 1)).id;
    j(T.lisaa(db, "b", 2));
    T.poista(db, a);
    assert.deepEqual(nimet(db), ["b"]);
});

test("historia: kerrat kasvavat, uusin kirjoitusasu jää, unohda poistaa", () => {
    const db = uusi();
    const a = j(T.lisaa(db, "maito", 1)).id;
    T.vaihdaKeratty(db, a, 2);
    T.tyhjennaKeratyt(db);
    j(T.lisaa(db, "Maito", 3));
    j(T.lisaa(db, "leipä", 4));
    const h = j(T.historia(db)).sort((x, y) => x.nimi.localeCompare(y.nimi, "fi"));
    assert.deepEqual(h, [{ nimi: "leipä", kerrat: 1, viimeksi: 4 }, { nimi: "Maito", kerrat: 2, viimeksi: 3 }]);
    T.unohda(db, "MAITO");
    assert.deepEqual(j(T.historia(db)).map((x) => x.nimi), ["leipä"]);
});

test("virhe kesken transaktion perutaan kokonaan", () => {
    const db = uusi();
    j(T.lisaa(db, "a", 1));
    assert.throws(() => db.transaction((tx) => {
        tx.executeSql("DELETE FROM tuotteet");
        tx.executeSql("SELECT * FROM ei_ole");
    }));
    assert.deepEqual(nimet(db), ["a"]);
});

test("lukutransaktio hylkää kirjoituksen (kuten Qt)", () => {
    const db = uusi();
    assert.throws(() => db.readTransaction((tx) => tx.executeSql("DELETE FROM tuotteet")), /Read-only/);
});
