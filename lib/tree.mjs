/**
 * gamestruct — the semantic tree.
 *
 * A Tree is the ONE representation both lanes read. It is a flat map of
 * nodes plus an ordered child list per parent, so it serializes cleanly (an
 * agent's `observe`) and walks cleanly (a screen reader's traversal order).
 *
 * A node is a small record:
 *   { id, role, name, value?, description?, actions[], disabled?, checked?,
 *     expanded?, min?, max?, level?, parent, children[], meta? }
 *
 * `id` is a STABLE HANDLE. It must not be a pixel, an index, or a rect: the
 * whole point is that the same id works for the human lane and the agent
 * lane, before and after a re-render. Handles are minted by `mintHandle`.
 *
 * Zero dependencies.
 */

import { ROLES, ACTIONS, isInteractiveRole, defaultAction } from './roles.mjs';

/**
 * Mint a stable handle. A handle is `<namespace>:<local>` where the local
 * part is stable across renders (a name, a path, an entity id) -- never a
 * positional index. Callers that have nothing stable may pass a counter,
 * but that is the exception the spec calls out, not the norm.
 */
export function mintHandle(namespace, local) {
    const ns = String(namespace || 'node').trim() || 'node';
    const loc = String(local == null ? '' : local).trim();
    if (!loc) throw new Error('mintHandle: a local part is required (a handle is not an index)');
    return ns + ':' + loc;
}

/**
 * Build a semantic tree from a plain description.
 *
 * `spec` is a recursive object:
 *   { id, role, name, value?, description?, actions?, disabled?, checked?,
 *     expanded?, min?, max?, level?, meta?, children?: [spec...] }
 *
 * Children may also be added after construction with `add`. The tree keeps
 * insertion order for `children` (the traversal order a screen reader uses).
 */
export class Tree {
    constructor(rootSpec) {
        this.nodes = new Map();
        this.root = null;
        if (rootSpec) {
            this.root = this._ingest(rootSpec, null);
        }
    }

    _ingest(spec, parentId) {
        if (!spec || !spec.id) {
            throw new Error('Tree: every node needs an id (a stable handle)');
        }
        const id = String(spec.id);
        if (this.nodes.has(id)) {
            throw new Error('Tree: duplicate handle "' + id + '" (handles are unique)');
        }
        const role = spec.role || ROLES.GROUP;
        const actions = Array.isArray(spec.actions) && spec.actions.length
            ? spec.actions.slice()
            : (isInteractiveRole(role) ? [defaultAction(role)] : []);
        const node = {
            id,
            role,
            name: spec.name == null ? '' : String(spec.name),
            value: spec.value === undefined ? null : spec.value,
            description: spec.description == null ? '' : String(spec.description),
            actions,
            disabled: !!spec.disabled,
            checked: spec.checked === undefined ? null : spec.checked,
            expanded: spec.expanded === undefined ? null : spec.expanded,
            min: spec.min === undefined ? null : spec.min,
            max: spec.max === undefined ? null : spec.max,
            level: spec.level === undefined ? null : spec.level,
            parent: parentId,
            children: [],
            meta: spec.meta && typeof spec.meta === 'object' ? spec.meta : {},
        };
        this.nodes.set(id, node);
        if (parentId) this.nodes.get(parentId).children.push(id);
        if (Array.isArray(spec.children)) {
            for (const child of spec.children) {
                this._ingest(child, id);
            }
        }
        return id;
    }

    /** Add a node under `parentId` (or under the root when parentId is null). */
    add(parentId, spec) {
        const parent = parentId || this.root;
        if (parent && !this.nodes.has(parent)) {
            throw new Error('Tree.add: unknown parent "' + parent + '"');
        }
        return this._ingest(spec, parent || null);
    }

    get(id) {
        return this.nodes.get(id) || null;
    }

    has(id) {
        return this.nodes.has(id);
    }

    /** Depth-first traversal in child order. */
    walk(visit, startId) {
        const start = startId || this.root;
        if (!start) return;
        const node = this.nodes.get(start);
        if (!node) return;
        visit(node);
        for (const childId of node.children) {
            this.walk(visit, childId);
        }
    }

    /** A flat, ordered list of every node (the read order). */
    list() {
        const out = [];
        this.walk((n) => out.push(n));
        return out;
    }

    /** Every node that accepts `action`. */
    byAction(action) {
        return this.list().filter((n) => !n.disabled && n.actions.includes(action));
    }

    /** Every node with `role`. */
    byRole(role) {
        return this.list().filter((n) => n.role === role);
    }

    /** The first node whose name matches (case-insensitive substring). */
    findByName(name, opts = {}) {
        const needle = String(name).toLowerCase();
        const role = opts.role || null;
        return this.list().find((n) =>
            (!role || n.role === role) && n.name.toLowerCase().includes(needle)) || null;
    }

    size() {
        return this.nodes.size;
    }

    /** A serializable snapshot (the agent's `observe` payload). */
    toJSON() {
        return {
            root: this.root,
            nodes: this.list(),
        };
    }
}

export { ROLES, ACTIONS };
