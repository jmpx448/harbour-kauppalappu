.pragma library
// Ostoslistan puhdas logiikka: syötteen jäsennys, määrien yhdistäminen, ehdotukset ja
// järjestys. Ei QML- eikä tietokantariippuvuuksia, joten testataan Nodella (tests/).
//
// HUOM: Sailfish OS 5.2:n Qt on 5.6, jonka JavaScript-moottori on ES5. Ei let/const,
// nuolifunktioita, template-merkkijonoja eikä luokkia — tests/test_es5.js vartioi.

var YKSIKOT = ["kg", "g", "l", "dl", "cl", "ml", "kpl", "pkt", "prk", "pss", "tlk", "rs", "plo"];

var _YKSIKKO = "(" + YKSIKOT.join("|") + ")";
var _LUKU = "(\\d+(?:[.,]\\d+)?)";
var _ALUSSA = new RegExp("^" + _LUKU + "\\s*(?:" + _YKSIKKO + "\\.?)?\\s+(.+)$", "i");
var _LOPUSSA = new RegExp("^(.+?)\\s+" + _LUKU + "\\s*(?:" + _YKSIKKO + "\\.?)?$", "i");
// "Maito 3 + 2sin": vähintään kaksi numeroalkuista osaa plussalla erotettuna → koko loppu on
// käyttäjän omaa merkintää (3 rasvatonta + 2 kahvimaitoa) ja säilyy määränä sellaisenaan.
var _PLUSSAT = /^(.+?)\s+(\d[^+]*(?:\+\s*\d[^+]*)+)$/;
// Välilyönti ennen x:ää on pakollinen: muuten "Box 2" jäsentyisi nimeksi "Bo".
var _KERTAA = /^(.+?)\s+[x×]\s*(\d+)$/i;

function siisti(teksti) {
    return String(teksti === undefined || teksti === null ? "" : teksti)
        .replace(/\s+/g, " ").replace(/^ | $/g, "");
}

function normalisoi(nimi) {
    return siisti(nimi).toLowerCase();
}

function _maara(luku, yksikko) {
    return yksikko ? luku + " " + yksikko.toLowerCase() : luku;
}

// "2 maitoa" / "maito 2 l" / "kananmunat x2" → {nimi, maara}; tyhjä syöte → null.
// Määrä on vapaata tekstiä ("2", "1,5 l"), koska se vain näytetään ja yhdistetään.
function jasenna(syote) {
    var s = siisti(syote);
    if (s === "")
        return null;
    var m = _PLUSSAT.exec(s);
    if (m)
        return { nimi: m[1], maara: siisti(m[2]).replace(/\s*\+\s*/g, " + ") };
    m = _KERTAA.exec(s);
    if (m)
        return { nimi: m[1], maara: m[2] };
    m = _ALUSSA.exec(s);
    // "1 % maito": prosentti kuuluu nimeen, ei ole määrä.
    if (m && m[3].charAt(0) !== "%")
        return { nimi: m[3], maara: _maara(m[1], m[2]) };
    m = _LOPUSSA.exec(s);
    if (m)
        return { nimi: m[1], maara: _maara(m[2], m[3]) };
    return { nimi: s, maara: "" };
}

function _jaaMaara(maara) {
    var m = /^(\d+(?:[.,]\d+)?)(?: (\S+))?$/.exec(siisti(maara));
    if (!m)
        return null;
    return { luku: parseFloat(m[1].replace(",", ".")), pilkku: m[1].indexOf(",") >= 0,
             yksikko: (m[2] || "").toLowerCase() };
}

// Sama tuote lisätään uudelleen: samat yksiköt lasketaan yhteen, muuten merkinnät
// ketjutetaan plussalla ("3 + 2sin" ja "1" → "3 + 2sin + 1"), jottei mitään katoa.
function yhdistaMaarat(vanha, uusi) {
    vanha = siisti(vanha);
    uusi = siisti(uusi);
    if (uusi === "")
        return vanha;
    if (vanha === "")
        return uusi;
    var a = _jaaMaara(vanha), b = _jaaMaara(uusi);
    if (!a || !b || a.yksikko !== b.yksikko)
        return vanha + " + " + uusi;
    var summa = String(Math.round((a.luku + b.luku) * 1000) / 1000);
    if (a.pilkku || b.pilkku)
        summa = summa.replace(".", ",");
    return _maara(summa, b.yksikko);
}

// historia: [{nimi, kerrat, viimeksi}], listalla: {avain: true} (ostamatta olevat).
// Koko nimen alusta osuvat ensin, sitten sanan alusta osuvat; kummankin sisällä
// useimmin ja viimeksi ostetut ensin.
function ehdotukset(historia, alku, listalla, n) {
    var a = normalisoi(alku);
    if (a === "")
        return [];
    var osumat = [];
    for (var i = 0; i < historia.length; ++i) {
        var h = historia[i];
        var avain = normalisoi(h.nimi);
        if (listalla && listalla[avain])
            continue;
        var taso = -1;
        if (avain.indexOf(a) === 0)
            taso = 0;
        else if ((" " + avain).indexOf(" " + a) >= 0)
            taso = 1;
        if (taso >= 0)
            osumat.push({ h: h, taso: taso });
    }
    osumat.sort(function (x, y) {
        return (x.taso - y.taso) || (y.h.kerrat - x.h.kerrat) || (y.h.viimeksi - x.h.viimeksi)
            || (normalisoi(x.h.nimi) < normalisoi(y.h.nimi) ? -1 : 1);
    });
    var tulos = [];
    for (var j = 0; j < osumat.length && j < (n || 5); ++j)
        tulos.push(osumat[j].h.nimi);
    return tulos;
}

// Ostettavat lisäysjärjestyksessä ylhäällä, kerätyt alla viimeksi kerätty ensin.
function jarjesta(tuotteet) {
    var kopio = tuotteet.slice();
    kopio.sort(function (x, y) {
        var xk = x.keratty ? 1 : 0, yk = y.keratty ? 1 : 0;
        if (xk !== yk)
            return xk - yk;
        if (xk)
            return (y.keratty - x.keratty) || (y.id - x.id);
        return (x.lisatty - y.lisatty) || (x.id - y.id);
    });
    return kopio;
}
