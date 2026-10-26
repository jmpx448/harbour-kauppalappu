import QtQuick 2.0
import Sailfish.Silica 1.0
import "../js/logiikka.js" as Logiikka

Page {
    id: sivu
    allowedOrientations: Orientation.All

    RemorsePopup { id: tyhjennys }

    SilicaListView {
        id: lista
        anchors.fill: parent
        model: app.tuotteet

        PullDownMenu {
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
                // Ehdotusten näkyessä fokus pidetään, muuten listan napautus sulkee näppäimistön.
                focusOutBehavior: ehdotusRivi.visible ? FocusBehavior.KeepFocus : FocusBehavior.ClearItemFocus
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
                    right: parent.right
                    rightMargin: Theme.horizontalPageMargin
                    verticalCenter: parent.verticalCenter
                }
                text: model.maara
                color: model.keratty ? Theme.secondaryColor
                                     : (rivi.highlighted ? Theme.secondaryHighlightColor : Theme.secondaryColor)
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
