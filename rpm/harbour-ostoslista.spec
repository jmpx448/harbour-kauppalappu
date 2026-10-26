Name:       harbour-ostoslista
Version:    0.1.2
Release:    1
Summary:    Ostoslista Sailfish OS:lle
License:    MIT
BuildArch:  noarch
Requires:   sailfishsilica-qt5 >= 0.10.9
Requires:   libsailfishapp-launcher
Requires:   qt5-qtdeclarative-import-localstorageplugin

%description
Yksinkertainen ostoslista: tuotteet ja määrät, rasti kerätyille, ehdotukset aiemmin
ostetuista. Puhdas QML (sailfish-qml), tiedot puhelimen SQLite-tietokannassa.

%install
# Lähteet suoraan työpuusta: rpmbuild ajetaan Makefilestä --define "_sourcedir <repo>".
install -d %{buildroot}%{_datadir}/%{name}
cp -r %{_sourcedir}/qml %{buildroot}%{_datadir}/%{name}/
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
