import QtQuick 2.0
import Sailfish.Silica 1.0
import "../js/logic.js" as Logic

Page {
    id: page
    allowedOrientations: Orientation.All

    // itemId of the item being dragged, -1 when nothing is dragged.
    property int dragged: -1
    // Finger y in the list's view (not its content) while dragging: scrolling moves the
    // content under the finger even when the finger does not move.
    property real fingerY: 0

    // Moves the dragged item under the finger; collected items do not move, so the target
    // is limited to the items to buy (they are at the start of the model).
    function moveUnderFinger() {
        var target = list.indexAt(list.width / 2, list.contentY + fingerY);
        if (target < 0)
            return;
        target = Math.min(target, app.toBuyCount - 1);
        for (var i = 0; i < app.items.count; ++i) {
            if (app.items.get(i).itemId === dragged) {
                if (i !== target)
                    app.items.move(i, target, 1);
                return;
            }
        }
    }

    // Automatic scrolling when the dragged item is taken to the top or bottom edge of the
    // view. The speed grows towards the edge.
    Timer {
        interval: 16
        repeat: true
        running: page.dragged >= 0
        onTriggered: {
            var edge = Theme.itemSizeSmall;
            var y = Math.max(0, Math.min(list.height, page.fingerY));
            var step = 0;
            if (y < edge)
                step = -Math.ceil(Theme.paddingLarge * (edge - y) / edge);
            else if (y > list.height - edge)
                step = Math.ceil(Theme.paddingLarge * (y - (list.height - edge)) / edge);
            if (step === 0)
                return;
            // The limits keep the pull-down menu closed and the content in view.
            var low = list.originY;
            var high = Math.max(low, list.originY + list.contentHeight - list.height);
            var next = Math.max(low, Math.min(high, list.contentY + step));
            // Down only to the end of the items to buy: otherwise the dragged item (limited to
            // the last item to buy) would escape from under the finger and its delegate could
            // be destroyed mid-drag.
            if (step > 0) {
                var k = list.indexAt(list.width / 2, next + page.fingerY);
                if (k < 0 || k >= app.toBuyCount)
                    return;
            }
            if (next === list.contentY)
                return;
            list.contentY = next;
            page.moveUnderFinger();
        }
    }

    RemorsePopup { id: clearRemorse }
    RemorsePopup { id: forgetRemorse }

    SilicaListView {
        id: list
        anchors.fill: parent
        model: app.items

        PullDownMenu {
            MenuItem {
                text: qsTr("Settings")
                onClicked: pageStack.push(Qt.resolvedUrl("SettingsPage.qml"))
            }
            MenuItem {
                text: qsTr("Send to watch")
                visible: app.watchEnabled
                enabled: app.toBuyCount > 0
                onClicked: app.sendToWatch()
            }
            MenuItem {
                text: qsTr("Clear collected")
                enabled: app.collectedCount > 0
                onClicked: clearRemorse.execute(qsTr("Clearing collected"), function () { app.clearCollected(); })
            }
        }

        header: Column {
            width: list.width

            PageHeader {
                title: qsTr("Shopping list")
                description: app.toBuyCount > 0 ? qsTr("%n to buy", "", app.toBuyCount) : ""
            }

            TextField {
                id: input
                width: parent.width
                label: qsTr("Add item")
                placeholderText: qsTr("Add item, e.g. 2 l milk")
                // Predictive input keeps the current word "pre-edited", so text would not
                // update before a space and no suggestions would show while typing.
                inputMethodHints: Qt.ImhNoPredictiveText
                // The default (ClearItemFocus) takes the focus and keyboard away when a
                // suggestion is tapped. Silica decides this with a 1 ms timer AFTER the tap,
                // when filling in has already hidden the suggestion row — hence the condition
                // is "the field has text", not the row's visibility. With an empty field,
                // tapping the list closes the keyboard as before.
                focusOutBehavior: text.length > 0 ? FocusBehavior.KeepFocus : FocusBehavior.ClearItemFocus
                EnterKey.iconSource: "image://theme/icon-m-add"
                EnterKey.enabled: Logic.parse(text) !== null
                EnterKey.onClicked: add(text)

                function add(t) {
                    if (app.add(t))
                        text = "";
                    forceActiveFocus();
                }
            }

            Flow {
                id: suggestionRow
                property var parsed: Logic.parse(input.text)
                property var names: parsed
                                    ? Logic.suggestions(app.history, parsed.name, app.onList, 6) : []
                x: Theme.horizontalPageMargin
                width: parent.width - 2 * x
                spacing: Theme.paddingMedium
                visible: names.length > 0

                Repeater {
                    model: suggestionRow.names
                    delegate: BackgroundItem {
                        width: suggestionText.width + 2 * Theme.paddingLarge
                        height: Theme.itemSizeExtraSmall

                        Rectangle {
                            anchors.fill: parent
                            radius: Theme.paddingSmall
                            color: Theme.rgba(Theme.highlightBackgroundColor, 0.15)
                        }
                        Label {
                            id: suggestionText
                            anchors.centerIn: parent
                            text: modelData
                            color: highlighted ? Theme.highlightColor : Theme.primaryColor
                        }
                        // Tapping fills the name into the field ("Onion "), and the quantity can
                        // be typed after it before adding: items repeat, quantities vary.
                        onClicked: {
                            var q = suggestionRow.parsed ? suggestionRow.parsed.quantity : "";
                            input.text = Logic.fillText(modelData, q);
                            input.cursorPosition = input.text.length;
                            input.forceActiveFocus();
                        }
                        // A long press removes a typo from the suggestions for good (all of
                        // them can be fixed in Settings → Edit suggestions).
                        onPressAndHold: {
                            var name = modelData;
                            forgetRemorse.execute(qsTr("Removing suggestion"), function () { app.forget(name); });
                        }
                    }
                }
            }

            // QtQuick 2.0 (Qt 5.6) Flow has no bottomPadding property.
            Item {
                width: 1
                height: Theme.paddingMedium
                visible: suggestionRow.visible
            }
        }

        // No moveDisplaced animation: with it a row was left in the wrong place on top of the
        // section header (seen on the phone, repeatable with a few items). Suspected cause:
        // Qt 5.6 computes the animation target before the section header moves to the new
        // first row.

        section.property: "group"
        section.delegate: SectionHeader { text: section === "collected" ? qsTr("Collected") : qsTr("To buy") }

        delegate: ListItem {
            id: row
            contentHeight: Theme.itemSizeSmall
            ListView.onRemove: animateRemoval(row)

            menu: ContextMenu {
                MenuItem {
                    text: qsTr("Edit")
                    onClicked: pageStack.push(Qt.resolvedUrl("EditDialog.qml"),
                                              { itemId: model.itemId, name: model.name, quantity: model.quantity })
                }
                MenuItem {
                    text: qsTr("Delete")
                    onClicked: {
                        var itemId = model.itemId;
                        row.remorseDelete(function () { app.remove(itemId); });
                    }
                }
            }

            onClicked: app.toggleCollected(model.itemId)

            Rectangle {
                anchors.fill: parent
                visible: page.dragged === model.itemId
                color: Theme.rgba(Theme.highlightBackgroundColor, 0.25)
            }

            Image {
                id: tick
                x: Theme.horizontalPageMargin
                anchors.verticalCenter: parent.verticalCenter
                // The space is always reserved so that the names stay aligned.
                source: "image://theme/icon-m-acknowledge?" + Theme.secondaryColor
                opacity: model.collected ? 1.0 : 0.0
            }
            Label {
                id: nameLabel
                anchors {
                    left: tick.right
                    leftMargin: Theme.paddingMedium
                    right: quantityLabel.left
                    rightMargin: Theme.paddingMedium
                    verticalCenter: parent.verticalCenter
                }
                text: model.name
                truncationMode: TruncationMode.Fade
                font.strikeout: model.collected
                color: model.collected ? Theme.secondaryColor
                                       : (row.highlighted ? Theme.highlightColor : Theme.primaryColor)
            }
            Label {
                id: quantityLabel
                anchors {
                    right: handle.left
                    rightMargin: Theme.paddingMedium
                    verticalCenter: parent.verticalCenter
                }
                text: model.quantity
                color: model.collected ? Theme.secondaryColor
                                       : (row.highlighted ? Theme.secondaryHighlightColor : Theme.secondaryColor)
            }

            // Handle (≡) only on items to buy: press and drag, the row follows the finger
            // (ListModel.move), the order is saved when the finger is lifted. Scrolling at the
            // edges: the Timer at the top of the page.
            Image {
                id: handle
                anchors {
                    right: parent.right
                    rightMargin: Theme.horizontalPageMargin
                    verticalCenter: parent.verticalCenter
                }
                width: model.collected ? 0 : implicitWidth
                visible: !model.collected
                source: "image://theme/icon-m-menu?" + (handleArea.pressed ? Theme.highlightColor
                                                                           : Theme.secondaryColor)

                MouseArea {
                    id: handleArea
                    anchors.fill: parent
                    anchors.margins: -Theme.paddingMedium
                    enabled: !model.collected
                    preventStealing: true

                    function stop() {
                        if (page.dragged < 0)
                            return;
                        page.dragged = -1;
                        list.interactive = true;
                        app.saveOrder();
                    }

                    onPressed: {
                        list.interactive = false;
                        page.fingerY = mapToItem(list, mouse.x, mouse.y).y;
                        page.dragged = model.itemId;
                    }
                    onPositionChanged: {
                        page.fingerY = mapToItem(list, mouse.x, mouse.y).y;
                        page.moveUnderFinger();
                    }
                    onReleased: stop()
                    onCanceled: stop()
                }
            }
        }

        ViewPlaceholder {
            enabled: list.count === 0
            text: qsTr("The list is empty")
            hintText: qsTr("Type an item in the field above")
        }

        VerticalScrollDecorator { }
    }
}
