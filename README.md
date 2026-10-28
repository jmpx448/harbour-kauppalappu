# harbour-ostoslista

Ostoslista Jollalle (Sailfish OS 5.2). Puhdas QML + JavaScript (`sailfish-qml`), ei C++:aa eikä
Sailfish SDK:ta. Tiedot puhelimen SQLite-tietokannassa (QtQuick.LocalStorage), Sailjailin
datahakemistossa `~/.local/share/fi.jmp/ostoslista/`.

- Syöte: `2 l maitoa`, `Pepsi Max 1,5 l`, `kananmunat x2`, `Maito 3 + 2sin` (plussaosat säilyvät
  määränä sellaisenaan). Sama tuote uudelleen → määrät yhdistetään (samat yksiköt summataan,
  muuten ketjutetaan plussalla).
- Napautus rastii, pitkä painallus: muokkaa / poista. Alasveto: tyhjennä kerätyt.
- Järjestys: raahaa ostettavaa rivin kahvasta (≡); reunalla lista vierii itsestään. Uusi tuote menee loppuun.
- Alasveto → Lähetä kelloon: ostettavat ilmoituksena, Amazfish välittää sen kelloon (vain luku).
  Lisäys, muokkaus, poisto ja rastitus päivittävät kellon listan itsestään, kunnes kaikki on kerätty.
  Kellokohdat näkyvät vain, kun Amazfishiin on liitetty kello.
- Ehdotukset aiemmin lisätyistä: napautus täyttää nimen kenttään (`Sipuli `), määrä kirjoitetaan
  perään. Pitkä painallus ehdotukseen unohtaa sen.

## Kehitys

    make test     # Node ≥ 22: logiikka, tietokanta (node:sqlite LocalStorage-vastineena), ES5-vartija
    make kopioi   # rakentaa noarch-RPM:n ja kopioi sen puhelimen /tmp:hen
    # puhelimessa: devel-su pkcon -y -p install-local /tmp/harbour-ostoslista-<versio>-1.noarch.rpm

**Qt 5.6 = ES5:** ei `let`/`const`/nuolia/template-merkkijonoja qml/-hakemistossa
(`tests/test_es5.js`). QtQuick-tuonnit `2.0`, ei Qt ≥ 5.7 -ominaisuuksia (esim. `padding`).
Sailjail estää käynnistyksen SSH:sta — sovellus avataan puhelimen käyttöliittymästä.
