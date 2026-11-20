/**
 * gamestruct — the embedded binding (the third binding).
 *
 * A door in the SAME page or process as its client, behind a language
 * boundary that cannot marshal structured values: Godot's JavaScriptBridge,
 * Emscripten, a native addon, a Python C-extension. The wire bindings (HTTP,
 * MCP) assume a serializer at both ends; a boundary crossing has none, and
 * its failure modes are silent rather than loud.
 *
 * THE BOUNDARY LAW (SPEC N27) — live-verified on a wasm host, where all
 * three held at once:
 *
 *   1. a host callback's RETURN VALUE may not cross back at all (every type
 *      arrived as null), so a result must be PUBLISHED, never returned;
 *   2. a structured ARGUMENT may arrive as an opaque foreign handle (a JS
 *      object reached GDScript as a JavaScriptObject, not a Dictionary), so
 *      every payload must cross as JSON TEXT;
 *   3. an object literal that CONTAINS host callbacks does not survive the
 *      marshal (it landed as undefined), so the client facade must be built
 *      on the CLIENT side, never handed across as a host-side literal.
 *
 * So the shape is: JSON string in, JSON string published out, facade built
 * here. A callback runs synchronously, so the facade reads the side channel
 * back in the SAME turn — no await, no event loop, no race.
 *
 * Two halves, mirroring `http.createHandler`:
 *
 *   createDoor(bridge, opts)          the HOST side (reference): the three
 *                                     primitives returning JSON strings, for
 *                                     a host to publish on its side channel.
 *   createFacade({callbacks, read})   the CLIENT side: raw host callbacks
 *                                     plus a side-channel reader -> the four
 *                                     primitives returning parsed objects.
 *
 * The side channel is INJECTED, never assumed: `read` is the host's own
 * reader (Godot's `window.__synAgentResult`, a shared buffer, a native
 * getter). Naming a host's global here would bake one implementation into
 * the contract — the same reason the DOM adapter duck-types instead of
 * importing jsdom.
 *
 * Zero dependencies.
 */

import { matchesSnapshot } from '../bridge.mjs';

/** The primitives an embedded door serves synchronously. `see` is optional. */
export const PRIMITIVES = Object.freeze(['observe', 'act', 'wait_for', 'events']);

function _message(e) {
    return e && e.message ? e.message : String(e);
}

/**
 * Decode a value that crossed the boundary. A JSON string is parsed; a native
 * value (a same-process host, tests) passes through; anything unparseable is
 * null, so a caller refuses honestly instead of acting on garbage.
 */
function _decode(raw) {
    if (raw === undefined || raw === null) return null;
    if (typeof raw !== 'string') return raw;
    const text = raw.trim();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return null; }
}

/**
 * The HOST side (reference). Build a door whose methods return JSON STRINGS,
 * ready to be published on a side channel by a host behind a language
 * boundary. This is what `createFacade` reads back.
 *
 * @param {Bridge} bridge
 * @param {object} [opts]
 * @param {function} [opts.stringify]  a JSON serializer (defaults to JSON.stringify)
 * @returns {{observe: Function, act: Function, events: Function, see?: Function}}
 */
export function createDoor(bridge, opts = {}) {
    if (!bridge || typeof bridge.observe !== 'function') {
        throw new Error('createDoor: a Bridge is required');
    }
    const stringify = typeof opts.stringify === 'function' ? opts.stringify : JSON.stringify;

    const door = {
        observe() {
            return stringify(bridge.observe());
        },
        act(payload) {
            const p = _decode(payload);
            if (p == null) return stringify({ ok: false, reason: 'act requires a payload' });
            if (typeof p === 'string') return stringify(bridge.act(p));
            if (typeof p === 'object' && p.id) {
                return stringify(bridge.act(String(p.id), p.verb, p.value));
            }
            return stringify({ ok: false, reason: 'act requires an id' });
        },
        events(since) {
            const n = Number(_decode(since));
            return stringify(bridge.events(Number.isFinite(n) ? n : -1));
        },
    };
    // The eyes are async on the host (a capture renders a frame); a host that
    // has none simply never binds `see`, and the facade refuses honestly.
    if (bridge.canSee) {
        door.see = (payload) => {
            const p = _decode(payload) || {};
            return bridge.see(p).then((res) => stringify(res));
        };
    }
    return door;
}

/**
 * The CLIENT side. Wrap a host's raw callbacks (each `(jsonString) => void`)
 * plus a side-channel reader into the four primitives, returning PARSED
 * objects. Every failure is an honest `{ ok:false, reason }` value — a
 * missing callback, a throwing callback, an empty publish, malformed JSON —
 * never a throw into the caller's loop.
 *
 * @param {object} opts
 * @param {object} opts.callbacks  `{ observe, act, events, see? }` host callbacks
 * @param {function} opts.read     `() => string` the host's side-channel reader
 * @param {function} [opts.clear]  `() => void` the host's side-channel
 *   invalidator, called before every invoke. A stateful channel would
 *   otherwise return the previous publish when a callback dies without
 *   publishing, which reads as a success that never happened (N27).
 * @param {function} [opts.parse]  a JSON parser (defaults to JSON.parse)
 * @returns {{observe: Function, act: Function, waitFor: Function, events: Function, see: Function}}
 */
export function createFacade(opts = {}) {
    const callbacks = opts.callbacks || {};
    const read = typeof opts.read === 'function' ? opts.read : null;
    const clear = typeof opts.clear === 'function' ? opts.clear : null;
    const parse = typeof opts.parse === 'function' ? opts.parse : JSON.parse;

    /**
     * The side channel is STATEFUL: it keeps the last publish until the next
     * one overwrites it. A callback that dies mid-run (a host-side error, a
     * collected create_callback, a publish that never happens) leaves the
     * PREVIOUS result sitting there, and a naive read hands it back as if it
     * were fresh -- an agent would believe a click landed when nothing ran.
     *
     * So the channel is invalidated BEFORE the invoke, never compared after
     * it: two identical `observe` polls are legitimate, so a value comparison
     * cannot tell "fresh" from "stale". `clear` is the host's own invalidator
     * (Godot: `window.__synAgentResult = undefined`); a host that injects
     * only `read` keeps the old behavior, and this facade cannot invent a
     * clear for a channel it does not own.
     */
    function invalidate() {
        if (!clear) return;
        try {
            clear();
        } catch (e) {
            // A throwing invalidator is not worth failing the call over: the
            // read below still refuses honestly on an empty channel.
        }
    }

    /** Read the host's published JSON back in the same turn. */
    function readResult(what) {
        if (!read) return { ok: false, reason: 'the embedded door has no side channel' };
        let raw;
        try {
            raw = read();
        } catch (e) {
            return { ok: false, reason: 'the side channel threw: ' + _message(e) };
        }
        if (raw === undefined || raw === null || raw === '') {
            return { ok: false, reason: 'the host published no ' + what + ' result' };
        }
        try {
            return parse(String(raw));
        } catch (e) {
            return { ok: false, reason: 'the host published malformed JSON: ' + _message(e) };
        }
    }

    /** Invoke a host callback, turning a missing/throwing one into a refusal. */
    function invoke(name, arg) {
        const fn = callbacks[name];
        if (typeof fn !== 'function') {
            return { ok: false, reason: 'the embedded door has no "' + name + '" callback' };
        }
        invalidate();
        try {
            fn(arg === undefined ? '' : arg);
        } catch (e) {
            return { ok: false, reason: 'the "' + name + '" callback threw: ' + _message(e) };
        }
        return null;
    }

    return {
        /** True when the host bound a `see` callback (the surface has eyes). */
        get canSee() {
            return typeof callbacks.see === 'function';
        },
        observe() {
            const err = invoke('observe');
            return err || readResult('observe');
        },
        act(id, verb, value) {
            // Accept the DoorClient shape `act(id, verb, value)` and the object
            // shape `act({ id, verb, value })`; the payload crosses as JSON text.
            const payload = id && typeof id === 'object' ? id : { id, verb, value };
            const err = invoke('act', JSON.stringify(payload));
            return err || readResult('act');
        },
        events(since) {
            const cursor = since === undefined || since === null ? -1 : since;
            const err = invoke('events', JSON.stringify(cursor));
            return err || readResult('events');
        },
        // wait_for is JS-side polling of observe(): a boundary callback cannot
        // park a host thread, so the honest implementation is the same one a
        // browser door uses — poll, and time out honestly (N3).
        async waitFor(predicate, timeoutMs = 5000, o = {}) {
            const step = o.step || 25;
            const deadline = Date.now() + Math.max(0, Number(timeoutMs) || 0);
            const test = typeof predicate === 'function'
                ? predicate
                : (snap) => matchesSnapshot(snap, predicate || {});
            for (;;) {
                const snap = this.observe();
                if (test(snap)) return { ok: true, frame: snap.frame, snapshot: snap };
                if (Date.now() >= deadline) {
                    return { ok: false, reason: 'timeout', snapshot: snap };
                }
                await new Promise((r) => setTimeout(r, step));
            }
        },
        async see(o = {}) {
            const fn = callbacks.see;
            if (typeof fn !== 'function') return { ok: false, reason: 'this surface has no eyes' };
            invalidate();
            let out;
            try {
                out = fn(JSON.stringify(o || {}));
            } catch (e) {
                return { ok: false, reason: 'the "see" callback threw: ' + _message(e) };
            }
            // A host may publish asynchronously (a capture renders a frame).
            if (out && typeof out.then === 'function') {
                try {
                    out = await out;
                } catch (e) {
                    return { ok: false, reason: 'the capture failed: ' + _message(e) };
                }
            }
            // A same-process host may hand the JSON straight back.
            if (typeof out === 'string' && out.trim()) {
                try {
                    return parse(out);
                } catch (e) {
                    return { ok: false, reason: 'the host published malformed JSON: ' + _message(e) };
                }
            }
            return readResult('see');
        },
    };
}
