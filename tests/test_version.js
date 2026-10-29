"use strict";
// The version shown in Settings must match the package version.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("app.version matches the spec Version", () => {
    const spec = /^Version:\s*(\S+)/m.exec(read("rpm/harbour-kauppalappu.spec"))[1];
    const qml = /readonly property string version: "([^"]+)"/.exec(read("qml/harbour-kauppalappu.qml"));
    assert.ok(qml, "version property not found");
    assert.equal(qml[1], spec);
});
