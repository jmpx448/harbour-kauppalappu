import QtQuick 2.0
import Sailfish.Silica 1.0
import "../js/logiikka.js" as Logiikka

Page {
    id: sivu
    allowedOrientations: Orientation.All

    // Raahattavan tuotteen tid, -1 kun mitään ei raahata.
    property int raahattu: -1
    // Sormen y listan näkymässä (ei sisällössä) raahauksen aikana: vieritys siirtää
    // sisältöä sormen alla, vaikka sormi ei liiku.
    property real sormiY: 0

    // Siirtää raahattavan sormen kohdalle; kerätyt eivät siirry, joten kohde rajataan
    // ostettavien alueelle (ne ovat mallin alussa).
    function siirraSormenKohdalle() {
        var kohde = lista.indexAt(lista.width / 2, lista.contentY + sormiY);
        if (kohde < 0)
            return;
        kohde = Math.min(kohde, app.ostettavia - 1);
        for (var i = 0; i < app.tuotteet.count; ++i) {
            if (app.tuotteet.get(i).tid === raahattu) {
                if (i !== kohde)
                    app.tuotteet.move(i, kohde, 1);
                return;
            }
        }
    }

    // Automaattinen vieritys, kun raahattava viedään näkymän ylä- tai alareunaan.
    // Nopeus kasvaa reunaa kohti.
    Timer {
        interval: 16
        repeat: true
        running: sivu.raahattu >= 0
        onTriggered: {
            var reuna = Theme.itemSizeSmall;
            var y = Math.max(0, Math.min(lista.height, sivu.sormiY));
            var askel = 0;
            if (y < reuna)
                askel = -Math.ceil(Theme.paddingLarge * (reuna - y) / reuna);
            else if (y > lista.height - reuna)
                askel = Math.ceil(Theme.paddingLarge * (y - (lista.height - reuna)) / reuna);
            if (askel === 0)
                return;
            // Rajat pitävät vetovalikon kiinni ja sisällön näkymässä.
            var ala = lista.originY;
            var yla = Math.max(ala, lista.originY + lista.contentHeight - lista.height);
            var uusi = Math.max(ala, Math.min(yla, lista.contentY + askel));
            // Alas vain ostettavien loppuun asti: muuten raahattava (rajattu viimeiseksi
            // ostettavaksi) karkaisi sormen alta ja sen delegaatti voisi tuhoutua kesken.
            if (askel > 0) {
                var k = lista.indexAt(lista.width / 2, uusi + sivu.sormiY);
                if (k < 0 || k >= app.ostettavia)
                    return;
            }
            if (uusi === lista.contentY)
                return;
            lista.contentY = uusi;
            sivu.siirraSormenKohdalle();
        }
    }

    RemorsePopup { id: tyhjennys }

    SilicaListView {
        id: lista
        anchors.fill: parent
        model: app.tuotteet

        PullDownMenu {
            MenuItem {
                text: "Lähetä kelloon"
                visible: app.kelloSaatavilla
                enabled: app.ostettavia > 0
                onClicked: app.lahetaKelloon()
            }
            MenuItem {
                text: "Tyhjennä kerätyt"
                enabled: app.kerattyja > 0
                onClicked: tyhjennys.execute("Tyhjennetään kerätyt", function () { app.tyhjennaKeratyt(); })
            }
        }

        header: Column {
            width: lista.width

            PageHeader {
                title: "Ostoslista"
                description: app.ostettavia > 0 ? app.ostettavia + " ostettavaa" : ""
            }

            TextField {
                id: syote
                width: parent.width
                label: "Lisää tuote"
                placeholderText: "Lisää tuote, esim. 2 l maitoa"
                // Ennakoiva syöttö pitää sanan kesken "esimuokattuna", jolloin text ei
                // päivity ennen välilyöntiä eikä ehdotuksia näkyisi kirjoittaessa.
                inputMethodHints: Qt.ImhNoPredictiveText
                // Oletus (ClearItemFocus) vie fokuksen ja näppäimistön, kun ehdotusta napautetaan.
                // Silica päättää tästä 1 ms:n ajastimella napautuksen JÄLKEEN, jolloin täyttö on jo
                // piilottanut ehdotusrivin — siksi ehto on "kentässä on tekstiä", ei rivin näkyvyys.
                // Tyhjällä kentällä listan napautus sulkee näppäimistön kuten ennenkin.
                focusOutBehavior: text.length > 0 ? FocusBehavior.KeepFocus : FocusBehavior.ClearItemFocus
                EnterKey.iconSource: "image://theme/icon-m-add"
                EnterKey.enabled: Logiikka.jasenna(text) !== null
                EnterKey.onClicked: lisaa(text)

                function lisaa(teksti) {
                    if (app.lisaa(teksti))
                        text = "";
                    forceActiveFocus();
                }
            }

            Flow {
                id: ehdotusRivi
                property var jasennetty: Logiikka.jasenna(syote.text)
                property var nimet: jasennetty
                                    ? Logiikka.ehdotukset(app.historia, jasennetty.nimi, app.listalla, 6) : []
                x: Theme.horizontalPageMargin
                width: parent.width - 2 * x
                spacing: Theme.paddingMedium
                visible: nimet.length > 0

                Repeater {
                    model: ehdotusRivi.nimet
                    delegate: BackgroundItem {
                        width: ehdotusTeksti.width + 2 * Theme.paddingLarge
                        height: Theme.itemSizeExtraSmall

                        Rectangle {
                            anchors.fill: parent
                            radius: Theme.paddingSmall
                            color: Theme.rgba(Theme.highlightBackgroundColor, 0.15)
                        }
                        Label {
                            id: ehdotusTeksti
                            anchors.centerIn: parent
                            text: modelData
                            color: highlighted ? Theme.highlightColor : Theme.primaryColor
                        }
                        // Napautus täyttää nimen kenttään ("Sipuli "), ja määrän voi kirjoittaa
                        // perään ennen lisäystä: tuotteet toistuvat, määrät vaihtelevat.
                        onClicked: {
                            var m = ehdotusRivi.jasennetty ? ehdotusRivi.jasennetty.maara : "";
                            syote.text = Logiikka.taytto(modelData, m);
                            syote.cursorPosition = syote.text.length;
                            syote.forceActiveFocus();
                        }
                        // Pitkä painallus poistaa kirjoitusvirheen ehdotuksista pysyvästi.
                        onPressAndHold: app.unohda(modelData)
                    }
                }
            }

            // QtQuick 2.0 (Qt 5.6) Flowssa ei ole bottomPadding-ominaisuutta.
            Item {
                width: 1
                height: Theme.paddingMedium
                visible: ehdotusRivi.visible
            }
        }

        // Ei moveDisplaced-animaatiota: sen kanssa rivi jäi väärään kohtaan otsikon päälle
        // (puhelimessa 27.10., toistui muutamalla tuotteella). Epäilty syy: Qt 5.6 laskee
        // animaation kohteen ennen kuin osio-otsikko siirtyy uudelle ensimmäiselle riville.

        section.property: "osio"
        section.delegate: SectionHeader { text: section }

        delegate: ListItem {
            id: rivi
            contentHeight: Theme.itemSizeSmall
            ListView.onRemove: animateRemoval(rivi)

            menu: ContextMenu {
                MenuItem {
                    text: "Muokkaa"
                    onClicked: pageStack.push(Qt.resolvedUrl("MuokkausDialogi.qml"),
                                              { tid: model.tid, nimi: model.nimi, maara: model.maara })
                }
                MenuItem {
                    text: "Poista"
                    onClicked: {
                        var tid = model.tid;
                        rivi.remorseDelete(function () { app.poista(tid); });
                    }
                }
            }

            onClicked: app.vaihdaKeratty(model.tid)

            Rectangle {
                anchors.fill: parent
                visible: sivu.raahattu === model.tid
                color: Theme.rgba(Theme.highlightBackgroundColor, 0.25)
            }

            Image {
                id: rasti
                x: Theme.horizontalPageMargin
                anchors.verticalCenter: parent.verticalCenter
                // Paikka varataan aina, jotta nimet pysyvät samassa linjassa.
                source: "image://theme/icon-m-acknowledge?" + Theme.secondaryColor
                opacity: model.keratty ? 1.0 : 0.0
            }
            Label {
                id: nimi
                anchors {
                    left: rasti.right
                    leftMargin: Theme.paddingMedium
                    right: maara.left
                    rightMargin: Theme.paddingMedium
                    verticalCenter: parent.verticalCenter
                }
                text: model.nimi
                truncationMode: TruncationMode.Fade
                font.strikeout: model.keratty
                color: model.keratty ? Theme.secondaryColor
                                     : (rivi.highlighted ? Theme.highlightColor : Theme.primaryColor)
            }
            Label {
                id: maara
                anchors {
                    right: kahva.left
                    rightMargin: Theme.paddingMedium
                    verticalCenter: parent.verticalCenter
                }
                text: model.maara
                color: model.keratty ? Theme.secondaryColor
                                     : (rivi.highlighted ? Theme.secondaryHighlightColor : Theme.secondaryColor)
            }

            // Kahva (≡) vain ostettavissa: painetaan ja vedetään, rivi siirtyy sormen mukana
            // (ListModel.move), järjestys tallennetaan kun sormi nostetaan. Vieritys reunoilla: Timer sivun alussa.
            Image {
                id: kahva
                anchors {
                    right: parent.right
                    rightMargin: Theme.horizontalPageMargin
                    verticalCenter: parent.verticalCenter
                }
                width: model.keratty ? 0 : implicitWidth
                visible: !model.keratty
                source: "image://theme/icon-m-menu?" + (kahvaAlue.pressed ? Theme.highlightColor
                                                                          : Theme.secondaryColor)

                MouseArea {
                    id: kahvaAlue
                    anchors.fill: parent
                    anchors.margins: -Theme.paddingMedium
                    enabled: !model.keratty
                    preventStealing: true

                    function lopeta() {
                        if (sivu.raahattu < 0)
                            return;
                        sivu.raahattu = -1;
                        lista.interactive = true;
                        app.tallennaJarjestys();
                    }

                    onPressed: {
                        lista.interactive = false;
                        sivu.sormiY = mapToItem(lista, mouse.x, mouse.y).y;
                        sivu.raahattu = model.tid;
                    }
                    onPositionChanged: {
                        sivu.sormiY = mapToItem(lista, mouse.x, mouse.y).y;
                        sivu.siirraSormenKohdalle();
                    }
                    onReleased: lopeta()
                    onCanceled: lopeta()
                }
            }
        }

        ViewPlaceholder {
            enabled: lista.count === 0
            text: "Lista on tyhjä"
            hintText: "Kirjoita tuote yllä olevaan kenttään"
        }

        VerticalScrollDecorator { }
    }
}
