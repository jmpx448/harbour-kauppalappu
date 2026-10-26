import QtQuick 2.0
import Sailfish.Silica 1.0

// Kansi kotinäkymässä: montako on ostamatta ja ensimmäiset viisi.
CoverBackground {
    Column {
        x: Theme.paddingLarge
        y: Theme.paddingLarge
        width: parent.width - 2 * x
        spacing: Theme.paddingSmall
        visible: app.ostettavia > 0

        Label {
            text: app.ostettavia
            font.pixelSize: Theme.fontSizeHuge
            color: Theme.highlightColor
        }
        Label {
            text: app.ostettavia === 1 ? "ostettava" : "ostettavaa"
            color: Theme.secondaryColor
        }
        Repeater {
            model: app.kannenNimet
            Label {
                width: parent.width
                text: modelData
                truncationMode: TruncationMode.Fade
                font.pixelSize: Theme.fontSizeSmall
            }
        }
    }

    CoverPlaceholder {
        visible: app.ostettavia === 0
        text: "Lista on tyhjä"
        icon.source: "/usr/share/icons/hicolor/86x86/apps/harbour-ostoslista.png"
    }
}
