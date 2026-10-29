Name:       harbour-kauppalappu
Version:    0.2.4
Release:    2
Summary:    Shopping list for Sailfish OS
License:    MIT
URL:        https://github.com/jmpx448/harbour-kauppalappu
BuildArch:  noarch
# SailfishOS:Chum (OBS): the tar_git service packs the repository into this tarball.
# Locally "make rpm" packs the work tree into dist/ with the same layout.
Source0:    %{name}-%{version}.tar.bz2
# lrelease for the .qm files (openSUSE: libqt5-linguist; "make rpm" uses --nodeps).
BuildRequires: qt5-qttools-linguist
Requires:   sailfishsilica-qt5 >= 0.10.9
Requires:   libsailfishapp-launcher
Requires:   qt5-qtdeclarative-import-localstorageplugin
Requires:   nemo-qml-plugin-notifications-qt5

# The last paragraph of the description is metadata for SailfishOS:Chum, see
# https://github.com/sailfishos-chum/main/blob/main/Metadata.md (only in Chum builds).
%description
Kauppalappu is a simple shopping list for Sailfish OS. Add items with a
quantity, tick them off as you shop, and drag them into the order you walk
through the store. Items you have added before are offered as suggestions,
and adding the same item again merges the quantities. Optionally, the list
can be sent to a watch: turn the watch list on in Settings, and a watch app
such as Amazfish forwards it to the watch, where it updates as you shop.

All data stays on the phone. The app is translated into Finnish, German,
Spanish, French, Italian, Dutch, Polish, Russian and Swedish.

Note: this app was written with heavy use of an LLM tool. Most of the code,
tests and translations were written by Claude (Claude Opus 5.5, Anthropic)
through Claude Code, under the author's direction and testing.

%if 0%{?_chum}
Title: Kauppalappu
Type: desktop-application
DeveloperName: jmpx448
Categories:
 - Utility
Custom:
  Repo: https://github.com/jmpx448/harbour-kauppalappu
PackageIcon: https://github.com/jmpx448/harbour-kauppalappu/raw/main/icons/172x172.png
AIRating: V
AINote: Most of the code, tests and translations were written by Claude (Anthropic) through Claude Code; directed and tested by the author.
Links:
  Homepage: https://github.com/jmpx448/harbour-kauppalappu
  Bugtracker: https://github.com/jmpx448/harbour-kauppalappu/issues
%endif

%prep
%setup -q -n %{name}-%{version}

%build
# lrelease is lrelease-qt5 on openSUSE and under qt5/bin on Sailfish OS.
for l in lrelease-qt5 lrelease /usr/lib64/qt5/bin/lrelease /usr/lib/qt5/bin/lrelease; do
    if command -v $l >/dev/null 2>&1; then LRELEASE=$l; break; fi
done
test -n "$LRELEASE" || { echo "lrelease not found" >&2; exit 1; }
for f in translations/%{name}-*.ts; do
    $LRELEASE -silent $f -qm ${f%.ts}.qm
done

%install
install -d %{buildroot}%{_datadir}/%{name}/translations
# Harbour allows files only under the app's own paths, not /usr/share/licenses.
install -m 644 LICENSE %{buildroot}%{_datadir}/%{name}/LICENSE
cp -r qml %{buildroot}%{_datadir}/%{name}/
install -m 644 translations/*.qm %{buildroot}%{_datadir}/%{name}/translations/
install -D -m 644 %{name}.desktop %{buildroot}%{_datadir}/applications/%{name}.desktop
for s in 86 108 128 172; do
    install -D -m 644 icons/${s}x${s}.png \
        %{buildroot}%{_datadir}/icons/hicolor/${s}x${s}/apps/%{name}.png
done

%files
%defattr(-,root,root,-)
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/*/apps/%{name}.png
