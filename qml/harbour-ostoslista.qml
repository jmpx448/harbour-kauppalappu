import QtQuick 2.0
import Sailfish.Silica 1.0
import QtQuick.LocalStorage 2.0
import "js/tietokanta.js" as Tietokanta
import "js/logiikka.js" as Logiikka
import "pages"
import "cover"

ApplicationWindow {
    id: app

    property var db: null
    property alias tuotteet: tuoteMalli
    property int ostettavia: 0
    property int kerattyja: 0
    property var historia: []
    property var listalla: ({})
    property var kannenNimet: []

    // Rivit: tid, nimi, maara, keratty (bool), osio ("Ostettavat" / "Kerätyt").
    ListModel { id: tuoteMalli }

    // Malli päivitetään paikallaan (insert/move/set) eikä tyhjennetä: lista ei hyppää
    // alkuun eikä menetä vieritystä, kun tuote rastitaan.
    function _synkronoi(uudet) {
        for (var i = 0; i < uudet.length; ++i) {
            var j = -1;
            for (var k = i; k < tuoteMalli.count; ++k) {
                if (tuoteMalli.get(k).tid === uudet[i].tid) {
                    j = k;
                    break;
                }
            }
            if (j < 0) {
                tuoteMalli.insert(i, uudet[i]);
            } else {
                if (j !== i)
                    tuoteMalli.move(j, i, 1);
                tuoteMalli.set(i, uudet[i]);
            }
        }
        while (tuoteMalli.count > uudet.length)
            tuoteMalli.remove(tuoteMalli.count - 1);
    }

    function lataa() {
        var t = Tietokanta.tuotteet(db);
        var uudet = [], auki = {}, kannelle = [], o = 0;
        for (var i = 0; i < t.length; ++i) {
            var keratty = t[i].keratty !== 0;
            uudet.push({ tid: t[i].id, nimi: t[i].nimi, maara: t[i].maara, keratty: keratty,
                         osio: keratty ? "Kerätyt" : "Ostettavat" });
            if (!keratty) {
                ++o;
                auki[Logiikka.normalisoi(t[i].nimi)] = true;
                if (kannelle.length < 5)
                    kannelle.push(t[i].nimi);
            }
        }
        _synkronoi(uudet);
        ostettavia = o;
        kerattyja = t.length - o;
        listalla = auki;
        kannenNimet = kannelle;
        historia = Tietokanta.historia(db);
    }

    // Palauttaa false, jos syöte oli tyhjä (kenttää ei silloin tyhjennetä).
    function lisaa(teksti) {
        var r = Tietokanta.lisaa(db, teksti, Date.now());
        lataa();
        return r.tila !== "tyhja";
    }
    function vaihdaKeratty(tid) { Tietokanta.vaihdaKeratty(db, tid, Date.now()); lataa(); }
    function muokkaa(tid, nimi, maara) { Tietokanta.muokkaa(db, tid, nimi, maara); lataa(); }
    function poista(tid) { Tietokanta.poista(db, tid); lataa(); }
    function tyhjennaKeratyt() { Tietokanta.tyhjennaKeratyt(db); lataa(); }
    function unohda(nimi) { Tietokanta.unohda(db, nimi); lataa(); }

    Component.onCompleted: {
        db = LocalStorage.openDatabaseSync("ostoslista", "", "Ostoslista", 1000000);
        Tietokanta.alusta(db);
        lataa();
    }

    initialPage: Component { ListaSivu { } }
    cover: Component { KansiSivu { } }
    allowedOrientations: defaultAllowedOrientations
}
