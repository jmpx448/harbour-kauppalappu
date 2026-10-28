import QtQuick 2.0
import Sailfish.Silica 1.0

// Cover on the home screen: how many items are left to buy and the first five.
CoverBackground {
    Column {
        x: Theme.paddingLarge
        y: Theme.paddingLarge
        width: parent.width - 2 * x
        spacing: Theme.paddingSmall
        visible: app.toBuyCount > 0

        Label {
            text: app.toBuyCount
            font.pixelSize: Theme.fontSizeHuge
            color: Theme.highlightColor
        }
        Label {
            //: Below the number of items on the cover, e.g. "3" / "to buy"
            text: qsTr("to buy", "", app.toBuyCount)
            color: Theme.secondaryColor
        }
        Repeater {
            model: app.coverNames
            Label {
                width: parent.width
                text: modelData
                truncationMode: TruncationMode.Fade
                font.pixelSize: Theme.fontSizeSmall
            }
        }
    }

    CoverPlaceholder {
        visible: app.toBuyCount === 0
        text: qsTr("The list is empty")
        icon.source: "/usr/share/icons/hicolor/86x86/apps/harbour-kauppalappu.png"
    }
}
