import QtQuick 2.0
import Sailfish.Silica 1.0
import "../js/logic.js" as Logic

// The remembered items (the history behind the suggestions), for fixing typos and removing
// items. The model is filled once and changed in place: deleting a row in the middle of a
// long list does not jump back to the top.
Page {
    id: page
    allowedOrientations: Orientation.All

    ListModel { id: suggestionModel }

    function fill() {
        var h = app.history.slice(0);
        h.sort(function (a, b) { return Logic.normalize(a.name).localeCompare(Logic.normalize(b.name)); });
        suggestionModel.clear();
        for (var i = 0; i < h.length; ++i)
            suggestionModel.append({ name: h[i].name, times: h[i].times });
    }

    function forget(name) {
        for (var i = 0; i < suggestionModel.count; ++i) {
            if (suggestionModel.get(i).name === name) {
                suggestionModel.remove(i);
                break;
            }
        }
        app.forget(name);
    }

    // A rename can merge two rows and changes the order → fill again, then show the fixed row.
    function rename(oldName, newName) {
        app.renameSuggestion(oldName, newName);
        var y = list.contentY;
        fill();
        list.contentY = y;
        var key = Logic.normalize(newName);
        for (var i = 0; i < suggestionModel.count; ++i) {
            if (Logic.normalize(suggestionModel.get(i).name) === key) {
                list.positionViewAtIndex(i, ListView.Contain);
                break;
            }
        }
    }

    Component.onCompleted: fill()

    SilicaListView {
        id: list
        anchors.fill: parent
        model: suggestionModel

        header: PageHeader { title: qsTr("Suggestions") }

        delegate: ListItem {
            id: row
            contentHeight: Theme.itemSizeSmall
            ListView.onRemove: animateRemoval(row)

            menu: ContextMenu {
                MenuItem {
                    text: qsTr("Edit")
                    onClicked: pageStack.push(renameDialog, { name: model.name })
                }
                MenuItem {
                    text: qsTr("Delete")
                    onClicked: {
                        var name = model.name;
                        row.remorseDelete(function () { page.forget(name); });
                    }
                }
            }

            onClicked: pageStack.push(renameDialog, { name: model.name })

            Label {
                anchors {
                    left: parent.left
                    right: timesLabel.left
                    leftMargin: Theme.horizontalPageMargin
                    rightMargin: Theme.paddingMedium
                    verticalCenter: parent.verticalCenter
                }
                text: model.name
                truncationMode: TruncationMode.Fade
                color: row.highlighted ? Theme.highlightColor : Theme.primaryColor
            }
            // How many times the item has been added: a typo is usually there only once.
            Label {
                id: timesLabel
                anchors {
                    right: parent.right
                    rightMargin: Theme.horizontalPageMargin
                    verticalCenter: parent.verticalCenter
                }
                text: model.times + "×"
                font.pixelSize: Theme.fontSizeSmall
                color: row.highlighted ? Theme.secondaryHighlightColor : Theme.secondaryColor
            }
        }

        ViewPlaceholder {
            enabled: list.count === 0
            text: qsTr("No suggestions")
            hintText: qsTr("Items you add are remembered here and offered as suggestions")
        }

        VerticalScrollDecorator { }
    }

    Component {
        id: renameDialog

        Dialog {
            id: dialog
            property string name

            canAccept: nameField.text.replace(/\s/g, "").length > 0
            onAccepted: page.rename(name, nameField.text)
            onStatusChanged: {
                if (status === PageStatus.Active)
                    nameField.forceActiveFocus();
            }

            Column {
                width: parent.width

                DialogHeader {
                    acceptText: qsTr("Save")
                    cancelText: qsTr("Cancel")
                }

                TextField {
                    id: nameField
                    width: parent.width
                    label: qsTr("Suggestion")
                    placeholderText: label
                    text: dialog.name
                    EnterKey.iconSource: "image://theme/icon-m-enter-accept"
                    EnterKey.enabled: dialog.canAccept
                    EnterKey.onClicked: dialog.accept()
                }

                Label {
                    x: Theme.horizontalPageMargin
                    width: parent.width - 2 * x
                    wrapMode: Text.Wrap
                    font.pixelSize: Theme.fontSizeSmall
                    color: Theme.secondaryHighlightColor
                    text: qsTr("If the name is already a suggestion, the two are combined. "
                               + "Items on the list do not change.")
                }
            }
        }
    }
}
