Name:       harbour-kauppalappu
Version:    0.2.3
Release:    1
Summary:    Shopping list for Sailfish OS
License:    MIT
BuildArch:  noarch
Requires:   sailfishsilica-qt5 >= 0.10.9
Requires:   libsailfishapp-launcher
Requires:   qt5-qtdeclarative-import-localstorageplugin
Requires:   nemo-qml-plugin-notifications-qt5
Requires:   nemo-qml-plugin-configuration-qt5

%description
Kauppalappu is a simple shopping list for Sailfish OS. Add items with a
quantity, tick them off as you shop, and drag them into the order you walk
through the store. Items you have added before are offered as suggestions,
and adding the same item again merges the quantities. If a watch is paired
with Amazfish, the list can also be sent to the watch, where it updates as
you shop.

All data stays on the phone. The app is translated into Finnish, German,
Spanish, French, Italian, Dutch, Polish, Russian and Swedish.

Note: this app was written with heavy use of an LLM tool. Most of the code,
tests and translations were written by Claude (Claude Opus 5.5, Anthropic)
through Claude Code, under the author's direction and testing.

%install
# Sources straight from the work tree: rpmbuild is run from the Makefile with
# --define "_sourcedir <repo>"; the .qm files are built by "make qm" into dist/translations.
install -d %{buildroot}%{_datadir}/%{name}/translations
# Harbour allows files only under the app's own paths, not /usr/share/licenses.
install -m 644 %{_sourcedir}/LICENSE %{buildroot}%{_datadir}/%{name}/LICENSE
cp -r %{_sourcedir}/qml %{buildroot}%{_datadir}/%{name}/
install -m 644 %{_sourcedir}/dist/translations/*.qm %{buildroot}%{_datadir}/%{name}/translations/
install -D -m 644 %{_sourcedir}/%{name}.desktop %{buildroot}%{_datadir}/applications/%{name}.desktop
for s in 86 108 128 172; do
    install -D -m 644 %{_sourcedir}/icons/${s}x${s}.png \
        %{buildroot}%{_datadir}/icons/hicolor/${s}x${s}/apps/%{name}.png
done

%files
%defattr(-,root,root,-)
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/*/apps/%{name}.png
