/**
 * gamestruct — the pack lane test (packstruct SPEC v1).
 *
 * Proves the loader refuses every section-5 norm by name, loads the committed
 * pack, and that the committed bridge-shapes pack bites: PASSED on a clean
 * bundle, EXPLOITED on each defect class. The spec's own conformance harness
 * (`npm run conform:packs`) is the higher authority; this is the offline
 * standing receipt, run on every push.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    PACK_SCHEMA_VERSION,
    validateManifest,
    PackViolation,
    collectPacks,
    censusIds,
    packsDir,
} from '../lib/packs.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACK_DIR = join(REPO_ROOT, 'packs', 'public', 'bridge-shapes');

const good = () => ({ schemaVersion: 1, name: 'demo-pack', description: 'a pack', version: '0.1.0', entry: 'index.mjs' });

function refuses(spec, dirName, needle) {
    assert.throws(() => validateManifest(spec, dirName), (err) => {
        assert.ok(err instanceof PackViolation, `expected a PackViolation, got ${err.constructor.name}`);
        assert.ok(err.message.includes(needle), `refusal must name the norm (${needle}): ${err.message}`);
        return true;
    });
}

test('packs: the loader refuses every SPEC section-5 norm by name', () => {
    refuses({ ...good(), schemaVersion: 2 }, 'demo-pack', 'schemaVersion');
    refuses({ ...good(), name: 'Bad Name' }, 'demo-pack', 'kebab-case');
    refuses({ ...good(), name: 'other-name' }, 'demo-pack', 'does not match its directory');
    refuses({ ...good(), version: 'v1' }, 'demo-pack', 'version');
    refuses({ ...good(), description: '  ' }, 'demo-pack', 'description');
    refuses({ ...good(), entry: '../escape.mjs' }, 'demo-pack', 'relative path inside');
    refuses({ ...good(), entry: '/etc/passwd' }, 'demo-pack', 'relative path inside');
    refuses(null, 'demo-pack', 'not an object');
    assert.equal(PACK_SCHEMA_VERSION, 1);
});

test('packs: collectPacks loads the committed pack and censuses its ids', async () => {
    const packs = await collectPacks(join(REPO_ROOT, 'packs'));
    const bridge = packs.find((p) => p.name === 'bridge-shapes');
    assert.ok(bridge, 'the committed bridge-shapes pack loads');
    assert.equal(bridge.spec.schemaVersion, 1);
    assert.equal(bridge.spec.implements, 'packstruct@1');
    const ids = censusIds(bridge.module);
    assert.ok(ids.length >= 5, `the pack declares its checks (found ${ids.length})`);
    assert.ok(ids.every((id) => /^shapes\//.test(id)), 'check ids live in the pack-slug namespace');
});

test('packs: a manifest name that disagrees with its directory refuses (collision guard)', async () => {
    // The family grammar pins name == directory, so a genuine two-pack name
    // collision is structurally unreachable through one tree; the load-time
    // guard is the mismatch refusal (SPEC section 4: never silent dedupe).
    const root = mkdtempSync(join(tmpdir(), 'gamestruct-packs-collide-'));
    try {
        mkdirSync(join(root, 'public', 'one'), { recursive: true });
        writeFileSync(join(root, 'public', 'one', 'pack.json'), JSON.stringify({ ...good(), name: 'other' }));
        writeFileSync(join(root, 'public', 'one', 'index.mjs'), 'export default {}');
        await assert.rejects(collectPacks(root), (err) => {
            assert.ok(err instanceof PackViolation);
            assert.ok(/does not match its directory/.test(err.message), err.message);
            return true;
        });
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('packs: a missing entry file refuses by name (the crashtest#16 class)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'gamestruct-packs-noentry-'));
    try {
        mkdirSync(join(root, 'public', 'ghost'), { recursive: true });
        writeFileSync(join(root, 'public', 'ghost', 'pack.json'), JSON.stringify({ ...good(), name: 'ghost' }));
        await assert.rejects(collectPacks(root), (err) => {
            assert.ok(err instanceof PackViolation);
            assert.ok(/does not ship/.test(err.message), err.message);
            return true;
        });
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('packs: packsDir resolves the contract root (public/ child wins)', () => {
    assert.ok(packsDir(join(REPO_ROOT, 'packs')).endsWith(join('packs', 'public')));
    assert.ok(packsDir(join(REPO_ROOT, 'packs', 'public')).endsWith(join('packs', 'public')));
});

test('packs: bridge-shapes bites — PASSED on clean, EXPLOITED on broken', async () => {
    const mod = await import(join(PACK_DIR, 'index.mjs'));
    const readTree = (root) => ({
        root,
        exists: (rel) => { try { return readFileSync(join(root, rel), 'utf8') != null; } catch { return false; } },
        text: (rel) => { try { return readFileSync(join(root, rel), 'utf8'); } catch { return null; } },
        readdir: () => [],
    });
    const clean = mod.run({ bridgeTree: readTree(join(PACK_DIR, 'test', 'fixtures', 'clean')) });
    assert.ok(clean.ok, 'a clean bundle passes every check');
    assert.ok(clean.rows.every((r) => r.verdict === 'PASSED'), JSON.stringify(clean.rows));
    const broken = mod.run({ bridgeTree: readTree(join(PACK_DIR, 'test', 'fixtures', 'broken')) });
    assert.ok(!broken.ok, 'a broken bundle is not green');
    assert.ok(broken.rows.some((r) => r.verdict === 'EXPLOITED'), 'a defect class is caught');
    const absent = mod.run({ bridgeTree: { root: null } });
    assert.equal(absent.rows.length, 1);
    assert.equal(absent.rows[0].verdict, 'BOUNDED', 'an absent target dockets one BOUNDED row, never a pass');
});
