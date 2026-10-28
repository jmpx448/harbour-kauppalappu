# make test     — logic and storage tests + ES5 guard (Node >= 22, node:sqlite)
# make ts       — refresh translations/*.ts from the sources (lupdate-qt5)
# make rpm      — noarch RPM into dist/ (xz payload: the phone's rpm is 4.16)
# make copy     — RPM to the phone's /tmp (ssh jolla); install with devel-su, see README
NAME    := harbour-kauppalappu
VERSION := $(shell sed -n 's/^Version: *//p' rpm/$(NAME).spec)
RPM     := dist/noarch/$(NAME)-$(VERSION)-1.noarch.rpm
TS      := $(wildcard translations/$(NAME)-*.ts)

.PHONY: test ts qm rpm copy
test:
	node --test 'tests/test_*.js'

ts:
	lupdate-qt5 -noobsolete -locations none qml -ts $(TS)

qm:
	rm -rf dist/translations
	mkdir -p dist/translations
	for f in $(TS); do lrelease-qt5 -silent $$f -qm dist/translations/$$(basename $$f .ts).qm || exit 1; done

rpm: test qm
	rm -rf dist/build
	rpmbuild -bb rpm/$(NAME).spec \
	    --define "_sourcedir $(CURDIR)" \
	    --define "_rpmdir $(CURDIR)/dist" \
	    --define "_builddir $(CURDIR)/dist/build" \
	    --define "_buildrootdir $(CURDIR)/dist/buildroot" \
	    --define "_binary_payload w9.xzdio" \
	    --define "vendor jmp"
	@ls -l $(RPM)

copy: rpm
	scp -q $(RPM) jolla:/tmp/
	@echo "On the phone: /tmp/$(notdir $(RPM))"
