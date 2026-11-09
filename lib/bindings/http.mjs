/**
 * gamestruct — the HTTP binding.
 *
 * Maps the four primitives onto plain HTTP routes so ANY runtime can be a
 * door (a game server, a browser tab, a CI stub). The binding is transport
 * only: it never invents state, it forwards to the Bridge.
 *
 *   GET  /observe                  -> observe()
 *   POST /act       {id,verb,value}-> act(id, verb, value)
 *   POST /wait_for  {predicate,timeoutMs} -> waitFor(...)
 *   GET  /events?since=N           -> events(N)
 *   GET|POST /see   {label?,full?} -> see(...)  (the eyes; 404 when blind)
 *
 * `handle(req, res)` is runtime-agnostic: it takes a minimal request shape
 * `{ method, url, headers, body }` and returns `{ status, headers, body }`.
 * A host wires it to node:http, a Worker, or a test harness. Auth is the
 * host's job; this module only reads an optional bearer token if asked.
 *
 * Zero dependencies.
 */

export const ROUTES = Object.freeze(['/observe', '/act', '/wait_for', '/events', '/see', '/health']);

/**
 * Build a request handler over a Bridge.
 * @param {Bridge} bridge
 * @param {object} [opts]
 * @param {string} [opts.token]   when set, every request must carry it
 * @param {string} [opts.prefix]  a route prefix (e.g. '/game')
 */
export function createHandler(bridge, opts = {}) {
    const prefix = (opts.prefix || '').replace(/\/$/, '');
    const token = opts.token || '';

    return async function handle(req) {
        const method = String(req.method || 'GET').toUpperCase();
        const url = String(req.url || '/');
        const path = url.split('?')[0].slice(prefix.length) || '/';
        const query = parseQuery(url);

        if (path === '/health') {
            return json(200, { ok: true, surface: bridge.name, frame: bridge.ring.frame });
        }

        if (token && !authorized(req, token)) {
            return json(401, { ok: false, reason: 'unauthorized' });
        }

        try {
            if (method === 'GET' && path === '/observe') {
                return json(200, bridge.observe());
            }
            if (method === 'GET' && path === '/events') {
                const since = query.since === undefined ? -1 : Number(query.since);
                return json(200, bridge.events(since));
            }
            if (method === 'POST' && path === '/act') {
                const body = bodyOf(req);
                if (!body || !body.id) return json(400, { ok: false, reason: 'act requires an id' });
                const res = bridge.act(body.id, body.verb, body.value);
                return json(res.ok ? 200 : 409, res);
            }
            if (method === 'POST' && path === '/wait_for') {
                const body = bodyOf(req);
                const timeout = body && body.timeoutMs !== undefined ? body.timeoutMs : 5000;
                const predicate = body && body.predicate;
                const res = await bridge.waitFor(predicate, timeout);
                return json(res.ok ? 200 : 408, res);
            }
            if ((method === 'GET' || method === 'POST') && path === '/see') {
                const body = bodyOf(req) || query;
                const res = await bridge.see({ label: body.label, full: body.full });
                if (!res.ok && /no eyes/.test(res.reason || '')) return json(404, res);
                return json(res.ok ? 200 : 502, res);
            }
            return json(404, { ok: false, reason: 'no such route: ' + path });
        } catch (e) {
            return json(500, { ok: false, reason: 'door error: ' + (e && e.message ? e.message : String(e)) });
        }
    };
}

function authorized(req, token) {
    const headers = req.headers || {};
    const raw = headers.authorization || headers.Authorization || headers['x-api-key'] || '';
    const bearer = String(raw).replace(/^Bearer\s+/i, '').trim();
    return bearer === token;
}

function bodyOf(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.trim()) {
        try { return JSON.parse(req.body); } catch { return null; }
    }
    return null;
}

function parseQuery(url) {
    const q = {};
    const idx = url.indexOf('?');
    if (idx < 0) return q;
    for (const pair of url.slice(idx + 1).split('&')) {
        if (!pair) continue;
        const [k, v] = pair.split('=');
        q[decodeURIComponent(k)] = v === undefined ? '' : decodeURIComponent(v);
    }
    return q;
}

function json(status, body) {
    return {
        status,
        headers: { 'content-type': 'application/json' },
        body,
    };
}
