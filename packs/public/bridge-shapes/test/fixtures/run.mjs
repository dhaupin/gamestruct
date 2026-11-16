#!/usr/bin/env node
// packs/public/bridge-shapes/test/fixtures/run.mjs — the pack's armed
// end-to-end row (packstruct SPEC v1 section 4, the self-audit-fixtures
// norm). It arms the pack with a read-only view over each committed fixture
// and asserts the pack's OWN claims:
//
//   clean/  -> every check PASSED, zero EXPLOITED (the happy wire holds)
//   broken/ -> every defect class is caught (an EXPLOITED row per check)
//
// Zero dependencies, zero network: it imports the pack and walks files. This
// is the row a host arms to prove the pack is honest, and the row
// `packstruct lint` confirms ships (SPEC section 2 `armedCoverage`).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACK_DIR = resolve(HERE, '..', '..');
const { run, checks } = await import(join(PACK_DIR, 'index.mjs'));

// A read-only tree view over an absolute root; `..` never escapes it.
function treeAt(root) {
    const inside = (rel) => {
        if (typeof rel !== 'string' || !rel) return null;
        const abs = resolve(root, rel);
        return abs === root || abs.startsWith(root + '/') ? abs : null;
    };
    return {
        root,
        exists(rel) { const abs = inside(rel); return abs ? existsSync(abs) : false; },
        text(rel) {
            const abs = inside(rel);
            if (!abs || !existsSync(abs)) return null;
            try { return statSync(abs).isFile() ? readFileSync(abs, 'utf8') : null; } catch { return null; }
        },
        readdir(rel) {
            const abs = inside(rel ?? '');
            if (!abs || !existsSync(abs)) return [];
            try { return readdirSync(abs); } catch { return []; }
        },
    };
}

function verdictOf(rows, id) {
    const row = rows.find((r) => r.id === id);
    return row ? row.verdict : null;
}

let failed = 0;
const expect = (cond, msg) => { if (!cond) { failed += 1; console.error(`  FAIL ${msg}`); } else { console.log(`  ok   ${msg}`); } };

// --- clean fixture: every check PASSED ---
console.log('bridge-shapes fixtures: clean/');
const cleanRows = run({ bridgeTree: treeAt(join(HERE, 'clean')) }).rows;
for (const c of checks) {
    expect(verdictOf(cleanRows, c.id) === 'PASSED', `${c.id} PASSED on a clean bundle`);
}

// --- broken fixture: every defect class caught ---
console.log('bridge-shapes fixtures: broken/');
const brokenRows = run({ bridgeTree: treeAt(join(HERE, 'broken')) }).rows;
for (const c of checks) {
    expect(verdictOf(brokenRows, c.id) === 'EXPLOITED', `${c.id} EXPLOITED on a broken bundle`);
}

// --- absent target: one BOUNDED row, never a pass ---
console.log('bridge-shapes fixtures: absent target');
const absentRows = run({ bridgeTree: treeAt(join(HERE, 'clean')) }).rows.length;
const noneRows = run({ bridgeTree: { root: null } }).rows;
expect(noneRows.length === 1 && noneRows[0].verdict === 'BOUNDED', 'an absent target dockets one BOUNDED row (never a pass)');
expect(absentRows > 0, 'the clean bundle produced rows');

if (failed) {
    console.error(`bridge-shapes fixtures: ${failed} assertion(s) failed`);
    process.exit(1);
}
console.log(`bridge-shapes fixtures: all ${checks.length} check(s) armed on clean + broken + absent - PASS`);
