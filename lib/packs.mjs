/**
 * lib/packs.mjs — the gamestruct pack loader (packstruct SPEC v1).
 *
 * The family's two seams: FILES travel as an artifact, JUDGMENT travels as a
 * pack. A pack is a directory under the packs ROOT carrying `pack.json`
 * (schemaVersion 1) and the entry module it names; SPEC v1 has no field for
 * files to write, so a pack can only ever READ a tree — which is exactly what
 * a lane adopter's tree is.
 *
 * This loader is small on purpose and its conformance claim is the spec's own
 * harness, never our say-so (SPEC section 7):
 *
 *   npx packstruct audit-conformance . --loader "node lib/packs.mjs {packs}"
 *
 * Every refusal is instant, one-line, and NAMES the pack (SPEC section 5) —
 * wrong schemaVersion, non-kebab name, name/dir mismatch, missing entry file,
 * empty description, bad version, or a cross-pack name collision. Exit 0
 * conforming / 1 violations / 2 usage.
 *
 * Node-only (it reads disk and imports entries) and zero-dependency: builtins
 * only, so it rides the tarball without moving the "no runtime deps" law.
 */
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PACK_SCHEMA_VERSION = 1;

const RE_KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_SEMVER = /^\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?$/;

/** A refusal that is a usage error (the loader cannot even look), exit 2. */
export class UsageError extends Error {}

/** A pack violation (exit 1): instant, one-line, and names the pack. */
export class PackViolation extends Error {}

/**
 * The contract root is the packs ROOT — `<dir>/` with its `public/` (tracked)
 * and `local/` (gitignored WIP) children — never `packs/public/` itself
 * (SPEC section 1). So: if the given dir carries a `public/` child, packs live
 * under it; otherwise the dir IS the pack tree (an explicit `packs/public`).
 */
export function packsDir(root) {
    const r = resolve(root);
    const pub = join(r, 'public');
    return existsSync(pub) ? pub : r;
}

/** Discover pack dirs: every immediate subdirectory, sorted for determinism. */
export function discoverPackDirs(root) {
    const dir = packsDir(root);
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch (err) {
        throw new UsageError(`${root} is not a readable pack tree (${dir}): ${err.message}`);
    }
    return entries.filter((e) => e.isDirectory()).map((e) => join(dir, e.name)).sort();
}

/** Validate one manifest against SPEC v1. `dirName` labels every refusal. */
export function validateManifest(spec, dirName) {
    const where = dirName;
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
        throw new PackViolation(`pack "${where}": pack.json is not an object`);
    }
    if (spec.schemaVersion !== PACK_SCHEMA_VERSION) {
        throw new PackViolation(`pack "${where}": pack.json schemaVersion must be ${PACK_SCHEMA_VERSION} (got ${JSON.stringify(spec.schemaVersion)})`);
    }
    if (typeof spec.name !== 'string' || !RE_KEBAB.test(spec.name)) {
        throw new PackViolation(`pack "${where}": manifest "name" must be a kebab-case string (got ${JSON.stringify(spec.name)})`);
    }
    if (spec.name !== dirName) {
        throw new PackViolation(`pack "${where}": manifest name "${spec.name}" does not match its directory`);
    }
    if (typeof spec.version !== 'string' || !RE_SEMVER.test(spec.version)) {
        throw new PackViolation(`pack "${where}": "version" must be dotted MAJOR.MINOR[.PATCH] (got ${JSON.stringify(spec.version)})`);
    }
    if (typeof spec.description !== 'string' || !spec.description.trim()) {
        throw new PackViolation(`pack "${where}": "description" must be a non-empty string`);
    }
    if (typeof spec.entry !== 'string' || !spec.entry
        || isAbsolute(spec.entry) || spec.entry.split(/[\\/]/).includes('..')) {
        throw new PackViolation(`pack "${where}": "entry" must be a relative path inside the pack dir (got ${JSON.stringify(spec.entry)})`);
    }
    return spec;
}

/**
 * The entry must exist PHYSICALLY inside the pack dir (SPEC section 2:
 * "inside" is physical, not merely lexical). A symlink whose real target
 * escapes the pack refuses — the same class as a `..` path, caught after
 * resolution.
 */
function assertEntryInside(dir, entryAbs, dirName) {
    if (!existsSync(entryAbs)) {
        throw new PackViolation(`pack "${dirName}": declared entry "${entryAbs.slice(dir.length + 1)}" does not ship (the crashtest#16 class)`);
    }
    let real;
    try { real = realpathSync(entryAbs); } catch { return; }
    const realDir = realpathSync(dir);
    if (real !== realDir && !real.startsWith(realDir + '/')) {
        throw new PackViolation(`pack "${dirName}": entry resolves outside the pack dir (${real}) — an escaping entry is not inside`);
    }
}

/** Load one pack dir: read + validate the manifest, confirm the entry ships, import it. */
export async function loadPackDir(dir) {
    const dirName = dir.split('/').pop();
    const manifestPath = join(dir, 'pack.json');
    let spec;
    try {
        spec = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (err) {
        throw new PackViolation(`pack "${dirName}": no parseable pack.json (${err.message})`);
    }
    validateManifest(spec, dirName);
    const entryAbs = join(dir, spec.entry);
    assertEntryInside(dir, entryAbs, dirName);
    let loaded;
    try {
        loaded = await import(pathToFileURL(entryAbs).href);
    } catch (err) {
        throw new PackViolation(`pack "${dirName}": entry "${spec.entry}" failed to import: ${err.message}`);
    }
    let module = loaded;
    if (loaded && typeof loaded === 'object' && 'default' in loaded) {
        if (loaded.default == null) throw new PackViolation(`pack "${dirName}": entry "${spec.entry}" has a null default export`);
        module = loaded.default;
    }
    return { name: spec.name, spec, module, dir };
}

/** Census the ids a loaded pack declares (the check profile's `checks[]`). */
export function censusIds(module) {
    const out = [];
    for (const key of ['checks', 'attacks', 'scenarios']) {
        const list = module?.[key];
        if (!Array.isArray(list)) continue;
        for (const item of list) {
            const id = typeof item === 'string' ? item : item?.id || item?.name;
            if (typeof id === 'string') out.push(id);
        }
    }
    return out;
}

/** Load every pack under a root. A name collision refuses to start (SPEC section 4). */
export async function collectPacks(root) {
    const dirs = discoverPackDirs(root);
    const loaded = [];
    const seen = new Map();
    for (const dir of dirs) {
        const pack = await loadPackDir(dir);
        if (seen.has(pack.name)) {
            throw new PackViolation(`pack "${pack.name}" collides: ${seen.get(pack.name)} and ${pack.dir}`);
        }
        seen.set(pack.name, pack.dir);
        loaded.push(pack);
    }
    return loaded;
}

/**
 * The CLI (SPEC section 7): `node lib/packs.mjs <packs-root>`. Exit 0 clean /
 * 1 violations / 2 usage. Prints one line per pack loaded, and the refusal
 * verbatim on the first violation (a refusal is instant and names the pack).
 */
export async function runLoader(argv = process.argv.slice(2)) {
    const arg = argv.find((a) => !a.startsWith('-'));
    const root = arg || 'packs';
    try {
        const packs = await collectPacks(root);
        for (const p of packs) {
            const ids = censusIds(p.module);
            console.log(`pack ${p.name}@${p.spec.version}: loaded${ids.length ? ` (${ids.length} id(s): ${ids.join(', ')})` : ''}`);
        }
        console.log(`gamestruct pack loader: ${packs.length} pack(s) loaded from ${packsDir(root)}`);
        return 0;
    } catch (err) {
        if (err instanceof UsageError) {
            console.error(`gamestruct pack loader: ${err.message}`);
            return 2;
        }
        if (err instanceof PackViolation) {
            console.error(`gamestruct pack loader: ${err.message}`);
            return 1;
        }
        throw err;
    }
}

// Node-only CLI guard: run when invoked directly, stay importable otherwise.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    process.exit(await runLoader());
}

export default { run: runLoader, collectPacks, discoverPackDirs, loadPackDir, validateManifest, censusIds, packsDir };
