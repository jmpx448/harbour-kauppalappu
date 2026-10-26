"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { lataa } = require("./lataa");

const L = lataa("logiikka.js");
// vm-kontekstin oliot ovat eri realmista → vertaillaan JSON-muodossa.
const j = (x) => JSON.parse(JSON.stringify(x));

test("jasenna: pelkkä nimi ja tyhjä syöte", () => {
    assert.deepEqual(j(L.jasenna("  Maito  ")), { nimi: "Maito", maara: "" });
    assert.equal(L.jasenna("   "), null);
    assert.equal(L.jasenna(""), null);
    assert.equal(L.jasenna(undefined), null);
});

test("jasenna: määrä alussa, lopussa ja kertomerkillä", () => {
    assert.deepEqual(j(L.jasenna("2 maitoa")), { nimi: "maitoa", maara: "2" });
    assert.deepEqual(j(L.jasenna("500 g jauhelihaa")), { nimi: "jauhelihaa", maara: "500 g" });
    assert.deepEqual(j(L.jasenna("2kpl banaaneja")), { nimi: "banaaneja", maara: "2 kpl" });
    assert.deepEqual(j(L.jasenna("Pepsi Max 1,5 l")), { nimi: "Pepsi Max", maara: "1,5 l" });
    assert.deepEqual(j(L.jasenna("Vesi 0.5L")), { nimi: "Vesi", maara: "0.5 l" });
    assert.deepEqual(j(L.jasenna("kananmunat x2")), { nimi: "kananmunat", maara: "2" });
    assert.deepEqual(j(L.jasenna("Omena 6")), { nimi: "Omena", maara: "6" });
});

test("jasenna: plussalla erotetut osat säilyvät määränä sellaisenaan", () => {
    assert.deepEqual(j(L.jasenna("Maito 3 + 2sin")), { nimi: "Maito", maara: "3 + 2sin" });
    assert.deepEqual(j(L.jasenna("Maito 3+2")), { nimi: "Maito", maara: "3 + 2" });
    assert.deepEqual(j(L.jasenna("Jogurtti 2 mansikka + 1 vanilja")),
                     { nimi: "Jogurtti", maara: "2 mansikka + 1 vanilja" });
    assert.deepEqual(j(L.jasenna("Kahvi 2 + 1 + 1")), { nimi: "Kahvi", maara: "2 + 1 + 1" });
    // Plussa ilman numeroa jälkiosassa ei ole määrämerkintä.
    assert.deepEqual(j(L.jasenna("Pesuaine 2 + huuhde")), { nimi: "Pesuaine 2 + huuhde", maara: "" });
    assert.deepEqual(j(L.jasenna("Disney+ 2")), { nimi: "Disney+", maara: "2" });
});

test("jasenna: numerot, jotka kuuluvat nimeen", () => {
    assert.deepEqual(j(L.jasenna("1 % maito")), { nimi: "1 % maito", maara: "" });
    assert.deepEqual(j(L.jasenna("7up")), { nimi: "7up", maara: "" });
    // "Box 2": ilman välilyöntipakkoa x-kuvio tulkitsisi nimeksi "Bo".
    assert.deepEqual(j(L.jasenna("Box 2")), { nimi: "Box", maara: "2" });
    // "2 lohta": l-yksikkö ei saa syödä sanan alkua.
    assert.deepEqual(j(L.jasenna("2 lohta")), { nimi: "lohta", maara: "2" });
    assert.deepEqual(j(L.jasenna("3 grillimakkaraa")), { nimi: "grillimakkaraa", maara: "3" });
});

test("normalisoi: kirjainkoko ja välilyönnit, ääkköset säilyvät", () => {
    assert.equal(L.normalisoi("  Ruis   LEIPÄ "), "ruis leipä");
    assert.equal(L.normalisoi("ÄÖÅ"), "äöå");
});

test("yhdistaMaarat", () => {
    assert.equal(L.yhdistaMaarat("", ""), "");
    assert.equal(L.yhdistaMaarat("2", ""), "2");
    assert.equal(L.yhdistaMaarat("", "3"), "3");
    assert.equal(L.yhdistaMaarat("2", "3"), "5");
    assert.equal(L.yhdistaMaarat("1,5 l", "1 l"), "2,5 l");
    assert.equal(L.yhdistaMaarat("0.1 kg", "0.2 kg"), "0.3 kg");
    // Eri yksiköt tai vapaa teksti: ketjutetaan, mitään ei hävitetä.
    assert.equal(L.yhdistaMaarat("500 g", "1 kg"), "500 g + 1 kg");
    assert.equal(L.yhdistaMaarat("iso pussi", "2"), "iso pussi + 2");
    assert.equal(L.yhdistaMaarat("3 + 2sin", "1"), "3 + 2sin + 1");
});

test("ehdotukset: alusta osuvat ensin, sitten useimmin ja viimeksi ostetut", () => {
    const h = [
        { nimi: "Maito", kerrat: 5, viimeksi: 100 },
        { nimi: "Maitorahka", kerrat: 9, viimeksi: 50 },
        { nimi: "Kaura maito", kerrat: 20, viimeksi: 10 },
        { nimi: "Makkara", kerrat: 1, viimeksi: 999 },
        { nimi: "Juusto", kerrat: 30, viimeksi: 1 },
    ];
    assert.deepEqual(j(L.ehdotukset(h, "mai", {}, 5)), ["Maitorahka", "Maito", "Kaura maito"]);
    assert.deepEqual(j(L.ehdotukset(h, "MA", {}, 2)), ["Maitorahka", "Maito"]);
    assert.deepEqual(j(L.ehdotukset(h, "mai", { maito: true }, 5)), ["Maitorahka", "Kaura maito"]);
    assert.deepEqual(j(L.ehdotukset(h, "  ", {}, 5)), []);
    assert.deepEqual(j(L.ehdotukset(h, "x", {}, 5)), []);
    // Kokonaan kirjoitettu nimi ei ehdota itseään, pidemmät kyllä.
    const s = [{ nimi: "Sipuli", kerrat: 9, viimeksi: 1 }, { nimi: "Sipulikeitto", kerrat: 1, viimeksi: 1 }];
    assert.deepEqual(j(L.ehdotukset(s, "sipuli", {}, 5)), ["Sipulikeitto"]);
    assert.deepEqual(j(L.ehdotukset(s, "Sipuli ", {}, 5)), ["Sipulikeitto"]);
    assert.deepEqual(j(L.ehdotukset(s, "sip", {}, 5)), ["Sipuli", "Sipulikeitto"]);
    // Tasapelissä viimeksi ostettu ensin.
    const t = [{ nimi: "a1", kerrat: 1, viimeksi: 1 }, { nimi: "a2", kerrat: 1, viimeksi: 2 }];
    assert.deepEqual(j(L.ehdotukset(t, "a", {}, 5)), ["a2", "a1"]);
});

test("jarjesta: ostettavat lisäysjärjestyksessä, kerätyt alla uusin ensin", () => {
    const t = [
        { id: 1, nimi: "a", keratty: 0, lisatty: 30 },
        { id: 2, nimi: "b", keratty: 500, lisatty: 10 },
        { id: 3, nimi: "c", keratty: 0, lisatty: 20 },
        { id: 4, nimi: "d", keratty: 900, lisatty: 5 },
    ];
    assert.deepEqual(j(L.jarjesta(t)).map((x) => x.nimi), ["c", "a", "d", "b"]);
    assert.equal(t[0].nimi, "a", "alkuperäinen taulukko ei saa muuttua");
});

test("taytto: nimi ja välilyönti, kirjoitettu määrä nimen perään", () => {
    assert.equal(L.taytto("Sipuli", ""), "Sipuli ");
    assert.equal(L.taytto(" Maito ", "3"), "Maito 3 ");
    // Täytetty teksti jäsentyy takaisin samaksi tuotteeksi.
    assert.deepEqual(j(L.jasenna(L.taytto("Maito", "3"))), { nimi: "Maito", maara: "3" });
    assert.deepEqual(j(L.jasenna(L.taytto("Sipuli", "") + "2 kg")), { nimi: "Sipuli", maara: "2 kg" });
    assert.deepEqual(j(L.jasenna(L.taytto("Maito", "") + "3 + 2sin")), { nimi: "Maito", maara: "3 + 2sin" });
});
