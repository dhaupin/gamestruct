/**
 * gamestruct adapter — Vant (the brain / the client).
 *
 * Vant is an agent brain. This adapter is the CLIENT half of the lane: it
 * drives any gamestruct door -- an in-process Bridge, or a remote HTTP/MCP
 * endpoint -- through the four primitives, and exposes the two things a
 * brain needs to plan:
 *
 *   observe()   -> the snapshot
 *   catalog()   -> the MCP tool list (what can be done)
 *   act(handle, verb, value) -> do it
 *   find(role|name) -> locate a handle without hardcoding ids
 *
 * A multi-agent world (e.g. synmergia's agent-play lane) seats more than one
 * body behind one door. A `principal` names WHICH body a primitive drives:
 * absent or '' is the local seat (the human), a handle is that agent's body.
 * It rides the door's own wire (`?principal=` on /observe, a top-level
 * `principal` on /act) and is a REMOTE-only concern -- an in-process bridge
 * has one seat.
 *
 * The SAME adapter drives a local Bridge (tests, in-page) and a remote door
 * (a real game server). A brain never learns whether the world is local.
 *
 * Remote calls ride an INJECTABLE transport (SPEC N25): pass `fetch` in the
 * constructor to route every request through your own wall (SSRF/DNS-rebinding
 * refusal, circuit breaker); the default is the global fetch, so the reference
 * stays usable standalone. A refusal body (`{ ok:false, reason }`, HTTP
 * 409/408) crosses the wire as DATA (N26) -- the door's own reason is never
 * collapsed into a generic transport error.
 *
 * Zero dependencies (uses global fetch when a url is given).
 */

export class DoorClient {
    /**
     * @param {object} target
     * @param {object} [target.bridge]  an in-process Bridge (local door)
     * @param {string} [target.url]     a remote door base URL
     * @param {string} [target.token]   bearer token for a remote door
     * @param {string} [target.prefix]  route prefix
     * @param {function} [target.fetch] a transport wall (a fetch-shaped fn);
     *   defaults to global fetch. A brain SHOULD inject its own walled fetch
     *   (SSRF/DNS-rebinding refusal, circuit breaker) -- a door URL is an
     *   operator-supplied address, and this is the process that must not open
     *   a raw socket to it.
     */
    constructor(target = {}) {
        this.bridge = target.bridge || null;
        this.url = target.url ? String(target.url).replace(/\/$/, '') : null;
        this.token = target.token || '';
        this.prefix = (target.prefix || '').replace(/\/$/, '');
        // The transport wall. Global fetch is the honest default so the
        // reference stays usable standalone; a host supplies its own.
        this._fetchImpl = typeof target.fetch === 'function' ? target.fetch : fetch;
        // A world door may serve its own snapshot (a game's `observe()` is not a
        // serialized tree) -- `mapNodes(snapshot) -> nodes[]` folds it into the
        // SPEC node shape so the remote catalog can build. Omit it and the door
        // must serve `nodes` directly.
        this.mapNodes = typeof target.mapNodes === 'function' ? target.mapNodes : null;
        this._frame = -1;
        if (!this.bridge && !this.url) {
            throw new Error('DoorClient: a bridge or a url is required');
        }
    }

    get remote() {
        return !this.bridge && !!this.url;
    }

    async observe(opts = {}) {
        if (this.bridge) return this.bridge.observe();
        const principal = opts && opts.principal;
        const q = principal ? '?principal=' + encodeURIComponent(String(principal)) : '';
        return this._get('/observe' + q);
    }

    async act(id, verb, value, opts = {}) {
        if (this.bridge) return this.bridge.act(id, verb, value);
        const principal = opts && opts.principal;
        // The door folds a dictionary `value` into its args, so the principal
        // must ride TOP-LEVEL: folded into `value` it would be swallowed
        // whenever `value` is a scalar.
        const body = { id, verb, value };
        if (principal) body.principal = String(principal);
        return this._post('/act', body);
    }

    async waitFor(predicate, timeoutMs = 5000) {
        if (this.bridge) return this.bridge.waitFor(predicate, timeoutMs);
        return this._post('/wait_for', { predicate, timeoutMs });
    }

    async events(sinceFrame) {
        const since = sinceFrame === undefined ? this._frame : sinceFrame;
        if (this.bridge) {
            const res = this.bridge.events(since);
            this._frame = res.frame;
            return res;
        }
        const res = await this._get('/events?since=' + encodeURIComponent(since));
        if (res && typeof res.frame === 'number') this._frame = res.frame;
        return res;
    }

    /**
     * see(opts) -> a visual capture of the surface (the eyes). Forwards to the
     * door's own `see`; a door with no eyes returns an honest refusal. The
     * result is a descriptor ({ ok, path?, url?, bytes?, width?, height? }) --
     * read the file with your own vision; the pixels never cross the wire.
     */
    async see(opts = {}) {
        if (this.bridge) return this.bridge.see(opts);
        return this._get('/see' + _query(opts));
    }

    /** The catalog of things this door can do (an MCP tools/list shape). */
    async catalog() {
        if (this.bridge) {
            const { toolCatalog } = await import('../profiles/agent.mjs');
            return { ok: true, tools: toolCatalog(this.bridge) };
        }
        // Over the wire there is no bridge object -- only the snapshot from
        // observe(). Build the same catalog from the node list, and carry the
        // door's own eyes: a door with /see (any door) advertises the tool. A
        // world door whose snapshot is NOT a serialized tree supplies a
        // `mapNodes` normalizer (see the synmergia adapter's `doorNodes`).
        const { toolCatalog } = await import('../profiles/agent.mjs');
        const snap = await this.observe();
        const nodes = this.mapNodes ? this.mapNodes(snap) : (snap && snap.nodes);
        if (!Array.isArray(nodes)) {
            return { ok: false, reason: (snap && snap.reason) || 'observe returned no nodes' };
        }
        return { ok: true, tools: toolCatalog(nodes, { canSee: true }) };
    }

    /** Locate a handle by role and/or name substring (never hardcode ids). */
    async find({ role, name } = {}) {
        const snap = await this.observe();
        const needle = name ? String(name).toLowerCase() : null;
        return (snap.nodes || []).find((n) =>
            (!role || n.role === role) && (!needle || String(n.name).toLowerCase().includes(needle))) || null;
    }

    async _get(path) {
        return this._fetch('GET', path);
    }

    async _post(path, body) {
        return this._fetch('POST', path, body);
    }

    async _fetch(method, path, body) {
        const url = this.url + this.prefix + path;
        const headers = { 'content-type': 'application/json' };
        if (this.token) headers.authorization = 'Bearer ' + this.token;
        let res;
        try {
            res = await this._fetchImpl(url, {
                method,
                headers,
                body: body === undefined ? undefined : JSON.stringify(body),
            });
        } catch (e) {
            return { ok: false, reason: 'unreachable: ' + (e && e.message ? e.message : String(e)) };
        }
        let parsed = null;
        try { parsed = await res.json(); } catch { parsed = null; }
        if (!res.ok && (!parsed || parsed.ok === undefined)) {
            return { ok: false, status: res.status, reason: 'http ' + res.status };
        }
        return parsed;
    }
}

/**
 * Build a `?a=b&c=d` query string from an options object (empty when none).
 * Only string/number/boolean values are carried; undefined/null are dropped.
 */
function _query(opts) {
    const parts = [];
    for (const k of Object.keys(opts || {})) {
        const v = opts[k];
        if (v === undefined || v === null) continue;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    }
    return parts.length ? '?' + parts.join('&') : '';
}

/**
 * One "leisure" move: pick the first affordance the door offers and do it
 * once. This is the play plug a brain uses when it has no objective -- it is
 * the SAME lane, used without a goal, never a second protocol.
 */
export async function pursueOne(client, opts = {}) {
    const snap = await client.observe();
    const candidates = (snap.nodes || []).filter((n) =>
        !n.disabled && Array.isArray(n.actions) && n.actions.length &&
        (!opts.role || n.role === opts.role) &&
        (!opts.not || !opts.not.includes(n.role)));
    if (!candidates.length) return { ok: false, reason: 'nothing to do here' };
    const pick = opts.pick === 'last' ? candidates[candidates.length - 1] : candidates[0];
    const verb = opts.verb || pick.actions[0];
    const res = await client.act(pick.id, verb, opts.value);
    return { ok: res.ok !== false, handle: pick.id, name: pick.name, verb, detail: res };
}
