import QtQuick 2.0
import Sailfish.Silica 1.0

Page {
    allowedOrientations: Orientation.All

    SilicaFlickable {
        anchors.fill: parent
        contentHeight: column.height + Theme.paddingLarge

        Column {
            id: column
            width: parent.width

            PageHeader { title: qsTr("Settings") }

            SectionHeader { text: qsTr("Watch") }

            // automaticCheck off: the switch follows app.watchEnabled instead of keeping its
            // own state, so the binding is not broken by a tap.
            TextSwitch {
                text: qsTr("Watch list")
                description: qsTr("Adds “Send to watch” to the pull-down menu. The items to buy are "
                                  + "sent as a notification, which a watch app such as Amazfish "
                                  + "forwards to the watch, and the list updates as you shop.")
                automaticCheck: false
                checked: app.watchEnabled
                onClicked: app.setWatchEnabled(!app.watchEnabled)
            }

            SectionHeader { text: qsTr("Suggestions") }

            ValueButton {
                label: qsTr("Edit suggestions")
                value: app.history.length
                onClicked: pageStack.push(Qt.resolvedUrl("SuggestionsPage.qml"))
            }
            Label {
                x: Theme.horizontalPageMargin
                width: parent.width - 2 * x
                wrapMode: Text.Wrap
                font.pixelSize: Theme.fontSizeSmall
                color: Theme.secondaryHighlightColor
                text: qsTr("Every item you add is remembered and offered as a suggestion. "
                           + "Fix typos or remove items you no longer want.")
            }

            SectionHeader { text: qsTr("About") }

            DetailItem {
                label: qsTr("Version")
                value: app.version
            }
            DetailItem {
                label: qsTr("License")
                value: "MIT"
            }

            Label {
                x: Theme.horizontalPageMargin
                width: parent.width - 2 * x
                wrapMode: Text.Wrap
                font.pixelSize: Theme.fontSizeSmall
                color: Theme.secondaryHighlightColor
                text: qsTr("Made with heavy use of an LLM tool: most of the code, tests and translations "
                           + "were written by Claude (Anthropic) through Claude Code, under the "
                           + "author's direction and testing.")
            }

            Item { width: 1; height: Theme.paddingLarge }

            Button {
                anchors.horizontalCenter: parent.horizontalCenter
                text: qsTr("Source code")
                onClicked: Qt.openUrlExternally("https://github.com/jmpx448/harbour-kauppalappu")
            }
        }
    }
}
