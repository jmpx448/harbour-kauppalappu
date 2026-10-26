import QtQuick 2.0
import Sailfish.Silica 1.0

Dialog {
    id: dialogi
    property int tid
    property string nimi
    property string maara

    canAccept: nimiKentta.text.replace(/\s/g, "").length > 0
    onAccepted: app.muokkaa(tid, nimiKentta.text, maaraKentta.text)

    Column {
        width: parent.width

        DialogHeader {
            acceptText: "Tallenna"
            cancelText: "Peru"
        }

        TextField {
            id: nimiKentta
            width: parent.width
            label: "Tuote"
            placeholderText: label
            text: dialogi.nimi
            EnterKey.iconSource: "image://theme/icon-m-enter-next"
            EnterKey.onClicked: maaraKentta.forceActiveFocus()
        }

        TextField {
            id: maaraKentta
            width: parent.width
            label: "Määrä"
            placeholderText: "Määrä, esim. 2 tai 1,5 l"
            text: dialogi.maara
            EnterKey.iconSource: "image://theme/icon-m-enter-accept"
            EnterKey.enabled: dialogi.canAccept
            EnterKey.onClicked: dialogi.accept()
        }
    }
}
