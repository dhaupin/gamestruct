# packs/ - the extension-surface directory

This directory is the shell's slot for **packs**: optional, self-contained
extension bundles that adopters (or you) drop in to teach a host new
behaviors. It ships the family's own `public/` packs and a gitignored
`local/` slot for private ones.

## The shape (the 30-second version)

```
packs/public/<pack-name>/     tracked, shipped packs
packs/local/<pack-name>/      gitignored, private packs (same semantics,
                              different visibility - nothing about a pack's
                              loading changes based on where it lives)
  pack.json                   REQUIRED manifest (schemaVersion 1)
  <entry file>                REQUIRED - the module pack.json's "entry" names
```

`pack.json` at SPEC v1: `schemaVersion` (must be 1), `name` (kebab-case, MUST
match its directory name), `description`, `version` (the pack's OWN semver -
never bump it for shell releases), `entry` (relative path, must exist),
optional `armedByKey` / `armedCoverage` / `requires`, plus acknowledged
host-owned keys (`env`, `plugins`, `package`, `implements`). Extra keys/files
are allowed.

## Who owns what (the struct family)

- **The spec** lives in SPEC v1, [dhaupin/packstruct](https://github.com/dhaupin/packstruct)
  - the frozen manifest table, entry profiles, lifecycle norms, and the
    `implements: packstruct@1` pin convention.
- **packstruct** is also the linter: `packstruct lint <packs-dir>` enforces the
  manifest grammar + directory contract (exit 0 conforming / 1 violations / 2
  usage error). Adopting repos pin the SPEC commit and wire the lint lane in CI
  - see dhaupin/crashtest's lane for the working shape.
- **dhaupin/crashtest** is the `scenario`-profile reference implementation;
  **dhaupin/poststruct** and **dhaupin/eyestruct** are the `check`-profile
  siblings; **dhaupin/monoforge** stamps the repo half. gamestruct rides the
  `check` profile: declarative, pure-reading verifiers over a committed bundle.

## Shell rules for this directory

- One manifest grammar: manifest shape validates ONCE. If your host adds
  meaning to a key, that is a host-owned extension - the spec's host-owned list
  extends in a patch revision, not a schemaVersion bump.
- Adopters wire a lint lane against a PINNED packstruct commit; a floating
  linter is a random CI. When the pinned SPEC moves, re-derive in one reviewed
  commit.
- Pack semver is per-pack: minor shell version bumps don't drag packs along.
- Conformance is LIVE here: the loader (`lib/packs.mjs`) passes
  `npx packstruct audit-conformance . --loader "node lib/packs.mjs {packs}"` -
  it enforces the section-2 grammar AT LOAD (kebab name + dir match + collision,
  schemaVersion, dotted version, description, relative entry), accepts
  ESM-default entries, and runs the campaign with the same exit contract the
  audit reads.

## The packs gamestruct ships

- **`public/bridge-shapes/`** - the check-profile pack over a captured door
  surface (`gamestruct-conformance.json`): every node carries a unique
  `ui:`/`world:` stable handle (N1), every interactive node is named and
  declares an action (N6/N8), the agent catalog carries exactly one tool per
  actionable with an `inputSchema` (N13/N17), and every refusal is an honest
  `{ ok:false, reason }` value (N21). The runtime is the library; the pack is
  the PORTABLE judgment, so an adopter proves conformance without importing
  `gamestruct` into its own test lane.

The runner is `scripts/run-packs.mjs` (`npm run packs`): zero-dependency, it
loads every pack under `packs/public` through `lib/packs.mjs`, arms each with a
read-only view of THIS repo (or a target passed on argv), runs it, and prints
the family verdict rows. An `EXPLOITED` row fails the lane (exit 1); a
`BOUNDED` row never reads as green but does not fail it.

Related docs: [../SPEC.md](../SPEC.md) (the normative contract) ·
[../AGENTS.md](../AGENTS.md) (map + house rules) · [../CHANGELOG.md](../CHANGELOG.md)
(version history - and note packs are versioned independently of it).
