/**
 * gamestruct adapter — Synmergia (the world / the door).
 *
 * Synmergia is a Godot MMORPG with an agent door
 * (`game/core/services/agent_door.gd` + `agent_driver.gd`). This adapter maps
 * the door's REAL `observe()` snapshot onto a gamestruct Tree and registers
 * handlers that forward to the door's own verbs. It is the reference "world"
 * adapter: a game does not adopt gamestruct by rewriting itself -- it writes
 * ONE function that maps its own state to a Tree, and the two lanes fall out.
 *
 * The snapshot shape is the door's, verbatim:
 *   {
 *     ok, frame, enabled, scene, in_world,
 *     player:  { id, name, position:{x,y,z}, health, max_health, is_dead,
 *                level?, mana?, stamina?, is_sprinting?, char_class?, species? } | null,
 *     target:  { id, name } | null,
 *     party:   { party_id, leader_id, members:[...] } | null,
 *     actions: [{ id, kind, action, detail, disabled }],   // the actionable list
 *     events:  [{ t, frame, event, data }],
 *   }
 *
 * THE HANDLE LAW: `actions[].id` is already a stable handle the door
 * understands (`ui:<root-relative-path>` for Controls, `world:<entity_id>`
 * for world entities). This adapter reuses it as the node id UNCHANGED, so
 * `act(handle)` forwards the exact string the door's `activate_by_id` matches.
 * Never re-slug a door handle -- the door resolves it, not us.
 *
 * Zero dependencies.
 */

import { Bridge } from '../bridge.mjs';
import { ROLES, ACTIONS } from '../roles.mjs';

/** door `kind` (engine class or "entity") -> gamestruct role. */
const KIND_ROLES = Object.freeze({
    entity: ROLES.LISTITEM,
    button: ROLES.BUTTON,
    checkbox: ROLES.CHECKBOX,
    checkbutton: ROLES.CHECKBOX,
    lineedit: ROLES.TEXTBOX,
    textedit: ROLES.TEXTBOX,
    itemlist: ROLES.LIST,
    slider: ROLES.SLIDER,
    hslider: ROLES.SLIDER,
    vslider: ROLES.SLIDER,
    optionbutton: ROLES.COMBOBOX,
    label: ROLES.TEXT,
    richlabel: ROLES.TEXT,
    panel: ROLES.GROUP,
});

/**
 * @param {object} snapshot  a Synmergia door `observe()` result (tolerant: a
 *   partial world still renders).
 * @param {object} [opts]
 * @param {(verb:string, args:object)=>Promise<any>} [opts.send]  the door call.
 *   `send('act', { id })` is the shape the door's /act route expects.
 * @param {string} [opts.surface]
 */
export function buildBridge(snapshot, opts = {}) {
    const snap = snapshot || {};
    const send = typeof opts.send === 'function' ? opts.send : async () => ({ ok: true, dry: true });
    const bridge = new Bridge({
        name: opts.surface || snap.scene || 'synmergia',
        meta: { source: 'synmergia', frame: snap.frame || 0, in_world: snap.in_world === true },
    });
    const root = bridge.tree.root;

    // --- the player: a group with live stat rows ---------------------------
    const p = snap.player;
    if (p) {
        const rows = [{
            id: 'world:player:hp',
            role: ROLES.PROGRESSBAR,
            name: 'Health',
            value: p.health != null ? p.health : null,
            max: p.max_health != null ? p.max_health : null,
        }];
        if (p.level != null) rows.push({ id: 'world:player:level', role: ROLES.TEXT, name: 'Level', value: p.level });
        if (p.mana != null) rows.push({ id: 'world:player:mana', role: ROLES.TEXT, name: 'Mana', value: p.mana });
        if (p.stamina != null) rows.push({ id: 'world:player:stamina', role: ROLES.TEXT, name: 'Stamina', value: p.stamina });
        if (p.is_dead === true) rows.push({ id: 'world:player:dead', role: ROLES.STATUS, name: 'You are dead', value: 'dead' });
        bridge.tree.add(root, {
            id: 'world:player',
            role: ROLES.GROUP,
            name: p.name || 'You',
            description: p.char_class ? String(p.char_class) : '',
            children: rows,
        });
    }

    // --- the current target: read-only status ------------------------------
    if (snap.target && snap.target.id) {
        bridge.tree.add(root, {
            id: 'world:target',
            role: ROLES.STATUS,
            name: 'Target',
            value: snap.target.name || snap.target.id,
            meta: { target_id: snap.target.id },
        });
    }

    // --- the actionable list: the door's handles, unchanged ----------------
    if (Array.isArray(snap.actions) && snap.actions.length) {
        const barId = 'world:actions';
        bridge.tree.add(root, { id: barId, role: ROLES.GROUP, name: 'Actions' });
        for (const a of snap.actions) {
            const handle = String(a.id || '');
            if (!handle) continue;
            const role = KIND_ROLES[String(a.kind || '').toLowerCase()] || ROLES.BUTTON;
            if (bridge.tree.has(handle)) continue; // never double-add a handle
            bridge.tree.add(barId, {
                id: handle,
                role,
                name: a.action || handle,
                description: a.detail ? String(a.detail) : '',
                disabled: a.disabled === true,
                actions: [ACTIONS.ACTIVATE],
                meta: { kind: a.kind || '' },
            });
            bridge.on(handle, {
                activate: () => send('act', { id: handle }),
            });
        }
    }

    // --- the party: a read-only list (the human's team; the agent's peers) --
    const party = snap.party;
    if (party && Array.isArray(party.members) && party.members.length) {
        const partyId = 'world:party';
        bridge.tree.add(root, { id: partyId, role: ROLES.LIST, name: 'Party' });
        party.members.forEach((m, i) => {
            const id = typeof m === 'object' ? (m.id || m.entity_id || i) : m;
            const name = typeof m === 'object' ? (m.name || m.display_name || String(id)) : String(m);
            bridge.tree.add(partyId, {
                id: 'world:party:' + id,
                role: ROLES.LISTITEM,
                name,
                description: typeof m === 'object' && m.role ? String(m.role) : '',
                actions: [],
            });
        });
    }

    // --- the event ring: the live region (announcements) -------------------
    const logId = 'world:log';
    bridge.tree.add(root, { id: logId, role: ROLES.LOG, name: 'Events', value: '' });
    if (Array.isArray(snap.events)) {
        for (const line of snap.events.slice(-20)) {
            const text = _eventText(line);
            if (text) bridge.ring.announce(text, { source: 'world' });
        }
    }

    return bridge;
}

/**
 * Feed new events (or plain log lines) into an existing bridge's ring. Accepts
 * the door's event records (`{event, data}`), plain strings, or `{text}`.
 * Returns the number of lines announced.
 */
export function pushLog(bridge, lines) {
    if (!Array.isArray(lines)) return 0;
    let n = 0;
    for (const line of lines) {
        const text = _eventText(line);
        if (text) { bridge.ring.announce(text, { source: 'world' }); n += 1; }
    }
    return n;
}

/** A door event record -> a human-readable line. */
function _eventText(line) {
    if (line == null) return '';
    if (typeof line === 'string') return line;
    if (typeof line.text === 'string') return line.text;
    if (typeof line.event === 'string') {
        const d = line.data && typeof line.data === 'object' ? line.data : {};
        const bits = Object.keys(d).map((k) => k + '=' + _short(d[k])).join(' ');
        return line.event + (bits ? ' (' + bits + ')' : '');
    }
    return '';
}

function _short(v) {
    if (v == null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

export { ROLES, ACTIONS };
