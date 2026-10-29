import QtQuick 2.0
import Sailfish.Silica 1.0
import QtQuick.LocalStorage 2.0
import Nemo.Notifications 1.0
import "js/storage.js" as Storage
import "js/logic.js" as Logic
import "pages"
import "cover"

ApplicationWindow {
    id: app

    readonly property string version: "0.2.4"
    property var db: null
    property alias items: itemModel
    property int toBuyCount: 0
    property int collectedCount: 0
    property var history: []
    property var onList: ({})
    property var coverNames: []

    // Rows: itemId, name, quantity, collected (bool), group ("toBuy" / "collected").
    ListModel { id: itemModel }

    // The model is updated in place (insert/move/set), not cleared: the list does not jump
    // to the top or lose its scroll position when an item is ticked.
    function _sync(rows) {
        for (var i = 0; i < rows.length; ++i) {
            var j = -1;
            for (var k = i; k < itemModel.count; ++k) {
                if (itemModel.get(k).itemId === rows[i].itemId) {
                    j = k;
                    break;
                }
            }
            if (j < 0) {
                itemModel.insert(i, rows[i]);
            } else {
                if (j !== i)
                    itemModel.move(j, i, 1);
                itemModel.set(i, rows[i]);
            }
        }
        while (itemModel.count > rows.length)
            itemModel.remove(itemModel.count - 1);
    }

    function load() {
        var t = Storage.items(db);
        var rows = [], open = {}, cover = [], n = 0;
        for (var i = 0; i < t.length; ++i) {
            var collected = t[i].collected !== 0;
            rows.push({ itemId: t[i].id, name: t[i].name, quantity: t[i].quantity, collected: collected,
                        group: collected ? "collected" : "toBuy" });
            if (!collected) {
                ++n;
                open[Logic.normalize(t[i].name)] = true;
                if (cover.length < 5)
                    cover.push(t[i].name);
            }
        }
        _sync(rows);
        toBuyCount = n;
        collectedCount = t.length - n;
        onList = open;
        coverNames = cover;
        history = Storage.history(db);
    }

    // Returns false if the input was empty (the field is then not cleared).
    function add(text) {
        var r = Storage.add(db, text, Date.now());
        load();
        if (r.status === "empty")
            return false;
        if (watchActive)
            sendToWatch();
        return true;
    }
    function toggleCollected(itemId) {
        Storage.toggleCollected(db, itemId, Date.now());
        load();
        if (watchActive)
            sendToWatch();
    }
    // Editing or deleting a collected item does not change the watch list (it only has items to buy).
    function _isToBuy(itemId) {
        for (var i = 0; i < itemModel.count; ++i) {
            if (itemModel.get(i).itemId === itemId)
                return !itemModel.get(i).collected;
        }
        return false;
    }
    function edit(itemId, name, quantity) {
        var toBuy = _isToBuy(itemId);
        Storage.edit(db, itemId, name, quantity);
        load();
        if (watchActive && toBuy)
            sendToWatch();
    }
    function remove(itemId) {
        var toBuy = _isToBuy(itemId);
        Storage.remove(db, itemId);
        load();
        if (watchActive && toBuy)
            sendToWatch();
    }

    // After dragging: the items to buy are at the start of the model in the order the user
    // moved them to (ListModel.move while dragging).
    function saveOrder() {
        var ids = [];
        for (var i = 0; i < itemModel.count; ++i) {
            if (!itemModel.get(i).collected)
                ids.push(itemModel.get(i).itemId);
        }
        Storage.setOrder(db, ids);
        load();
    }

    // Watch list: the items to buy as a notification, which Amazfish forwards to the watch
    // like any other. Amazfish (libwatchfish) only forwards NEW notifications: an update with
    // the same id never reaches the watch. So the old one is closed and a new one published.
    // Amazfish also drops a notification identical to the previous one → the time is in the
    // summary. After sending, the watch list updates itself when an item is added, edited,
    // deleted or ticked (or unticked); when nothing is left to buy the watch gets "All
    // collected" (or "The list is empty" if the last one was deleted and nothing is collected)
    // and the updates stop.
    // The watch items are shown only when the user turns the watch list on in Settings (off
    // by default). The app does not look for a watch app itself: any app that forwards phone
    // notifications to a watch will do.
    property bool watchEnabled: false
    property bool watchActive: false
    function setWatchEnabled(on) {
        Storage.setSetting(db, "watch", on ? "1" : "0");
        watchEnabled = on;
        if (!on) {
            if (watchNotification.replacesId > 0) {
                watchNotification.close();
                watchNotification.replacesId = 0;
            }
            watchActive = false;
        }
    }
    Notification {
        id: watchNotification
        appName: "Kauppalappu"
        appIcon: "/usr/share/icons/hicolor/86x86/apps/harbour-kauppalappu.png"
    }
    function sendToWatch() {
        if (!watchEnabled)
            return;
        var toBuy = [];
        for (var i = 0; i < itemModel.count; ++i) {
            if (!itemModel.get(i).collected)
                toBuy.push(itemModel.get(i));
        }
        if (watchNotification.replacesId > 0) {
            watchNotification.close();
            watchNotification.replacesId = 0;
        }
        watchNotification.summary = "Kauppalappu (" + toBuy.length + ") "
                                    + Qt.formatTime(new Date(), "hh:mm");
        watchNotification.body = toBuy.length > 0 ? Logic.watchText(toBuy)
                                 : (collectedCount > 0 ? qsTr("All collected") : qsTr("The list is empty"));
        watchNotification.publish();
        watchActive = toBuy.length > 0;
    }

    function clearCollected() { Storage.clearCollected(db); load(); }
    function forget(name) { Storage.forget(db, name); load(); }

    Component.onCompleted: {
        db = LocalStorage.openDatabaseSync("kauppalappu", "", "Kauppalappu", 1000000);
        Storage.init(db);
        watchEnabled = Storage.setting(db, "watch", "0") === "1";
        load();
    }

    initialPage: Component { ListPage { } }
    cover: Component { CoverPage { } }
    allowedOrientations: defaultAllowedOrientations
}
