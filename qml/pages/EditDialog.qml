import QtQuick 2.0
import Sailfish.Silica 1.0

Dialog {
    id: dialog
    property int itemId
    property string name
    property string quantity

    canAccept: nameField.text.replace(/\s/g, "").length > 0
    onAccepted: app.edit(itemId, nameField.text, quantityField.text)

    Column {
        width: parent.width

        DialogHeader {
            acceptText: qsTr("Save")
            cancelText: qsTr("Cancel")
        }

        TextField {
            id: nameField
            width: parent.width
            label: qsTr("Item")
            placeholderText: label
            text: dialog.name
            EnterKey.iconSource: "image://theme/icon-m-enter-next"
            EnterKey.onClicked: quantityField.forceActiveFocus()
        }

        TextField {
            id: quantityField
            width: parent.width
            label: qsTr("Quantity")
            placeholderText: qsTr("Quantity, e.g. 2 or 1.5 l")
            text: dialog.quantity
            EnterKey.iconSource: "image://theme/icon-m-enter-accept"
            EnterKey.enabled: dialog.canAccept
            EnterKey.onClicked: dialog.accept()
        }
    }
}
