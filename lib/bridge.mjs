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
 *   see(opts?)                 -> a visual capture of the surface (the EYES)
 *
 * `see` is the fifth, OPTIONAL primitive: a surface whose host can render
 * pixels (a game viewport, a browser page) registers a capture function and
 * answers `see()` with a frame the agent reads with its OWN vision. A surface
 * with no renderer honestly reports `{ ok:false, reason:'this surface has no
 * eyes' }` -- never a fake image. The capture returns a small descriptor
 * (`{ ok, path?, url?, mime?, bytes?, width?, height?, ... }`), never the
 * pixel bytes: the frame stays on the host and the wire stays small.
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
     * @param {Function} [opts.see]     the capture fn (the eyes); see onSee()
     */
    constructor(opts = {}) {
        this.tree = opts.tree || new Tree({ id: 'root', role: ROLES.REGION, name: opts.name || 'surface' });
        this.ring = opts.ring || new EventRing(opts.capacity || 256);
        this.name = opts.name || 'surface';
        this.meta = opts.meta && typeof opts.meta === 'object' ? opts.meta : {};
        this._handlers = new Map(); // handle -> { verb: fn }
        this._focus = this.tree.root;
        this._closed = false;
        this._see = typeof opts.see === 'function' ? opts.see : null; // the eyes
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

    // ---- the eyes (the optional fifth primitive) --------------------------

    /**
     * Register the capture function (the host's eyes). `fn(opts)` returns a
     * capture descriptor `{ ok, path?, url?, mime?, bytes?, width?, height? }`
     * (async allowed). A host with a renderer calls this once at build time;
     * a host without one never does, and `see()` stays an honest refusal.
     */
    onSee(fn) {
        this._see = typeof fn === 'function' ? fn : null;
        return this;
    }

    /** True when this surface has eyes (a capture function is registered). */
    get canSee() {
        return typeof this._see === 'function';
    }

    /**
     * see(opts) -> a visual capture of the surface. Forwards to the host's
     * capture function; a surface with no eyes refuses honestly. A capture
     * that resolves to nothing (or a bad shape) is an honest failure, never a
     * silent success with no image.
     */
    async see(opts = {}) {
        if (this._closed) return { ok: false, reason: 'the bridge is closed' };
        if (typeof this._see !== 'function') {
            return { ok: false, reason: 'this surface has no eyes' };
        }
        let out;
        try {
            out = await this._see(opts);
        } catch (e) {
            return { ok: false, reason: 'the capture threw: ' + (e && e.message ? e.message : String(e)) };
        }
        if (!out || typeof out !== 'object') {
            return { ok: false, reason: 'the capture returned no image' };
        }
        if (out.ok === false) return out;
        // A descriptor must name SOMETHING locatable (a path or a url).
        if (!out.path && !out.url) {
            return { ok: false, reason: 'the capture named no image (no path or url)' };
        }
        const res = Object.assign({ ok: true, mime: out.mime || 'image/png' }, out);
        // Seeing is an event both lanes can read (the human lane's live region
        // and the agent lane's cursor), so a capture is not a silent side effect.
        this.ring.push('state', { id: 'surface:eyes', field: 'see', value: res });
        return res;
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
