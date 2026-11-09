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
import { buildBridge as buildSynmergia, pushLog } from '../lib/adapters/synmergia.mjs';
import { DoorClient, pursueOne } from '../lib/adapters/vant.mjs';
import { buildBridge as buildForm, readValues as readFormValues, validate as validateForm } from '../lib/adapters/webform.mjs';

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

test('agent lane: toolCall routes back to act()', () => {
    const b = demo();
    const res = agent.toolCall(b, 'act__ui__mute', {});
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

test('mcp binding: initialize/tools-list/tools-call', () => {
    const handle = bindings.mcp.createHandler(demo());
    const init = handle({ id: 1, method: 'initialize' });
    assert.ok(init.result.serverInfo.name.includes('demo'));
    const list = handle({ id: 2, method: 'tools/list' });
    const start = list.result.tools.find((t) => t._handle === 'ui:start');
    const call = handle({ id: 3, method: 'tools/call', params: { name: start.name, arguments: { verb: 'activate' } } });
    assert.equal(call.result.isError, false);
});

test('mcp binding: an unknown method is a JSON-RPC error', () => {
    const handle = bindings.mcp.createHandler(demo());
    const res = handle({ id: 9, method: 'nope' });
    assert.equal(res.error.code, -32601);
});

test('synmergia adapter: builds a tree from a world snapshot', () => {
    const b = buildSynmergia({
        surface: 'synmergia',
        player: { id: 'p1', name: 'Kestrel', hp: 80, maxHp: 100, level: 7 },
        targets: [{ id: 'wolf_1', name: 'Wolf', kind: 'enemy', distance: 3.2 }],
        actions: [{ id: 'attack', name: 'Attack', verb: 'attack' }],
        party: [{ id: 'p2', name: 'Aria', role: 'healer' }],
        inventory: [{ id: 'wep_iron_sword', name: 'Iron Sword', qty: 1 }],
        log: ['You hit the Wolf for 12.'],
    });
    assert.ok(b.tree.has('world:player:hp'));
    assert.ok(b.tree.has('world:target:wolf_1'));
    assert.ok(b.tree.has('world:action:attack'));
    assert.equal(b.tree.get('world:player:hp').value, 80);
    // the human lane sees the target; the agent lane can drive it
    assert.ok(human.render(b).focusOrder.includes('world:target:wolf_1'));
    assert.ok(agent.toolCatalog(b).some((t) => t._handle === 'world:action:attack'));
});

test('synmergia adapter: handlers forward to the door', async () => {
    const sent = [];
    const b = buildSynmergia(
        { surface: 's', actions: [{ id: 'attack', name: 'Attack', verb: 'attack' }] },
        { send: async (verb, args) => { sent.push([verb, args]); return { ok: true }; } },
    );
    await b.act('world:action:attack', ACTIONS.ACTIVATE);
    assert.equal(sent.length, 1);
    assert.equal(sent[0][0], 'act');
    assert.equal(sent[0][1].verb, 'attack');
});

test('synmergia adapter: pushLog feeds the ring', () => {
    const b = buildSynmergia({ surface: 's' });
    const n = pushLog(b, ['a', 'b']);
    assert.equal(n, 2);
    assert.equal(b.events(-1).events.length, 2);
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
