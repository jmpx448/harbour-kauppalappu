Name:       harbour-kauppalappu
Version:    0.2.2
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
A simple shopping list: items and quantities, a tick for collected items, suggestions
from earlier purchases, and an optional list on the watch through Amazfish. Pure QML
(sailfish-qml), data in an SQLite database on the phone.

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
