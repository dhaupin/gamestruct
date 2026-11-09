/**
 * gamestruct adapter — Synmergia (the world / the door).
 *
 * Synmergia is a Godot MMORPG with an agent door. This adapter builds a
 * gamestruct Tree from a Synmergia world snapshot and registers handlers that
 * forward to the door's own verbs. It is the reference "world" adapter: a
 * game does not adopt gamestruct by rewriting itself -- it writes ONE
 * function that maps its own state to a Tree, and the two lanes fall out.
 *
 * The input `snapshot` is the shape Synmergia's door already produces from
 * `observe()` (see lib/adapters/synmergia.js in the vant repo for the client
 * half). We accept a tolerant shape so a partial world still renders.
 *
 * Zero dependencies.
 */

import { Bridge } from '../bridge.mjs';
import { ROLES, ACTIONS } from '../roles.mjs';

/**
 * @param {object} snapshot  a Synmergia world snapshot:
 *   {
 *     surface, frame,
 *     player: { id, name, hp, maxHp, level, x, y, z },
 *     targets: [{ id, name, kind, distance, hp, maxHp }],
 *     actions: [{ id, name, verb?, enabled? }],
 *     log: [{ text, kind? }],
 *     party: [{ id, name, role? }],
 *     inventory: [{ id, name, qty? }],
 *   }
 * @param {object} [opts]
 * @param {(verb:string, args:object)=>Promise<any>} [opts.send]  the door call
 * @param {string} [opts.surface]
 */
export function buildBridge(snapshot, opts = {}) {
    const snap = snapshot || {};
    const send = typeof opts.send === 'function' ? opts.send : async () => ({ ok: true, dry: true });
    const bridge = new Bridge({
        name: opts.surface || snap.surface || 'synmergia',
        meta: { source: 'synmergia', frame: snap.frame || 0 },
    });

    const root = bridge.tree.root;

    // --- the player: a status region + a stat group ------------------------
    if (snap.player) {
        const p = snap.player;
        const playerNode = 'world:player';
        bridge.tree.add(root, {
            id: playerNode,
            role: ROLES.GROUP,
            name: p.name || 'You',
            children: [
                {
                    id: 'world:player:hp',
                    role: ROLES.PROGRESSBAR,
                    name: 'Health',
                    value: p.hp != null ? p.hp : null,
                    max: p.maxHp != null ? p.maxHp : null,
                },
                {
                    id: 'world:player:level',
                    role: ROLES.TEXT,
                    name: 'Level',
                    value: p.level != null ? p.level : null,
                },
            ],
        });
    }

    // --- the world: nearby targets, each an actionable node ----------------
    if (Array.isArray(snap.targets) && snap.targets.length) {
        const listId = 'world:targets';
        bridge.tree.add(root, { id: listId, role: ROLES.LIST, name: 'Nearby' });
        snap.targets.forEach((t, i) => {
            const handle = 'world:target:' + (t.id || i);
            bridge.tree.add(listId, {
                id: handle,
                role: ROLES.LISTITEM,
                name: t.name || ('target ' + i),
                value: t.distance != null ? t.distance : null,
                description: t.kind ? String(t.kind) : '',
                actions: [ACTIONS.SELECT, ACTIONS.FOCUS],
                meta: { kind: t.kind || '', hp: t.hp != null ? t.hp : null, maxHp: t.maxHp != null ? t.maxHp : null },
            });
            bridge.on(handle, {
                select: () => send('target', { id: t.id }),
                focus: () => send('target', { id: t.id, focus: true }),
            });
        });
    }

    // --- the action bar: the verbs the player can take ---------------------
    if (Array.isArray(snap.actions) && snap.actions.length) {
        const barId = 'world:actions';
        bridge.tree.add(root, { id: barId, role: ROLES.GROUP, name: 'Actions' });
        snap.actions.forEach((a, i) => {
            const handle = 'world:action:' + (a.id || a.name || i);
            bridge.tree.add(barId, {
                id: handle,
                role: ROLES.BUTTON,
                name: a.name || ('action ' + i),
                disabled: a.enabled === false,
                actions: [ACTIONS.ACTIVATE],
                meta: { verb: a.verb || a.name || '' },
            });
            bridge.on(handle, {
                activate: () => send('act', { verb: a.verb || a.id || a.name, args: a.args || {} }),
            });
        });
    }

    // --- the party: a read-only list (the human's team; the agent's peers) --
    if (Array.isArray(snap.party) && snap.party.length) {
        const partyId = 'world:party';
        bridge.tree.add(root, { id: partyId, role: ROLES.LIST, name: 'Party' });
        snap.party.forEach((m, i) => {
            bridge.tree.add(partyId, {
                id: 'world:party:' + (m.id || i),
                role: ROLES.LISTITEM,
                name: m.name || ('member ' + i),
                description: m.role ? String(m.role) : '',
                actions: [],
            });
        });
    }

    // --- the bag: read-only items -----------------------------------------
    if (Array.isArray(snap.inventory) && snap.inventory.length) {
        const bagId = 'world:bag';
        bridge.tree.add(root, { id: bagId, role: ROLES.LIST, name: 'Bag' });
        snap.inventory.forEach((it, i) => {
            bridge.tree.add(bagId, {
                id: 'world:item:' + (it.id || i),
                role: ROLES.LISTITEM,
                name: it.name || ('item ' + i),
                value: it.qty != null ? it.qty : null,
                actions: [],
            });
        });
    }

    // --- the combat log: the live region (announcements) -------------------
    const logId = 'world:log';
    bridge.tree.add(root, { id: logId, role: ROLES.LOG, name: 'Combat log', value: '' });
    if (Array.isArray(snap.log)) {
        for (const line of snap.log.slice(-20)) {
            const text = typeof line === 'string' ? line : (line && line.text) || '';
            if (text) bridge.ring.announce(text, { source: 'world' });
        }
    }

    return bridge;
}

/** Feed a new snapshot's log lines into an existing bridge's ring. */
export function pushLog(bridge, lines) {
    if (!Array.isArray(lines)) return 0;
    let n = 0;
    for (const line of lines) {
        const text = typeof line === 'string' ? line : (line && line.text) || '';
        if (text) { bridge.ring.announce(text, { source: 'world' }); n += 1; }
    }
    return n;
}

export { ROLES, ACTIONS };
