# Kauppalappu

> **Made with an LLM.** This app was built with heavy use of an LLM tool: most of the code,
> tests and translations were written by **Claude** (Claude Opus 5.5, Anthropic) through
> Claude Code. The author directed the work, tested every change on a Jolla phone and a
> watch, and reviewed the result.

A shopping list for Sailfish OS (5.2). *Kauppalappu* is Finnish for a shopping note. Pure
QML + JavaScript (`sailfish-qml`): no C++ and no Sailfish SDK needed. Data is kept in an
SQLite database on the phone (QtQuick.LocalStorage), in the Sailjail data directory
`~/.local/share/fi.jmp/kauppalappu/`.

- Input: `2 l milk`, `Pepsi Max 1,5 l`, `eggs x2`, `Milk 3 + 2 skimmed` (parts joined with
  plus signs are kept as the quantity verbatim). Adding the same item again merges the
  quantities: equal units are summed, anything else is chained with a plus.
- Tap to tick an item, long press to edit or delete. Pull-down menu: clear collected.
- Order: drag an item to buy by its handle (≡); the list scrolls by itself at the edges.
  A new item goes to the end.
- Suggestions from items added before: a tap fills the name into the field (`Onion `), and
  the quantity can be typed after it. A long press on a suggestion forgets it.
- Watch (optional): pull-down → Send to watch posts the items to buy as a notification,
  which [Amazfish](https://github.com/piggz/harbour-amazfish) forwards to the watch (read
  only). Adding, editing, deleting and ticking items update the list on the watch by
  themselves until everything is collected. The watch items are shown only when a watch is
  paired in Amazfish.

Recognised units are listed in `UNITS` in `qml/js/logic.js` (metric units, a few Finnish
packaging abbreviations, `pcs`, `oz`, `lb`); extending the list is a one-line change.

## Translations

Qt Linguist files in `translations/` (`harbour-kauppalappu-<lang>.ts`); the source language
is English. Finnish (the app's original language) is reviewed by the author. **German,
Spanish, French, Italian, Dutch, Polish, Russian and Swedish were translated by the LLM** —
the texts are short and generic, but corrections from native speakers are very welcome.

New language: copy an existing `.ts` file to `harbour-kauppalappu-<lang>.ts`, set
`language="<lang>"`, run `make ts` and translate (Qt Linguist or a text editor).

## Development

    make test     # Node >= 22: logic, storage (node:sqlite as a LocalStorage stand-in), ES5 guard
    make ts       # refresh translations/*.ts from the sources (lupdate-qt5)
    make copy     # builds the noarch RPM (needs lrelease-qt5, rpmbuild) and copies it to the phone's /tmp
    # on the phone: devel-su pkcon -y -p install-local /tmp/harbour-kauppalappu-<version>-1.noarch.rpm

**Qt 5.6 = ES5:** no `let`/`const`/arrow functions/template strings under `qml/`
(`tests/test_es5.js`). QtQuick imports are `2.0`, no Qt >= 5.7 features (e.g. `padding`).
Sailjail prevents starting the app over SSH — open it from the phone's UI.

The icon is drawn by `icons/draw.sh` (ImageMagick 7).

## License

MIT, see [LICENSE](LICENSE). © 2026 jmpx448.
