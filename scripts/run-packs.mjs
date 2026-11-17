#!/usr/bin/env node
// scripts/run-packs.mjs - the bridgeworks' own pack lane.
//
// Loads every pack under packs/public through lib/packs.mjs, arms each with a
// read-only view of a target tree, runs it, and prints the verdict rows in the
// family taxonomy. An EXPLOITED row fails the lane (exit 1); a BOUNDED row
// never reads as green but does not fail it.
//
// The pack's only input is the tree (SPEC section 7), so this runs with no
// network and no install beyond the loader itself. Default target: the
// bridge-shapes pack's own clean fixture (the conforming bundle IS the shape
// the pack grades); `node scripts/run-packs.mjs <dir>` points it at any tree.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPacks } from '../lib/packs.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PACKS = join(ROOT, 'packs');

// A read-only tree view over an absolute root, with the small fsapi the check
// profile contracts on. Paths resolve against the root and never escape it - a
// `..` in a receipt is refused as a miss, not followed.
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

async function main() {
    const rootArg = process.argv.slice(2).find((a) => !a.startsWith('-'));
    const target = rootArg ? resolve(rootArg) : join(PACKS, 'public', 'bridge-shapes', 'test', 'fixtures', 'clean');
    let packs;
    try {
        packs = await collectPacks(PACKS);
    } catch (err) {
        console.error(`gamestruct run-packs: ${err.message}`);
        process.exit(2);
    }
    if (!packs.length) {
        console.error('gamestruct run-packs: no packs found under packs/public - an unarmed lane must not read as clean');
        process.exit(2);
    }
    const ctx = { bridgeTree: treeAt(target) };
    const rows = [];
    for (const pack of packs) {
        if (typeof pack.module.run !== 'function') continue;
        let result;
        try {
            result = pack.module.run(ctx);
        } catch (err) {
            console.error(`gamestruct run-packs: pack ${pack.name} refused to run - ${err.message}`);
            process.exit(2);
        }
        rows.push(...(result.rows || []));
    }
    const exploited = rows.filter((r) => r.verdict === 'EXPLOITED');
    for (const row of rows) {
        const tag = `${row.pack}:${row.id}`;
        console.log(`  ${String(row.verdict).padEnd(9)} ${tag}${row.detail ? ' | ' + row.detail : ''}`);
    }
    console.log(`gamestruct run-packs: ${packs.length} pack(s), ${rows.length} row(s) over ${relative(process.cwd(), target) || '.'} - ${exploited.length ? `${exploited.length} EXPLOITED` : 'clean'}`);
    process.exit(exploited.length ? 1 : 0);
}

await main();
