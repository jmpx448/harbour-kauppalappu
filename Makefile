# make test     — logic and storage tests + ES5 guard (Node >= 22, node:sqlite)
# make ts       — refresh translations/*.ts from the sources (lupdate-qt5)
# make rpm      — noarch RPM into dist/ (xz payload: the phone's rpm is 4.16); the work tree
#                 is packed into dist/ as the Source0 tarball, as tar_git does on OBS (Chum)
# make copy     — RPM to the phone's /tmp (ssh jolla); install with devel-su, see README
NAME    := harbour-kauppalappu
VERSION := $(shell sed -n 's/^Version: *//p' rpm/$(NAME).spec)
RELEASE := $(shell sed -n 's/^Release: *//p' rpm/$(NAME).spec)
RPM     := dist/noarch/$(NAME)-$(VERSION)-$(RELEASE).noarch.rpm
TS      := $(wildcard translations/$(NAME)-*.ts)

.PHONY: test ts tarball rpm copy
test:
	node --test 'tests/test_*.js'

ts:
	lupdate-qt5 -noobsolete -locations none qml -ts $(TS)

TARBALL := dist/$(NAME)-$(VERSION).tar.bz2

tarball:
	mkdir -p dist
	tar -cjf $(TARBALL) --transform 's,^,$(NAME)-$(VERSION)/,' \
	    LICENSE $(NAME).desktop qml translations/*.ts icons/*.png rpm

# --nodeps: BuildRequires names the Sailfish package (qt5-qttools-linguist).
rpm: test tarball
	rm -rf dist/build
	rpmbuild -bb --nodeps rpm/$(NAME).spec \
	    --define "_sourcedir $(CURDIR)/dist" \
	    --define "_rpmdir $(CURDIR)/dist" \
	    --define "_builddir $(CURDIR)/dist/build" \
	    --define "_buildrootdir $(CURDIR)/dist/buildroot" \
	    --define "_binary_payload w9.xzdio"
	@ls -l $(RPM)

copy: rpm
	scp -q $(RPM) jolla:/tmp/
	@echo "On the phone: /tmp/$(notdir $(RPM))"
