/**
 * gamestruct — the bridgeworks test suite.
 *
 * Covers the tree/roles vocabulary, both lanes, both bindings, and the two
 * reference adapters. Run: `npm test`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Bridge, ROLES, ACTIONS, Tree, mintHandle, EventRing } from '../lib/index.mjs';
import { human, agent, bindings } from '../lib/index.mjs';
import { buildBridge as buildSynmergia, pushLog, doorNodes } from '../lib/adapters/synmergia.mjs';
import { DoorClient, pursueOne } from '../lib/adapters/vant.mjs';
import { buildBridge as buildForm, readValues as readFormValues, validate as validateForm } from '../lib/adapters/webform.mjs';
import { fromElement, roleFor, nameFor } from '../lib/adapters/dom.mjs';
import * as tui from '../lib/hosts/tui.mjs';

// A duck-typed DOM element (no jsdom; the adapter reads a tiny interface).
function el(tagName, attributes = {}, children = [], textContent = '') {
    return {
        tagName,
        attributes,
        children,
        textContent,
        getAttribute(n) { return this.attributes[n] != null ? this.attributes[n] : null; },
    };
}

function demo() {
    const b = new Bridge({ name: 'demo' });
    b.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' });
    b.tree.add(null, { id: 'ui:volume', role: ROLES.SLIDER, name: 'Volume', value: 50, min: 0, max: 100 });
    b.tree.add(null, { id: 'ui:mute', role: ROLES.CHECKBOX, name: 'Mute', checked: false });
    b.tree.add(null, { id: 'ui:status', role: ROLES.STATUS, name: 'Ready' });
    b.on('ui:start', { activate: () => 'starting' });
    b.on('ui:volume', { set_value: (v) => v });
    b.on('ui:mute', { activate: () => true });
    return b;
}

test('mintHandle requires a stable local part', () => {
    assert.equal(mintHandle('ui', 'start'), 'ui:start');
    assert.throws(() => mintHandle('ui', ''));
});

test('tree rejects duplicate handles', () => {
    const b = demo();
    assert.throws(() => b.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'dup' }));
});

test('tree.add with a null parent attaches to the root', () => {
    const b = demo();
    assert.equal(b.tree.get('root').children.length, 4);
    assert.equal(b.tree.size(), 5);
});

test('human lane: focus order is the linear traversal', () => {
    const b = demo();
    const r = human.render(b);
    assert.deepEqual(r.focusOrder, ['ui:start', 'ui:volume', 'ui:mute']);
    assert.equal(r.nodes.find((n) => n.id === 'ui:volume').value, 50);
});

test('human lane: a11y dump marks the focus', () => {
    const b = demo();
    b.focus('ui:mute');
    const dump = human.a11yDump(b);
    assert.match(dump, /\[\*\]\s+checkbox "Mute"/);
});

test('human lane: audit flags an unlabeled button', () => {
    const b = new Bridge({ name: 'bad' });
    b.tree.add(null, { id: 'ui:oops', role: ROLES.BUTTON, name: '' });
    const res = human.audit(b);
    assert.equal(res.ok, false);
    assert.equal(res.problems[0].id, 'ui:oops');
});

test('human lane: live roles carry politeness', () => {
    const b = demo();
    const status = human.render(b).nodes.find((n) => n.id === 'ui:status');
    assert.equal(status.live, true);
    assert.equal(status.politeness, 'polite');
});

test('agent lane: one tool per actionable node with an inputSchema', () => {
    const tools = agent.toolCatalog(demo());
    assert.equal(tools.length, 3);
    const vol = tools.find((t) => t._handle === 'ui:volume');
    assert.deepEqual(vol.inputSchema.properties.verb.enum, [ACTIONS.SET_VALUE]);
    assert.equal(vol.inputSchema.properties.value.type, 'number');
});

test('agent lane: tool name slugs a handle', () => {
    assert.equal(agent.toolName('ui:start'), 'act__ui__start');
});

test('agent lane: toolCall routes back to act()', async () => {
    const b = demo();
    const res = await agent.toolCall(b, 'act__ui__mute', {});
    assert.equal(res.ok, true);
    assert.equal(res.id, 'ui:mute');
});

test('agent lane: affordances list the operable handles', () => {
    const aff = agent.affordances(demo());
    assert.deepEqual(aff.map((a) => a.handle), ['ui:start', 'ui:volume', 'ui:mute']);
});

test('bridge: act refuses an unknown handle', () => {
    assert.equal(demo().act('ui:nope').ok, false);
});

test('bridge: act refuses a verb the node does not declare', () => {
    assert.equal(demo().act('ui:start', ACTIONS.SET_VALUE, 1).ok, false);
});

test('bridge: act refuses a disabled node', () => {
    const b = demo();
    b.tree.get('ui:start').disabled = true;
    assert.equal(b.act('ui:start').ok, false);
});

test('bridge: act records a change event', () => {
    const b = demo();
    b.act('ui:volume', ACTIONS.SET_VALUE, 75);
    const ev = b.events(-1).events;
    assert.ok(ev.some((e) => e.kind === 'change' && e.detail.id === 'ui:volume'));
});

test('bridge: events(since) is an honest cursor', () => {
    const b = demo();
    b.act('ui:start');
    const cursor = b.ring.frame;
    b.act('ui:mute');
    assert.equal(b.events(cursor).events.length, 1);
});

test('bridge: waitFor resolves on a predicate', async () => {
    const b = demo();
    const p = b.waitFor((s) => s.summary.actionable >= 3, 200);
    b.act('ui:start');
    assert.equal((await p).ok, true);
});

test('bridge: waitFor times out honestly', async () => {
    const b = demo();
    const res = await b.waitFor((s) => s.summary.nodes > 9999, 60);
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'timeout');
});

test('ring: capacity drops the oldest entries', () => {
    const ring = new EventRing(3);
    for (let i = 0; i < 5; i++) ring.push('change', { id: 'n' + i });
    assert.equal(ring.all().length, 3);
    assert.equal(ring.all()[0].detail.id, 'n2');
});

test('http binding: serves observe/act/events', async () => {
    const handle = bindings.http.createHandler(demo());
    const obs = await handle({ method: 'GET', url: '/observe' });
    assert.equal(obs.status, 200);
    assert.ok(obs.body.nodes.length);
    const act = await handle({ method: 'POST', url: '/act', body: { id: 'ui:start' } });
    assert.equal(act.body.ok, true);
    const ev = await handle({ method: 'GET', url: '/events?since=-1' });
    assert.ok(ev.body.events.length);
});

test('http binding: fail-closed on a bad token', async () => {
    const handle = bindings.http.createHandler(demo(), { token: 't0k' });
    assert.equal((await handle({ method: 'GET', url: '/observe', headers: {} })).status, 401);
    const ok = await handle({ method: 'GET', url: '/observe', headers: { authorization: 'Bearer t0k' } });
    assert.equal(ok.status, 200);
});

test('http binding: 404 on an unknown route', async () => {
    const handle = bindings.http.createHandler(demo());
    assert.equal((await handle({ method: 'GET', url: '/nope' })).status, 404);
});

test('mcp binding: initialize/tools-list/tools-call', async () => {
    const handle = bindings.mcp.createHandler(demo());
    const init = await handle({ id: 1, method: 'initialize' });
    assert.ok(init.result.serverInfo.name.includes('demo'));
    const list = await handle({ id: 2, method: 'tools/list' });
    const start = list.result.tools.find((t) => t._handle === 'ui:start');
    const call = await handle({ id: 3, method: 'tools/call', params: { name: start.name, arguments: { verb: 'activate' } } });
    assert.equal(call.result.isError, false);
});

test('mcp binding: an unknown method is a JSON-RPC error', async () => {
    const handle = bindings.mcp.createHandler(demo());
    const res = await handle({ id: 9, method: 'nope' });
    assert.equal(res.error.code, -32601);
});

// --- the eyes: the optional fifth primitive ------------------------------

test('eyes: a blind surface refuses see() honestly, and advertises no see tool', async () => {
    const b = demo();
    assert.equal(b.canSee, false);
    const res = await b.see();
    assert.equal(res.ok, false);
    assert.match(res.reason, /no eyes/);
    assert.ok(!agent.toolCatalog(b).some((t) => t.name === 'see'));
});

test('eyes: a sighted surface answers see() and advertises the see tool', async () => {
    const b = demo();
    b.onSee((opts) => ({ path: '/tmp/eyes-' + (opts.label || 'x') + '.png', bytes: 4096, width: 640, height: 360 }));
    assert.equal(b.canSee, true);
    const tool = agent.toolCatalog(b).find((t) => t.name === 'see');
    assert.ok(tool, 'the see tool is advertised once a capture fn is registered');
    assert.equal(tool._handle, 'surface:eyes');
    const res = await b.see({ label: 'boot' });
    assert.equal(res.ok, true);
    assert.equal(res.path, '/tmp/eyes-boot.png');
    assert.equal(res.mime, 'image/png');
    // Seeing lands on the ring, so both lanes read it (not a silent side effect).
    assert.ok(b.events(-1).events.some((e) => e.detail && e.detail.field === 'see'));
});

test('eyes: a capture that names no image is an honest failure', async () => {
    const b = demo();
    b.onSee(() => ({ bytes: 4096 }));   // no path, no url
    const res = await b.see();
    assert.equal(res.ok, false);
    assert.match(res.reason, /no image/);
});

test('eyes: a capture that throws is an honest failure, never a crash', async () => {
    const b = demo();
    b.onSee(() => { throw new Error('no framebuffer'); });
    const res = await b.see();
    assert.equal(res.ok, false);
    assert.match(res.reason, /no framebuffer/);
});

test('eyes: an explicitly-refused capture passes through untouched', async () => {
    const b = demo();
    b.onSee(() => ({ ok: false, reason: 'blank frame' }));
    const res = await b.see();
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'blank frame');
});

test('eyes: HTTP /see serves a capture, 404s a blind surface', async () => {
    const blind = bindings.http.createHandler(demo());
    assert.equal((await blind({ method: 'GET', url: '/see' })).status, 404);
    const sighted = demo();
    sighted.onSee(() => ({ path: '/tmp/wire.png', bytes: 2048 }));
    const handle = bindings.http.createHandler(sighted);
    const res = await handle({ method: 'POST', url: '/see', body: { label: 'wire' } });
    assert.equal(res.status, 200);
    assert.equal(res.body.path, '/tmp/wire.png');
});

test('eyes: MCP tools/call "see" and the direct "see" method both capture', async () => {
    const b = demo();
    b.onSee((opts) => ({ path: '/tmp/mcp-' + (opts.label || 'x') + '.png', bytes: 2048 }));
    const handle = bindings.mcp.createHandler(b);
    const viaTool = await handle({ id: 1, method: 'tools/call', params: { name: 'see', arguments: { label: 'a' } } });
    assert.equal(viaTool.result.isError, false);
    assert.equal(JSON.parse(viaTool.result.content[0].text).path, '/tmp/mcp-a.png');
    const direct = await handle({ id: 2, method: 'see', params: { label: 'b' } });
    assert.equal(direct.result.path, '/tmp/mcp-b.png');
});

test('eyes: MCP "see" on a blind surface is a JSON-RPC error, not a fake image', async () => {
    const handle = bindings.mcp.createHandler(demo());
    const res = await handle({ id: 1, method: 'see' });
    assert.ok(res.error, 'a blind surface returned an error');
    assert.match(res.error.message, /no eyes/);
});

// A real Synmergia door `observe()` snapshot (the exact shape
// agent_driver.observe() emits). Used verbatim so the adapter is pinned to
// the door, not to an invented shape.
function doorSnapshot() {
    return {
        ok: true,
        frame: 42,
        enabled: true,
        scene: 'GlobeWorld',
        in_world: true,
        player: {
            id: 'p1', name: 'Kestrel',
            position: { x: 1, y: 2, z: 3 },
            health: 80, max_health: 100, is_dead: false,
            level: 7, mana: 40, stamina: 55, char_class: 'cleric', species: 'human',
        },
        target: { id: 'wolf_1', name: 'Wolf' },
        party: { party_id: 'pt1', leader_id: 'p1', members: [{ id: 'p2', name: 'Aria' }] },
        actions: [
            { id: 'world:wolf_1', kind: 'entity', action: 'Attack Wolf', detail: '3m away, level 4', disabled: false },
            { id: 'ui:MainMenu/MenuButtons/StartButton', kind: 'button', action: 'Start game', detail: '', disabled: false },
            { id: 'ui:Login/Center/Panel/Form/UsernameField', kind: 'lineedit', action: 'Username input field', detail: '', disabled: false, value: '' },
        ],
        events: [{ t: 100, frame: 42, event: 'damage_dealt', data: { a: 'wolf_1', c: 12 } }],
    };
}

test('synmergia adapter: maps the REAL door snapshot (not an invented one)', () => {
    const b = buildSynmergia(doorSnapshot());
    assert.ok(b.tree.has('world:player:hp'));
    assert.equal(b.tree.get('world:player:hp').value, 80);
    assert.equal(b.tree.get('world:player:hp').max, 100);
    assert.equal(b.tree.get('world:target').value, 'Wolf');
    // THE HANDLE LAW: the door's own handles survive as node ids, unchanged
    assert.ok(b.tree.has('world:wolf_1'));
    assert.ok(b.tree.has('ui:MainMenu/MenuButtons/StartButton'));
    assert.equal(b.tree.get('world:wolf_1').role, ROLES.LISTITEM);
    assert.equal(b.tree.get('ui:MainMenu/MenuButtons/StartButton').role, ROLES.BUTTON);
    // both lanes read the same nodes
    assert.ok(human.render(b).focusOrder.includes('world:wolf_1'));
    assert.ok(agent.toolCatalog(b).some((t) => t._handle === 'ui:MainMenu/MenuButtons/StartButton'));
});

test('synmergia adapter: act() forwards the door handle VERBATIM', async () => {
    const sent = [];
    const b = buildSynmergia(doorSnapshot(), {
        send: async (verb, args) => { sent.push([verb, args]); return { ok: true }; },
    });
    await b.act('ui:MainMenu/MenuButtons/StartButton', ACTIONS.ACTIVATE);
    await b.act('world:wolf_1', ACTIONS.ACTIVATE);
    assert.equal(sent.length, 2);
    assert.deepEqual(sent[0], ['act', { id: 'ui:MainMenu/MenuButtons/StartButton' }]);
    assert.deepEqual(sent[1], ['act', { id: 'world:wolf_1' }]);
});

test('synmergia adapter: a settable control advertises set_value and forwards it', async () => {
    const sent = [];
    const b = buildSynmergia(doorSnapshot(), {
        send: async (verb, args) => { sent.push([verb, args]); return { ok: true }; },
    });
    const field = b.tree.get('ui:Login/Center/Panel/Form/UsernameField');
    // The affordance mirrors the role: a textbox offers set_value, a button does not.
    assert.deepEqual(field.actions, [ACTIONS.SET_VALUE]);
    assert.deepEqual(b.tree.get('ui:MainMenu/MenuButtons/StartButton').actions, [ACTIONS.ACTIVATE]);
    await b.act('ui:Login/Center/Panel/Form/UsernameField', ACTIONS.SET_VALUE, 'Ada');
    assert.deepEqual(sent[0], ['act', { id: 'ui:Login/Center/Panel/Form/UsernameField', verb: 'set_value', value: 'Ada' }]);
});

test('synmergia adapter: a door event record becomes a readable line', () => {
    const b = buildSynmergia({ scene: 's' });
    const n = pushLog(b, [
        { t: 1, frame: 2, event: 'damage_dealt', data: { a: 'wolf_1', c: 12 } },
        'You hit the Wolf for 12.',
        { text: 'plain' },
    ]);
    assert.equal(n, 3);
    assert.equal(b.events(-1).events.length, 3);
});

test('synmergia adapter: a partial (out-of-world) snapshot still renders', () => {
    const b = buildSynmergia({ ok: true, frame: 0, in_world: false, player: null, actions: [] });
    assert.equal(b.name, 'synmergia');
    assert.ok(b.tree.has('world:log'));
});

test('synmergia adapter: without a see sender the surface is honestly blind', async () => {
    const b = buildSynmergia(doorSnapshot());
    assert.equal(b.canSee, false);
    const res = await b.see();
    assert.equal(res.ok, false);
    assert.match(res.reason, /no eyes/);
});

test('synmergia adapter: a see sender gives the bridge eyes (forwards the door verb)', async () => {
    const calls = [];
    const b = buildSynmergia(doorSnapshot(), {
        see: async (verb, args) => {
            calls.push([verb, args]);
            return { ok: true, path: '/tmp/syn-see.png', url: 'file:///tmp/syn-see.png', bytes: 352000, width: 1280, height: 720 };
        },
    });
    assert.equal(b.canSee, true);
    assert.ok(agent.toolCatalog(b).some((t) => t.name === 'see'), 'the see tool is advertised');
    const res = await b.see({ label: 'world' });
    assert.equal(res.ok, true);
    assert.equal(res.path, '/tmp/syn-see.png');
    assert.equal(res.width, 1280);
    assert.deepEqual(calls[0], ['see', { label: 'world' }]);
});

test('vant adapter: DoorClient drives an in-process bridge', async () => {
    const b = demo();
    const client = new DoorClient({ bridge: b });
    const snap = await client.observe();
    assert.ok(snap.nodes.length);
    const found = await client.find({ role: ROLES.BUTTON, name: 'start' });
    assert.equal(found.id, 'ui:start');
    const res = await client.act('ui:start');
    assert.equal(res.ok, true);
});

test('vant adapter: DoorClient catalog over a bridge', async () => {
    const client = new DoorClient({ bridge: demo() });
    const cat = await client.catalog();
    assert.equal(cat.ok, true);
    assert.equal(cat.tools.length, 3);
});

test('vant adapter: DoorClient.see over an in-process bridge forwards to the door', async () => {
    const b = demo();
    b.onSee((opts) => ({ path: '/tmp/client-' + (opts.label || 'x') + '.png', bytes: 1024 }));
    const client = new DoorClient({ bridge: b });
    const res = await client.see({ label: 'look' });
    assert.equal(res.ok, true);
    assert.equal(res.path, '/tmp/client-look.png');
});

test('vant adapter: DoorClient.see on a blind bridge refuses honestly', async () => {
    const client = new DoorClient({ bridge: demo() });
    const res = await client.see();
    assert.equal(res.ok, false);
    assert.match(res.reason, /no eyes/);
});

test('vant adapter: pursueOne does exactly one act', async () => {
    const b = demo();
    let acts = 0;
    const client = new DoorClient({ bridge: b });
    const orig = client.act.bind(client);
    client.act = async (...a) => { acts += 1; return orig(...a); };
    const res = await pursueOne(client);
    assert.equal(res.ok, true);
    assert.equal(acts, 1);
});

test('vant adapter: an unreachable door is reported, never thrown', async () => {
    const client = new DoorClient({ url: 'http://127.0.0.1:9', token: 'x' });
    const res = await client.observe();
    assert.equal(res.ok, false);
    assert.match(res.reason, /unreachable/);
});

test('agent lane: toolCatalog builds from a bare node list (the wire shape)', () => {
    // Over the wire there is no bridge object -- only observe().nodes. The
    // catalog must build from that snapshot, and a remote door carries eyes.
    const nodes = agent.toolCatalog(demo()).map((t) => ({
        id: t._handle, role: t._role, name: t.name, actions: t._actions, disabled: false,
    })).filter((n) => !String(n.id).startsWith('surface:'));
    const tools = agent.toolCatalog(nodes, { canSee: true });
    assert.ok(tools.some((t) => t._handle === 'ui:start'));
    assert.ok(tools.some((t) => t.name === 'see'), 'the remote catalog advertises the eyes');
    assert.ok(!agent.toolCatalog(nodes).some((t) => t.name === 'see'), 'blind by default');
});

test('vant adapter: DoorClient.catalog over a remote door uses observe (not a dead route)', async () => {
    // A tiny real HTTP server that serves the four primitives the way a
    // gamestruct door does. catalog() must read observe().nodes, never POST
    // a /mcp/exec the door never had.
    const http = await import('node:http');
    const bridge = demo();
    const handle = bindings.http.createHandler(bridge);
    const server = http.createServer(async (req, res) => {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        const parsed = await handle({ method: req.method, url: req.url, body: raw ? JSON.parse(raw) : undefined, headers: req.headers });
        res.writeHead(parsed.status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(parsed.body));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    try {
        const client = new DoorClient({ url: 'http://127.0.0.1:' + port });
        const cat = await client.catalog();
        assert.equal(cat.ok, true);
        assert.ok(cat.tools.some((t) => t._handle === 'ui:start'), 'catalog read the live tree');
        assert.ok(cat.tools.some((t) => t.name === 'see'), 'a remote door advertises its eyes');
    } finally {
        await new Promise((r) => server.close(r));
    }
});

test('synmergia adapter: doorNodes folds the door wire shape into SPEC nodes', () => {
    // The door serves a flat `actions[]` (a game snapshot), NOT a serialized
    // tree. doorNodes is the ONE normalizer: it reuses the same role mapping +
    // verb affordance the local bridge build uses, so a remote catalog and the
    // live tree can never drift.
    const nodes = doorNodes(doorSnapshot());
    assert.equal(nodes.length, 3);
    const wolf = nodes.find((n) => n.id === 'world:wolf_1');
    assert.equal(wolf.role, ROLES.LISTITEM);
    assert.deepEqual(wolf.actions, [ACTIONS.ACTIVATE]);
    assert.equal(wolf.name, 'Attack Wolf');
    const field = nodes.find((n) => n.id.endsWith('UsernameField'));
    assert.equal(field.role, ROLES.TEXTBOX);
    assert.deepEqual(field.actions, [ACTIONS.SET_VALUE]);
    // no actions -> an empty list, never a throw
    assert.deepEqual(doorNodes({}), []);
    assert.deepEqual(doorNodes(null), []);
});

test('vant adapter: DoorClient.catalog over a REAL world door (actions wire) with mapNodes', async () => {
    // The exact drift the family carried: a world door's observe() serves its
    // own snapshot, so a remote catalog must fold it via mapNodes. Build the
    // door from the synmergia adapter (the real wire shape) and prove the
    // remote catalog reads the live handles -- the door's own, unchanged.
    const http = await import('node:http');
    // The door serves its OWN snapshot on /observe -- a flat `actions[]`, not a
    // serialized tree. This is the wire a real world door speaks.
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(req.url.startsWith('/observe') ? doorSnapshot() : { ok: true }));
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;
    try {
        const client = new DoorClient({ url: 'http://127.0.0.1:' + port, mapNodes: doorNodes });
        const cat = await client.catalog();
        assert.equal(cat.ok, true);
        assert.ok(cat.tools.some((t) => t._handle === 'ui:MainMenu/MenuButtons/StartButton'), 'catalog read the live handle');
        assert.ok(cat.tools.some((t) => t._handle === 'ui:Login/Center/Panel/Form/UsernameField' && t._actions.includes(ACTIONS.SET_VALUE)), 'a settable control survives the wire');
        assert.ok(cat.tools.some((t) => t.name === 'see'), 'a door with eyes advertises the see tool');
        // Without mapNodes a bare world door honestly reports it served no nodes.
        const blind = new DoorClient({ url: 'http://127.0.0.1:' + port });
        const noMap = await blind.catalog();
        assert.equal(noMap.ok, false);
        assert.match(noMap.reason, /no nodes/);
    } finally {
        await new Promise((r) => server.close(r));
    }
});

// --- the generality receipt: a surface that is not a game ------------------

test('webform adapter: a plain form builds the SAME tree both lanes read', () => {
    const b = buildForm({
        surface: 'contact',
        fields: [
            { id: 'name', label: 'Your name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email', required: true },
        ],
        submit: { label: 'Send' },
    });
    // the human lane: every interactive node has an accessible name, audit clean
    assert.equal(human.audit(b).ok, true);
    assert.ok(human.render(b).focusOrder.includes('form:field:name'));
    // the agent lane: one tool per actionable node
    const tools = agent.toolCatalog(b);
    assert.ok(tools.some((t) => t._handle === 'form:field:name'));
    assert.ok(tools.some((t) => t._handle === 'form:submit'));
});

test('webform adapter: set_value fills a field, and the value is readable back', async () => {
    const b = buildForm({ fields: [{ id: 'name', label: 'Name', type: 'text' }] });
    const res = await b.act('form:field:name', 'set_value', 'Ada');
    assert.equal(res.ok, true);
    assert.equal(readFormValues(b).name, 'Ada');
    assert.equal(b.tree.get('form:field:name').value, 'Ada');
});

test('webform adapter: a radio group is a GROUP of RADIOs, one checked', async () => {
    const b = buildForm({ fields: [{ id: 'plan', label: 'Plan', type: 'radio', options: ['Free', 'Pro'] }] });
    assert.equal(b.tree.get('form:field:plan').role, ROLES.GROUP);
    await b.act('form:field:plan:pro', 'activate');
    assert.equal(b.tree.get('form:field:plan:pro').checked, true);
    assert.equal(b.tree.get('form:field:plan:free').checked, false);
    assert.equal(readFormValues(b).plan, 'Pro');
});

test('webform adapter: submit refuses an invalid form by name, never silently', async () => {
    const b = buildForm({
        fields: [{ id: 'email', label: 'Email', type: 'email', required: true }],
        submit: { label: 'Send' },
    });
    const res = await b.act('form:submit');
    assert.equal(res.ok, false);
    assert.equal(res.reason, 'invalid');
    assert.equal(res.errors[0].field, 'email');
    // the refusal is announced to the human lane (a live region), not swallowed
    const live = b.events(0).events.filter((e) => e.kind === 'announce');
    assert.ok(live.length >= 1);
});

test('webform adapter: a valid form submits once and forwards its values', async () => {
    const sent = [];
    const b = buildForm({
        fields: [{ id: 'name', label: 'Name', type: 'text', required: true }],
        submit: { label: 'Send' },
    }, { send: async (verb, args) => { sent.push([verb, args]); return { ok: true }; } });
    await b.act('form:field:name', 'set_value', 'Ada');
    const res = await b.act('form:submit');
    assert.equal(res.ok, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0][0], 'submit');
    assert.equal(sent[0][1].values.name, 'Ada');
});

test('webform adapter: validate reports required + malformed email honestly', () => {
    const spec = {
        fields: [
            { id: 'name', label: 'Name', type: 'text', required: true },
            { id: 'email', label: 'Email', type: 'email' },
        ],
    };
    assert.equal(validateForm(spec, { name: 'Ada', email: 'not-an-email' }).ok, false);
    assert.equal(validateForm(spec, { name: 'Ada', email: 'ada@example.com' }).ok, true);
    assert.equal(validateForm(spec, {}).errors.length, 1);
});

// --- the second non-game surface: a live DOM subtree -----------------------

test('dom adapter: a real element builds the SAME tree both lanes read', () => {
    const form = el('form', { id: 'login' }, [
        el('h1', {}, [], 'Sign in'),
        el('input', { id: 'user', type: 'text', 'aria-label': 'Username' }),
        el('button', { id: 'go', type: 'submit' }, [], 'Log in'),
    ]);
    const b = fromElement(form);
    assert.equal(b.tree.get('dom:user').role, ROLES.TEXTBOX);
    assert.equal(b.tree.get('dom:go').role, ROLES.BUTTON);
    assert.equal(b.tree.get('dom:user').name, 'Username');
    assert.equal(human.audit(b).ok, true);
    assert.ok(agent.toolCatalog(b).some((t) => t._handle === 'dom:user'));
});

test('dom adapter: a label[for] names its field (real a11y shape)', () => {
    const form = el('form', { id: 'f' }, [
        el('label', { for: 'email' }, [], 'Email address'),
        el('input', { id: 'email', type: 'email' }),
    ]);
    const b = fromElement(form);
    assert.equal(b.tree.get('dom:email').name, 'Email address');
    assert.equal(human.audit(b).ok, true);
});

test('dom adapter: aria-hidden subtrees are not in the tree', () => {
    const doc = el('div', { id: 'root' }, [
        el('button', { id: 'real' }, [], 'Real'),
        el('div', { id: 'ghost', 'aria-hidden': 'true' }, [el('button', { id: 'hidden' }, [], 'Nope')]),
    ]);
    const b = fromElement(doc);
    assert.ok(b.tree.get('dom:real'));
    assert.equal(b.tree.get("dom:ghost"), null);
    assert.equal(b.tree.get("dom:hidden"), null);
});

test('dom adapter: roleFor + nameFor follow ARIA order', () => {
    assert.equal(roleFor(el('input', { type: 'range' })), ROLES.SLIDER);
    assert.equal(roleFor(el('div', { role: 'switch' })), ROLES.SWITCH);
    assert.equal(roleFor(el('a', { href: '/x' })), ROLES.LINK);
    assert.equal(roleFor(el('a', {})), ROLES.TEXT);
    assert.equal(nameFor(el('img', { alt: 'Logo' })), 'Logo');
    assert.equal(nameFor(el('button', { 'aria-label': 'Close' }, [], 'x')), 'Close');
});

test('dom adapter: act() routes through the door with the node handle', async () => {
    const sent = [];
    const doc = el('form', { id: 'f' }, [el('input', { id: 'q', type: 'text', 'aria-label': 'Query' })]);
    const b = fromElement(doc, { act: (h, v, val) => { sent.push([h, v, val]); return { ok: true }; } });
    const res = await b.act('dom:q', 'set_value', 'hello');
    assert.equal(res.ok, true);
    assert.deepEqual(sent, [['dom:q', 'set_value', 'hello']]);
});

// --- the human lane on a non-visual host: the terminal ---------------------

test('tui host: render is a text frame of the same tree', () => {
    const b = demo();
    const frame = tui.render(b, { width: 60 });
    assert.match(frame, /button "Start game"/);
    assert.match(frame, /slider "Volume" = 50/);
    // every rendered line is padded to the frame width (a fixed TUI)
    for (const line of frame.split('\n')) assert.equal(line.length, 60);
});

test('tui host: tab walks the focus order, enter runs the default action', () => {
    const b = demo();
    assert.deepEqual(tui.focusOrder(b), ['ui:start', 'ui:volume', 'ui:mute']);
    tui.key(b, 'tab');
    assert.equal(b.focusId, 'ui:start');
    const res = tui.key(b, 'enter');
    assert.equal(res.ok, true);
    assert.equal(res.action, 'activate');
    assert.equal(res.id, 'ui:start');
});

test('tui host: enter on a slider runs set_value, not activate', () => {
    const b = demo();
    tui.key(b, 'tab');
    tui.key(b, 'tab'); // -> ui:volume (a slider)
    assert.equal(b.focusId, 'ui:volume');
    const res = tui.key(b, 'enter');
    assert.equal(res.action, 'set_value');
});

test('tui host: hint names the focused node and its verbs', () => {
    const b = demo();
    tui.key(b, 'tab');
    assert.match(tui.hint(b), /button.*Start game.*activate/);
});
