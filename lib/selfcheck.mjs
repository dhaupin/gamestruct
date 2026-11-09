/**
 * gamestruct — the self-checks.
 *
 * The bridgeworks' own truth battery: build a surface, then assert the ONE
 * tree drives BOTH lanes. This is the gate `gamestruct check` runs, and the
 * heart of the test suite. It is deliberately dependency-free so it runs in
 * any environment.
 *
 * Zero dependencies.
 */

import { Bridge } from './bridge.mjs';
import { ROLES, ACTIONS } from './roles.mjs';
import { toolCatalog, toolCall, affordances } from './profiles/agent.mjs';
import { render, audit } from './profiles/human.mjs';
import { createHandler as httpHandler } from './bindings/http.mjs';
import { createHandler as mcpHandler } from './bindings/mcp.mjs';

function demoBridge() {
    const bridge = new Bridge({ name: 'demo' });
    bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' });
    bridge.tree.add(null, { id: 'ui:volume', role: ROLES.SLIDER, name: 'Volume', value: 50, min: 0, max: 100 });
    bridge.tree.add(null, { id: 'ui:mute', role: ROLES.CHECKBOX, name: 'Mute', checked: false });
    bridge.tree.add(null, { id: 'ui:status', role: ROLES.STATUS, name: 'Ready' });
    bridge.on('ui:start', { activate: () => 'starting' });
    bridge.on('ui:volume', { set_value: (v) => v });
    bridge.on('ui:mute', { activate: () => true });
    return bridge;
}

export async function runSelfChecks() {
    const rows = [];
    const check = (name, fn) => {
        try {
            const detail = fn();
            rows.push({ name, ok: true, detail: detail ? String(detail) : '' });
        } catch (e) {
            rows.push({ name, ok: false, detail: e && e.message ? e.message : String(e) });
        }
    };
    const acheck = async (name, fn) => {
        try {
            const detail = await fn();
            rows.push({ name, ok: true, detail: detail ? String(detail) : '' });
        } catch (e) {
            rows.push({ name, ok: false, detail: e && e.message ? e.message : String(e) });
        }
    };

    check('a tree rejects a duplicate handle', () => {
        const b = demoBridge();
        let threw = false;
        try { b.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Dup' }); } catch { threw = true; }
        if (!threw) throw new Error('duplicate handle was accepted');
        return 'refused';
    });

    check('human lane renders an accessible name per interactive node', () => {
        const b = demoBridge();
        const r = render(b);
        if (!r.nodes.length) throw new Error('no nodes rendered');
        const unlabeled = r.nodes.filter((n) => n.focusable && !n.name);
        if (unlabeled.length) throw new Error('unlabeled focusable: ' + unlabeled.map((n) => n.id).join(','));
        return r.focusOrder.length + ' focusable';
    });

    check('human a11y audit is clean on a labeled surface', () => {
        const res = audit(demoBridge());
        if (!res.ok) throw new Error(JSON.stringify(res.problems));
        return 'clean';
    });

    check('human a11y audit catches an unlabeled button', () => {
        const b = new Bridge({ name: 'bad' });
        b.tree.add(null, { id: 'ui:oops', role: ROLES.BUTTON, name: '' });
        const res = audit(b);
        if (res.ok) throw new Error('audit missed the unlabeled button');
        return res.problems.length + ' problem(s)';
    });

    check('agent lane builds one tool per actionable node', () => {
        const b = demoBridge();
        const tools = toolCatalog(b);
        const actionable = b.tree.list().filter((n) => !n.disabled && n.actions.length).length;
        if (tools.length !== actionable) throw new Error('tools ' + tools.length + ' != actionable ' + actionable);
        return tools.length + ' tools';
    });

    await acheck('agent tool call dispatches onto the same act()', async () => {
        const b = demoBridge();
        const tools = toolCatalog(b);
        const start = tools.find((t) => t._handle === 'ui:start');
        if (!start) throw new Error('no tool for ui:start');
        const res = await toolCall(b, start.name, { verb: 'activate' });
        if (!res.ok) throw new Error(res.reason);
        return 'ui:start via ' + start.name;
    });

    check('affordances list matches the interactive nodes', () => {
        const b = demoBridge();
        const aff = affordances(b);
        if (aff.length !== 3) throw new Error('expected 3 affordances, got ' + aff.length);
        return aff.length + ' affordances';
    });

    check('act refuses an unknown handle', () => {
        const b = demoBridge();
        const res = b.act('ui:nope');
        if (res.ok) throw new Error('unknown handle was accepted');
        return res.reason;
    });

    check('act refuses a verb the node does not accept', () => {
        const b = demoBridge();
        const res = b.act('ui:start', ACTIONS.SET_VALUE, 1);
        if (res.ok) throw new Error('set_value on a button was accepted');
        return res.reason;
    });

    check('act records a change event on the ring', () => {
        const b = demoBridge();
        b.act('ui:volume', ACTIONS.SET_VALUE, 75);
        const ev = b.events(-1).events;
        if (!ev.some((e) => e.kind === 'change' && e.detail.id === 'ui:volume')) {
            throw new Error('no change event recorded');
        }
        return ev.length + ' events';
    });

    check('events(since) resumes from a cursor', () => {
        const b = demoBridge();
        b.act('ui:start');
        const cursor = b.ring.frame;
        b.act('ui:mute');
        const after = b.events(cursor).events;
        if (after.length !== 1) throw new Error('expected 1 new event, got ' + after.length);
        return 'cursor ' + cursor;
    });

    await acheck('mcp binding initializes + lists + calls', async () => {
        const b = demoBridge();
        const handle = mcpHandler(b);
        const init = await handle({ id: 1, method: 'initialize' });
        if (!init.result || !init.result.serverInfo) throw new Error('initialize failed');
        const list = await handle({ id: 2, method: 'tools/list' });
        if (!list.result.tools.length) throw new Error('no tools listed');
        const start = list.result.tools.find((t) => t._handle === 'ui:start');
        const call = await handle({ id: 3, method: 'tools/call', params: { name: start.name, arguments: { verb: 'activate' } } });
        if (call.result.isError) throw new Error('tools/call errored');
        return 'init+list+call';
    });

    await acheck('a blind surface refuses see() honestly (no fake image)', async () => {
        const b = demoBridge();
        const res = await b.see();
        if (res.ok) throw new Error('a blind bridge claimed to see');
        if (!/no eyes/.test(res.reason)) throw new Error('wrong reason: ' + res.reason);
        if (toolCatalog(b).some((t) => t.name === 'see')) throw new Error('a blind bridge advertised the see tool');
        return res.reason;
    });

    await acheck('a sighted surface answers see() and advertises the see tool', async () => {
        const b = demoBridge();
        b.onSee((opts) => ({ path: '/tmp/frame-' + (opts.label || 'x') + '.png', bytes: 4096, width: 320, height: 200 }));
        if (!b.canSee) throw new Error('canSee is false after onSee');
        const tool = toolCatalog(b).find((t) => t.name === 'see');
        if (!tool) throw new Error('the see tool was not advertised');
        const res = await b.see({ label: 'boot' });
        if (!res.ok || !res.path) throw new Error('see returned no capture');
        if (res.mime !== 'image/png') throw new Error('wrong mime: ' + res.mime);
        // Seeing lands on the ring (not a silent side effect).
        if (!b.events(-1).events.some((e) => e.detail && e.detail.field === 'see')) {
            throw new Error('no see event recorded');
        }
        return res.path;
    });

    await acheck('see() over the mcp tool call lands on bridge.see()', async () => {
        const b = demoBridge();
        b.onSee(() => ({ path: '/tmp/eyes.png', bytes: 2048 }));
        const handle = mcpHandler(b);
        const call = await handle({ id: 4, method: 'tools/call', params: { name: 'see', arguments: { label: 'hi' } } });
        if (call.result.isError) throw new Error('see tool call errored: ' + JSON.stringify(call.result));
        const payload = JSON.parse(call.result.content[0].text);
        if (!payload.path) throw new Error('see tool call returned no path');
        return payload.path;
    });

    check('the SAME handle drives both lanes', () => {
        const b = demoBridge();
        const inHuman = render(b).focusOrder.includes('ui:start');
        const inAgent = toolCatalog(b).some((t) => t._handle === 'ui:start');
        if (!inHuman || !inAgent) throw new Error('handle missing from a lane');
        return 'ui:start in both';
    });

    await acheck('waitFor resolves when a predicate holds', async () => {
        const b = demoBridge();
        const p = b.waitFor((snap) => snap.summary.actionable >= 3, 200);
        b.act('ui:start');
        const res = await p;
        if (!res.ok) throw new Error(res.reason);
        return 'resolved at frame ' + res.frame;
    });

    await acheck('waitFor times out honestly', async () => {
        const b = demoBridge();
        const res = await b.waitFor((snap) => snap.summary.nodes > 9999, 80);
        if (res.ok) throw new Error('impossible predicate resolved');
        if (res.reason !== 'timeout') throw new Error('wrong reason: ' + res.reason);
        return 'timeout';
    });

    await acheck('http binding serves observe/act/events', async () => {
        const b = demoBridge();
        const handle = httpHandler(b);
        const obs = await handle({ method: 'GET', url: '/observe' });
        if (obs.status !== 200 || !obs.body.nodes.length) throw new Error('observe failed');
        const act = await handle({ method: 'POST', url: '/act', body: { id: 'ui:start' } });
        if (act.status !== 200 || !act.body.ok) throw new Error('act failed');
        const ev = await handle({ method: 'GET', url: '/events?since=-1' });
        if (ev.status !== 200 || !ev.body.events.length) throw new Error('events failed');
        return 'three routes';
    });

    await acheck('http binding refuses a bad token', async () => {
        const b = demoBridge();
        const handle = httpHandler(b, { token: 'secret' });
        const res = await handle({ method: 'GET', url: '/observe', headers: {} });
        if (res.status !== 401) throw new Error('expected 401, got ' + res.status);
        const good = await handle({ method: 'GET', url: '/observe', headers: { authorization: 'Bearer secret' } });
        if (good.status !== 200) throw new Error('good token refused');
        return 'fail-closed';
    });

    return { ok: rows.every((r) => r.ok), rows };
}
