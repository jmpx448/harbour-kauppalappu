# make test     — logiikka- ja tietokantatestit + ES5-vartija (Node ≥ 22, node:sqlite)
# make rpm      — noarch-RPM hakemistoon dist/ (xz-pakkaus: puhelimen rpm on 4.16)
# make kopioi   — RPM puhelimen /tmp:hen (ssh jolla); asennus devel-su:lla, ks. README
NIMI    := harbour-ostoslista
VERSIO  := $(shell sed -n 's/^Version: *//p' rpm/$(NIMI).spec)
RPM     := dist/noarch/$(NIMI)-$(VERSIO)-1.noarch.rpm

.PHONY: test rpm kopioi
test:
	node --test 'tests/test_*.js'

rpm: test
	rm -rf dist/build
	rpmbuild -bb rpm/$(NIMI).spec \
	    --define "_sourcedir $(CURDIR)" \
	    --define "_rpmdir $(CURDIR)/dist" \
	    --define "_builddir $(CURDIR)/dist/build" \
	    --define "_buildrootdir $(CURDIR)/dist/buildroot" \
	    --define "_binary_payload w9.xzdio" \
	    --define "vendor jmp"
	@ls -l $(RPM)

kopioi: rpm
	scp -q $(RPM) jolla:/tmp/
	@echo "Puhelimessa: /tmp/$(notdir $(RPM))"
