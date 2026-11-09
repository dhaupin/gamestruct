---
permalink: status/
layout: default
title: Family status
description: The family-status@1 contract - gamestruct serves /status.json generated from its committed battery, and the /status page reads the family's files back honestly.
nav_order: 25
---

# Family status

The members of the struct family each carry adversarial legs whose verdicts live
in **committed files**, reconciled on every push. The `family-status@1` contract
makes those files readable *across* the family, without a server, without a
dashboard product, and without any trust beyond "the committing repo's own CI ran
its own battery":

1. every member serves a machine-readable status file at the fixed path
   `/status.json` on its site;
2. that file is **generated, never hand-edited**, by the member's own web build,
   straight from committed inputs;
3. every member's status page reads the others' files and renders their numbers
   (or their absence) honestly.

Humans read `/status`; agents and machines read `/status.json`. Both get the
same numbers, because both read the same generated file.

## gamestruct's legs

gamestruct is new to the family, so it serves the dialect from the two receipts
it actually has:

| leg | input | meaning |
|-----|-------|---------|
| `selfcheck` | the bridgeworks' own `runSelfChecks()` (the same 17 checks `gamestruct check` runs) | the tree, both lanes, both bindings, and the invariant that the SAME handle drives both |
| `battery` | `labs/battery.json`, the committed contract | the expected shape of the self-check battery - a check that silently disappears reads RED, never a smaller green |

The emitter runs the self-checks at web-build time and reconciles the live count
against the committed contract. A verdict is `PASS` only when the live battery
matches the committed shape and every check passes; anything else is `RED`.

## The dialect: `family-status@1`

One JSON object per repo. `schema` is `1`; `contract` is the string
`family-status@1` - a reader that sees either field missing or renamed refuses
and shows "not serving the dialect", never a guessed row.

| field | shape | meaning |
|-------|-------|---------|
| `schema` | `1` | the dialect's schema pin, additive-first |
| `contract` | `"family-status@1"` | the contract name a reader matches |
| `repo` | string | the source repo |
| `site` | string | this member's own status page URL |
| `docs` | string | the docs status page URL |
| `asOf` | ISO date | when the emitter ran (the build date) |
| `legs` | array | `{leg, verdict, cases, counts, ledger}` per leg |
| `packs` | array | the member's packstruct@1 packs, if any |

gamestruct ships no packs yet, so `packs` is empty - honestly, not omitted.

<div class="crosslinks">
<p><strong>More in these docs:</strong>
<a href="{{ '/about/' | relative_url }}">about</a> ·
<a href="{{ '/cli/' | relative_url }}">the CLI</a> ·
<a href="{{ '/why/' | relative_url }}">why</a> ·
<a href="{{ '/what/' | relative_url }}">what</a></p>
</div>
