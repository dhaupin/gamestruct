// bridge-shapes — the check-profile pack over a captured gamestruct door
// surface (packstruct SPEC v1). Pure reads: it opens a committed conformance
// bundle and reports what it finds. Zero network, zero writes, zero imports
// from the gamestruct library — the claims travel, the runtime does not.
//
// Why a pack when `gamestruct check` already proves the contract: `check`
// builds a DEMO surface in-process and is gamestruct's own battery. A pack is
// the PORTABLE judgment — the same SPEC rules, re-runnable by any host that
// loads it, against ANY door's captured surface. An adopter (a world, a
// companion brain) commits one bundle and proves conformance without pulling
// the library into its test lane.
//
// THE CONTRACT with the target (ctx.bridgeTree):
//   root            -> absolute path to the target tree, or null (the pack
//                      then dockets one BOUNDED row and audits nothing — an
//                      absent target is never a pass)
//   exists(rel)     -> boolean
//   text(rel)       -> string | null
//   readdir(rel)    -> string[]
//
// The bundle it reads, `gamestruct-conformance.json`:
//   {
//     "observe":  { "nodes": [ { "id", "role", "name", "actions"?, "disabled"? } ] },
//     "catalog":  { "tools": [ { "name", "_handle", "inputSchema" } ] },
//     "refusals": [ { "call", "result": { "ok": false, "reason" } } ]
//   }
//
// Verdict taxonomy (family): PASSED / BOUNDED / EXPLOITED. BOUNDED never
// reads as green.

export const PKG = 'packs/public/bridge-shapes';
export const REQUIRED_KEYS = ['bridgeTree'];

const PACK = 'bridge-shapes';
const BUNDLE = 'gamestruct-conformance.json';

// The role vocabulary the SPEC treats as interactive (SPEC N6). Pinned here on
// purpose: the pack must not import the library it grades, so this set MIRRORS
// `lib/roles.mjs` INTERACTIVE_ROLES and its drift is caught by the pack's own
// fixtures, never by reaching into lib/. (gamestruct's set adds `listitem` to
// the classic ARIA interactives - a game world's actors are list items.)
const INTERACTIVE_ROLES = new Set([
    'button', 'link', 'textbox', 'checkbox', 'radio', 'slider',
    'switch', 'combobox', 'menuitem', 'tab', 'listitem',
]);

// The check ids this pack declares (SPEC section 7 census; the check
// profile's `checks[]`). Kept in sync with the run() bodies below.
export const checks = [
    { id: 'shapes/observe-stable-handles' },
    { id: 'shapes/interactive-named-and-actionable' },
    { id: 'shapes/one-tool-per-actionable' },
    { id: 'shapes/tools-carry-inputschema' },
    { id: 'shapes/refusals-are-values' },
];

class Verdicts {
    constructor() { this.rows = []; }
    passed(id, detail) { this.rows.push({ pack: PACK, id, verdict: 'PASSED', detail: String(detail || '').slice(0, 220) }); }
    bounded(id, bound, detail) { this.rows.push({ pack: PACK, id, verdict: 'BOUNDED', bound, detail: String(detail || '').slice(0, 220) }); }
    failed(id, fault) { this.rows.push({ pack: PACK, id, verdict: 'EXPLOITED', detail: String(fault.problem || JSON.stringify(fault)).slice(0, 220), fault }); }
    get ok() { return !this.rows.some((r) => r.verdict === 'EXPLOITED'); }
}

function take(ctx, key) {
    const value = ctx?.[key];
    if (value === undefined) throw new TypeError(`${PKG}: ctx[${JSON.stringify(key)}] is missing — the runner did not arm the ${key} contract`);
    return value;
}

function isActionable(node) {
    return node && INTERACTIVE_ROLES.has(String(node.role)) && node.disabled !== true;
}

export function run(ctx) {
    for (const key of REQUIRED_KEYS) take(ctx, key);
    const v = new Verdicts();
    const tree = ctx.bridgeTree;

    if (!tree || tree.root == null) {
        v.bounded('shapes/observe-stable-handles', 'target-tree-absent', 'no target tree armed (set BRIDGE_TREE) — nothing was audited, nothing was passed');
        return { ok: v.ok, rows: v.rows };
    }

    // --- the bundle ships and parses ---
    const raw = tree.text(BUNDLE);
    if (raw == null) {
        v.failed('shapes/observe-stable-handles', { problem: `no ${BUNDLE} in the target tree — a door surface with no captured bundle proves nothing here` });
        return { ok: v.ok, rows: v.rows };
    }
    let bundle;
    try {
        bundle = JSON.parse(raw);
    } catch (err) {
        v.failed('shapes/observe-stable-handles', { problem: `${BUNDLE} is unparseable: ${err.message}` });
        return { ok: v.ok, rows: v.rows };
    }
    const nodes = Array.isArray(bundle?.observe?.nodes) ? bundle.observe.nodes : null;
    if (!nodes) {
        v.failed('shapes/observe-stable-handles', { problem: `${BUNDLE} carries no observe.nodes[] — the snapshot is the tree both lanes read` });
        return { ok: v.ok, rows: v.rows };
    }

    // --- observe-stable-handles (N1): every node has a unique ui:/world: handle ---
    const badHandles = [];
    const seen = new Set();
    for (const n of nodes) {
        const id = n && n.id;
        if (typeof id !== 'string' || !/^(ui|world):/.test(id)) {
            badHandles.push({ id: id ?? null, problem: 'handle is not a ui:/world: string' });
            continue;
        }
        if (seen.has(id)) badHandles.push({ id, problem: 'duplicate handle' });
        seen.add(id);
    }
    if (badHandles.length) {
        v.failed('shapes/observe-stable-handles', { problem: 'a node has no stable handle, or a handle repeats — act() operates by handle, so both are unaddressable (N1)', nodes: badHandles.slice(0, 8) });
    } else {
        v.passed('shapes/observe-stable-handles', `${nodes.length} node(s): every handle is a unique ui:/world: string (N1)`);
    }

    // --- interactive-named-and-actionable (N6/N8) ---
    const unnamed = [];
    const inert = [];
    for (const n of nodes) {
        if (!isActionable(n)) continue;
        if (typeof n.name !== 'string' || !n.name.trim()) unnamed.push(n.id);
        const acts = Array.isArray(n.actions) ? n.actions.filter((a) => typeof a === 'string' && a) : [];
        if (!acts.length) inert.push(n.id);
    }
    if (unnamed.length || inert.length) {
        v.failed('shapes/interactive-named-and-actionable', { problem: 'an interactive node has no accessible name or declares no action — a screen reader and an agent both fail on it (N6/N8)', unnamed, inert });
    } else {
        const count = nodes.filter(isActionable).length;
        v.passed('shapes/interactive-named-and-actionable', `${count} interactive node(s): each is named and declares at least one action (N6/N8)`);
    }

    // --- one-tool-per-actionable (N13) + tools-carry-inputschema (N17) ---
    const tools = Array.isArray(bundle?.catalog?.tools) ? bundle.catalog.tools : null;
    if (!tools) {
        v.bounded('shapes/one-tool-per-actionable', 'catalog-absent', `${BUNDLE} carries no catalog.tools[] — the agent lane was not captured, so this check does not pass`);
        v.bounded('shapes/tools-carry-inputschema', 'catalog-absent', 'no catalog captured');
    } else {
        const actionable = nodes.filter(isActionable);
        if (tools.length !== actionable.length) {
            v.failed('shapes/one-tool-per-actionable', { problem: `the catalog has ${tools.length} tool(s) but the surface has ${actionable.length} actionable node(s) — exactly one tool per actionable (N13)`, tools: tools.length, actionable: actionable.length });
        } else {
            v.passed('shapes/one-tool-per-actionable', `${tools.length} tool(s) for ${actionable.length} actionable node(s) (N13)`);
        }
        const noSchema = tools.filter((t) => !t || typeof t.inputSchema !== 'object' || t.inputSchema == null).map((t) => t && (t.name || t._handle) || null);
        if (noSchema.length) {
            v.failed('shapes/tools-carry-inputschema', { problem: 'a tool carries no inputSchema — an MCP client cannot auto-wire it (N17)', tools: noSchema.slice(0, 8) });
        } else {
            v.passed('shapes/tools-carry-inputschema', `${tools.length} tool(s): each carries an inputSchema (N17)`);
        }
    }

    // --- refusals-are-values (N21) ---
    const refusals = Array.isArray(bundle?.refusals) ? bundle.refusals : null;
    if (!refusals) {
        v.bounded('shapes/refusals-are-values', 'refusals-absent', `${BUNDLE} carries no refusals[] — no refusal was captured, so this check does not pass`);
    } else {
        const bad = [];
        for (const r of refusals) {
            const res = r && r.result;
            if (!res || res.ok !== false || typeof res.reason !== 'string' || !res.reason) {
                bad.push({ call: (r && r.call) || null, result: res ?? null });
            }
        }
        if (bad.length) {
            v.failed('shapes/refusals-are-values', { problem: 'a refusal is not an honest value — it must be { ok:false, reason:<non-empty> }, never a throw or a silent success (N21)', refusals: bad.slice(0, 8) });
        } else {
            v.passed('shapes/refusals-are-values', `${refusals.length} refusal(s): each is an honest { ok:false, reason } value (N21)`);
        }
    }

    return { ok: v.ok, rows: v.rows };
}

export default { name: PACK, checks, run };
