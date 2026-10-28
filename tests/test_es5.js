// Sailfish OS 5.2's Qt 5.6 only runs ES5. ES6 syntax would only crash the app on the
// phone, so it is stopped here already, in every file under qml/.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const QML = path.join(__dirname, "..", "qml");
const FORBIDDEN = [
    [/\blet\s+[A-Za-z_$]/, "let"],
    [/\bconst\s+[A-Za-z_$]/, "const"],
    [/=>/, "arrow function"],
    [/`/, "template string"],
    [/\bclass\s+[A-Z]/, "class"],
    [/\.\.\.[A-Za-z_$[]/, "spread"],
    [/\b(async|await)\b/, "async/await"],
];

function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(dir, e.name);
        return e.isDirectory() ? files(p) : /\.(js|qml)$/.test(e.name) ? [p] : [];
    });
}

// Comments and strings are removed first, so that "const" in a comment does not trigger.
function codeOnly(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
}

test("no ES6 syntax under qml/", () => {
    const found = [];
    for (const f of files(QML)) {
        codeOnly(fs.readFileSync(f, "utf8")).split("\n").forEach((line, i) => {
            for (const [re, name] of FORBIDDEN)
                if (re.test(line))
                    found.push(`${path.relative(QML, f)}:${i + 1}: ${name}`);
        });
    }
    assert.deepEqual(found, []);
});

test("the checker itself finds ES6 (not an empty guard)", () => {
    const sample = codeOnly("var a = 1; // const ok\nlet b = 2;\nvar f = (x) => x;\nvar s = \"=> ok\";");
    const hits = FORBIDDEN.filter(([re]) => re.test(sample)).map(([, n]) => n);
    assert.deepEqual(hits, ["let", "arrow function"]);
});
