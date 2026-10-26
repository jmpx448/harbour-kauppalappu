// Sailfish OS 5.2:n Qt 5.6 ajaa vain ES5:tä. ES6-syntaksi kaataa sovelluksen vasta
// puhelimessa, joten se pysäytetään jo täällä kaikista qml/-hakemiston tiedostoista.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const QML = path.join(__dirname, "..", "qml");
const KIELLETYT = [
    [/\blet\s+[A-Za-z_$]/, "let"],
    [/\bconst\s+[A-Za-z_$]/, "const"],
    [/=>/, "nuolifunktio"],
    [/`/, "template-merkkijono"],
    [/\bclass\s+[A-Z]/, "class"],
    [/\.\.\.[A-Za-z_$[]/, "spread"],
    [/\b(async|await)\b/, "async/await"],
];

function tiedostot(hak) {
    return fs.readdirSync(hak, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(hak, e.name);
        return e.isDirectory() ? tiedostot(p) : /\.(js|qml)$/.test(e.name) ? [p] : [];
    });
}

// Kommentit ja merkkijonot pois ennen tarkistusta, ettei "const" kommentissa hälytä.
function koodiksi(lahde) {
    return lahde
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
        .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
}

test("qml/-hakemistossa ei ole ES6-syntaksia", () => {
    const loydot = [];
    for (const f of tiedostot(QML)) {
        koodiksi(fs.readFileSync(f, "utf8")).split("\n").forEach((rivi, i) => {
            for (const [re, nimi] of KIELLETYT)
                if (re.test(rivi))
                    loydot.push(`${path.relative(QML, f)}:${i + 1}: ${nimi}`);
        });
    }
    assert.deepEqual(loydot, []);
});

test("tarkistin itse löytää ES6:n (ei tyhjää vartijaa)", () => {
    const näyte = koodiksi("var a = 1; // const ok\nlet b = 2;\nvar f = (x) => x;\nvar s = \"=> ok\";");
    const osumat = KIELLETYT.filter(([re]) => re.test(näyte)).map(([, n]) => n);
    assert.deepEqual(osumat, ["let", "nuolifunktio"]);
});
