---
permalink: packs/
layout: default
title: Packs
description: The extension surface - self-contained, zero-dependency packs that grade a gamestruct door surface and land in the REFUSED / BOUNDED / PASSED / EXPLOITED verdict taxonomy.
nav_order: 10
---

# Packs

A **pack** is a self-contained bundle that loads into gamestruct's runner,
grades a captured door surface, and reports findings in the family verdict
taxonomy. It is how JUDGMENT travels between repos, the way an artifact is how
FILES travel. Nothing inside a pack imports the library it grades - so an
adopter proves conformance without pulling `gamestruct` into its own test lane.

The manifest grammar is the family spec at
[dhaupin/packstruct](https://github.com/dhaupin/packstruct) (SPEC v1); this page
documents gamestruct's own pack lane - what ships, how it runs, and how to write
one.

## What ships today

gamestruct ships one pack:

| Pack | What it grades |
|---|---|
| `bridge-shapes` | The door surface shape, read from a captured `gamestruct-conformance.json`: every node carries a unique `ui:`/`world:` stable handle (N1), every interactive node is named and declares at least one action (N6/N8), the agent catalog carries exactly one tool per actionable node with an `inputSchema` (N13/N17), and every refusal is an honest `{ ok:false, reason }` value (N21). Pure reads over a committed bundle - zero network, zero writes. |

The pack carries its own `test/fixtures/`: a `clean/` bundle that passes every
check, a `broken/` bundle that trips each one (an `EXPLOITED` row), and an
absent-target case that dockets a single `BOUNDED` row. That is the pack's
`armedCoverage` - proof it bites before you trust it.

## Running the lane

```bash
npm run packs             # run every pack under packs/public
npm run packs -- <dir>    # grade a target tree instead of the bundled fixture
npm run lint:packs        # manifest + entry + id-census grammar (packstruct)
npm run conform:packs     # conformance audit against the family loader shape
```

`scripts/run-packs.mjs` is zero-dependency: it loads every pack through
`lib/packs.mjs`, arms each with a read-only view of the target tree, runs it, and
prints the verdict rows. The exit contract is `0` on green, `1` when a row is
`EXPLOITED`.

## The verdict taxonomy

Every check lands in exactly one of four buckets:

| Verdict | Meaning |
|---|---|
| `REFUSED` | The surface said no, cleanly, with its named reason. A regression here is loud. |
| `BOUNDED` | The condition was contained to a documented limit (an absent target, a fixture lifespan). A `BOUNDED` row never reads as green. |
| `PASSED` | The safe path holds end to end. |
| `EXPLOITED` | The defect landed. An `EXPLOITED` row fails the lane. |

## Writing a pack

A pack is a directory under `packs/public/<name>/` with a `pack.json` manifest
(schemaVersion 1: kebab-case `name` matching the directory, `description`,
`version` on the pack's own cadence, and a relative `entry` path that exists),
plus the entry module it names. The manifest grammar is validated once, at load,
by `lib/packs.mjs` - so a pack that fails the grammar cannot quietly run.

The loader (`lib/packs.mjs`, exported as `gamestruct/packs`) enforces the
grammar at load: kebab name + directory match, `schemaVersion` 1, dotted
version, non-empty description, a relative entry that exists physically inside
the pack dir (an escaping symlink refuses), a cross-pack name collision, and a
null default export. Every refusal is instant, one-line, and names the pack
(SPEC section 5). It is zero-dependency (builtins only), so shipping packs never
moves gamestruct's "no runtime deps" law.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/contract/' | relative_url }}">the contract</a> ·
<a href="{{ '/cli/' | relative_url }}">the CLI</a> ·
<a href="{{ '/status/' | relative_url }}">family status</a></p>
</div>
