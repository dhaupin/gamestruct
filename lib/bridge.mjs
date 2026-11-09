/**
 * gamestruct — the Bridge (the door).
 *
 * A Bridge is the ONE object both lanes hold. It owns the semantic Tree, the
 * EventRing, and a registry of act-handlers keyed by handle. It exposes the
 * four primitives the spec names:
 *
 *   observe()                  -> a snapshot of the tree (+ focus, + summary)
 *   act(id, verb, value?)      -> do one thing by stable handle
 *   waitFor(predicate, ms)     -> block until a condition holds or time out
 *   events(sinceFrame)         -> what happened since a cursor
 *
 * A "host" adapts a real world to a Bridge by (a) building the tree and
 * (b) registering handlers. The host never touches the lanes; the lanes
 * never touch the host. This is the whole trick.
 *
 * Zero dependencies.
 */

import { Tree } from './tree.mjs';
import { EventRing } from './events.mjs';
import { ACTIONS, ROLES } from './roles.mjs';

export class Bridge {
    /**
     * @param {object} [opts]
     * @param {Tree}   [opts.tree]      an existing tree (else an empty one)
     * @param {EventRing} [opts.ring]   an existing ring (else a fresh one)
     * @param {string} [opts.name]      a display name for the surface
     * @param {object} [opts.meta]      free-form surface metadata
     */
    constructor(opts = {}) {
        this.tree = opts.tree || new Tree({ id: 'root', role: ROLES.REGION, name: opts.name || 'surface' });
        this.ring = opts.ring || new EventRing(opts.capacity || 256);
        this.name = opts.name || 'surface';
        this.meta = opts.meta && typeof opts.meta === 'object' ? opts.meta : {};
        this._handlers = new Map(); // handle -> { verb: fn }
        this._focus = this.tree.root;
        this._closed = false;
    }

    // ---- handlers ---------------------------------------------------------

    /**
     * Register a handler for a handle. `handlers` maps a verb (or a role's
     * default verb) to a function `(value, ctx) => result`.
     *
     *   bridge.on('ui:start', { activate: () => startGame() })
     *
     * The result may be `undefined` (success), a value, or
     * `{ ok:false, reason }` (an honest refusal).
     */
    on(handle, handlers) {
        const key = String(handle);
        const existing = this._handlers.get(key) || {};
        this._handlers.set(key, Object.assign(existing, handlers || {}));
        return this;
    }

    /** True when a handle has a live handler (the node is operable). */
    isOperable(id) {
        const h = this._handlers.get(String(id));
        return !!h && Object.keys(h).length > 0;
    }

    // ---- the four primitives ---------------------------------------------

    /** observe() -> a snapshot: the tree, the current focus, and a summary. */
    observe() {
        const focusNode = this.tree.get(this._focus);
        return {
            ok: true,
            surface: this.name,
            meta: this.meta,
            frame: this.ring.frame,
            focus: focusNode ? focusNode.id : null,
            summary: this.summary(),
            nodes: this.tree.list(),
        };
    }

    /**
     * act(id, verb?, value?) -> the result of one action.
     * The verb defaults to the node's declared default action.
     */
    act(id, verb, value) {
        if (this._closed) return { ok: false, reason: 'the bridge is closed' };
        const node = this.tree.get(String(id));
        if (!node) return { ok: false, reason: 'no such handle: ' + id };
        if (node.disabled) return { ok: false, reason: 'the node is disabled: ' + id };
        const chosen = verb || (node.actions[0] || ACTIONS.ACTIVATE);
        if (!node.actions.includes(chosen)) {
            return { ok: false, reason: 'the node does not accept "' + chosen + '": ' + id };
        }
        const handler = this._handlers.get(String(id));
        const fn = handler && handler[chosen];
        if (typeof fn !== 'function') {
            return { ok: false, reason: 'no handler for "' + chosen + '" on ' + id };
        }
        let out;
        try {
            out = fn(value, { bridge: this, node });
        } catch (e) {
            return { ok: false, reason: 'the handler threw: ' + (e && e.message ? e.message : String(e)) };
        }
        // A handler may refuse explicitly.
        if (out && typeof out === 'object' && out.ok === false) return out;
        this.ring.change(node.id, chosen, value === undefined ? null : value, { role: node.role, name: node.name });
        return { ok: true, id: node.id, verb: chosen, detail: out === undefined ? null : out };
    }

    /**
     * waitFor(predicate, timeoutMs) -> resolves when `predicate(observe())`
     * is truthy, or with `{ ok:false, reason:'timeout' }`. `predicate` may be
     * a function or a shallow object of expected snapshot fields.
     */
    waitFor(predicate, timeoutMs = 5000, opts = {}) {
        const step = opts.step || 25;
        const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
        const test = typeof predicate === 'function'
            ? predicate
            : (snap) => _matches(snap, predicate || {});
        return new Promise((resolve) => {
            const tick = () => {
                const snap = this.observe();
                if (test(snap)) return resolve({ ok: true, frame: snap.frame, snapshot: snap });
                if (Date.now() >= deadline) {
                    return resolve({ ok: false, reason: 'timeout', snapshot: snap });
                }
                setTimeout(tick, step);
            };
            tick();
        });
    }

    /** events(sinceFrame) -> the ring after a cursor. */
    events(sinceFrame = -1) {
        return { ok: true, frame: this.ring.frame, events: this.ring.since(sinceFrame) };
    }

    // ---- focus ------------------------------------------------------------

    /** Move focus to a handle (the human lane's "move to"; the agent's focus). */
    focus(id) {
        const node = this.tree.get(String(id));
        if (!node) return { ok: false, reason: 'no such handle: ' + id };
        this._focus = node.id;
        this.ring.focus(node.id, { name: node.name, role: node.role });
        return { ok: true, id: node.id };
    }

    /** The current focus handle. */
    get focusId() {
        return this._focus;
    }

    // ---- summary ----------------------------------------------------------

    /** A tiny human-readable summary of the surface (used in observe). */
    summary() {
        const all = this.tree.list();
        const actionable = all.filter((n) => !n.disabled && n.actions.length);
        return {
            nodes: all.length,
            actionable: actionable.length,
            live: all.filter((n) => n.role === ROLES.STATUS || n.role === ROLES.LOG || n.role === ROLES.ALERT).length,
            focus: this._focus,
        };
    }

    close() {
        this._closed = true;
        this._handlers.clear();
    }
}

function _matches(snap, expected) {
    for (const key of Object.keys(expected)) {
        if (key === 'summary') {
            const want = expected.summary;
            for (const k of Object.keys(want)) {
                if (snap.summary[k] !== want[k]) return false;
            }
        } else if (snap[key] !== expected[key]) {
            return false;
        }
    }
    return true;
}
