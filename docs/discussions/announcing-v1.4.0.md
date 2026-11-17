---
permalink: discussions/announcing-v1.4.0/
layout: default
title: Announcing gamestruct v1.4.0
description: gamestruct v1.4.0 - the packs surface lands (packstruct@1 parity with the family). The file IS the announcement.
version: 1.4.0
---

# gamestruct v1.4.0

gamestruct is one semantic tree for human and agent play: the same game, the same state, driven through one door by a human client or an agent. v1.4.0 is a minor on the 1.3.x line - the door protocol is unchanged; the bridgeworks gains the family's judgment surface. This post ships with the v1.4.0 tag: npm has the tarball by the time you read it.

```bash
npm i -g gamestruct
```

## What landed

**gamestruct ships packs.** A pack is how *judgment* travels between repos, the way an artifact is how *files* travel: a self-contained bundle that grades a surface without importing the library it grades. gamestruct was the only struct-family repo with no `packs/` directory - eyestruct, poststruct, monoforge, crashtest, packstruct and memstruct all ship a `packs/public/` of packstruct@1 packs in their npm tarballs and wire a `lint:packs` lane. This cut closes the gap.

**`lib/packs.mjs` - the loader (packstruct SPEC v1).** Zero-dependency (builtins only, so the "no runtime deps" law holds). It enforces the section-2 manifest grammar *at load*: kebab name + directory match, `schemaVersion` 1, a dotted version, a non-empty description, a relative entry that exists *physically* inside the pack directory (a symlink escaping the pack refuses), a cross-pack name collision, and a null default export. Every refusal is instant, one-line, and names the pack. Exit ladder `0` clean / `1` violations / `2` usage. Exported as `gamestruct/packs`.

**`packs/public/bridge-shapes/` - the first pack.** A `check`-profile pack over a captured door surface (`gamestruct-conformance.json`): every node carries a unique `ui:`/`world:` handle (N1), every interactive node is named and declares an action (N6/N8), the agent catalog carries exactly one tool per actionable with an `inputSchema` (N13/N17), and every refusal is an honest `{ ok:false, reason }` value (N21). It imports nothing from `lib/`, so an adopter proves conformance without pulling the library into its test lane. It ships its own `test/fixtures/` (clean -> PASSED, broken -> EXPLOITED, absent -> BOUNDED), declared as the manifest's `armedCoverage`.

**The lanes.** `npm run packs` (the runner over `packs/public`), `npm run lint:packs` (`packstruct lint packs --deep`) and `npm run conform:packs` (`packstruct audit-conformance . --loader "node lib/packs.mjs {packs}"` - 10/10 cases honored). `check` now runs all three. `packstruct@1.1.2` is an exact devDependency (the family companion-pin convention); the shipped library stays zero-dependency.

## Also in this round

`packs/` ships in the tarball (`package.json` files) - the README, the manifest, the entry and its fixtures - and the release ladder is invoked with `--allowed packs/` (the family exemption eyestruct carries for the packs it ships). The status dialect now counts the packs: `web/scripts/build-status.mjs` enumerates the committed manifests and censuses each entry's check count (the family-status@1 `packs:[{name, spec, profile, manifest, cases}]` row), refusing the status if a committed pack cannot be read or imported. CI installs hermetically (`npm ci`) so the packs lane runs against the pinned linter.

## Links

- Repo and docs: https://github.com/dhaupin/gamestruct / https://docs.creadev.org/gamestruct
- Changelog: https://github.com/dhaupin/gamestruct/blob/main/CHANGELOG.md
- Issues: https://github.com/dhaupin/gamestruct/issues
