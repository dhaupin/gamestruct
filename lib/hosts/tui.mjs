/**
 * gamestruct host — the terminal UI.
 *
 * The human lane is not only a screen reader. It is any human who needs the
 * SAME tree rendered for a device without a pointer: a keyboard, a switch, a
 * text console. This host renders a Bridge to a terminal and drives it with
 * keys, using nothing but the tree the agent lane also reads.
 *
 * The point is symmetry: `tui.render(bridge)` walks the same nodes the MCP
 * tool catalog exposes, and `tui.key(bridge, ...)` calls the same `act()` an
 * agent calls. A surface that works here is a surface a blind user can drive
 * over SSH.
 *
 * Pure: `render` returns a string; `key` returns a result object. The
 * `run()` loop is the only thing that touches a real terminal, so tests can
 * drive the whole host headlessly.
 *
 * Zero dependencies.
 */

import { isInteractiveRole, defaultAction } from '../roles.mjs';
import { a11yDump } from '../profiles/human.mjs';

/**
 * Render a Bridge to a text frame for a terminal.
 * @param {Bridge} bridge
 * @param {object} [opts]
 * @param {number} [opts.width]   visible columns (default 72)
 * @param {boolean} [opts.color]  use ANSI color (default false)
 * @returns {string}
 */
export function render(bridge, opts = {}) {
    const width = Number.isFinite(opts.width) ? opts.width : 72;
    const focus = bridge.focusId;
    const lines = [];

    lines.push(rule(width));
    lines.push(pad(' ' + bridge.name, width));
    lines.push(rule(width));

    bridge.tree.walk((node) => {
        const depth = _depth(bridge, node);
        const indent = '  '.repeat(depth);
        const marker = node.id === focus ? '> ' : '  ';
        const interactive = isInteractiveRole(node.role);
        let label = node.role + (node.name ? ' "' + node.name + '"' : '');
        if (node.value !== null && node.value !== undefined) label += ' = ' + JSON.stringify(node.value);
        if (node.checked !== null && node.checked !== undefined) label += node.checked ? ' [x]' : ' [ ]';
        if (node.disabled) label += ' (disabled)';
        if (!interactive) label = '(' + label + ')';
        lines.push(pad(' ' + marker + indent + label, width));
    });

    lines.push(rule(width));
    lines.push(pad(' ' + hint(bridge), width));
    return lines.join('\n');
}

/**
 * Apply one keypress to a Bridge, using the same handles the agent lane uses.
 *
 *   tab / down / j   -> focus next interactive node
 *   shift+tab / up   -> focus previous
 *   enter / space    -> activate the focused node
 *   <typing>         -> set_value on the focused node (textboxes/sliders)
 *
 * @returns {{ok:boolean, action?:string, id?:string, reason?:string}}
 */
export function key(bridge, k) {
    const name = String(k || '');
    const focusables = _focusables(bridge);
    if (focusables.length === 0) return { ok: false, reason: 'no interactive nodes' };

    if (name === 'tab' || name === 'down' || name === 'j') return _move(bridge, focusables, 1);
    if (name === 'shift+tab' || name === 'up' || name === 'k') return _move(bridge, focusables, -1);

    const current = bridge.focusId || focusables[0].id;
    const node = bridge.tree.get(current);
    if (!node) return { ok: false, reason: 'no focus' };

    if (name === 'enter' || name === ' ') {
        // Enter runs the node's DEFAULT action (button -> activate, slider ->
        // set_value), the same verb an agent reads from the tool catalog.
        const verb = defaultAction(node.role);
        const res = bridge.act(current, verb);
        return { ok: !!res.ok, action: verb, id: current, reason: res.reason };
    }

    if (name.length >= 1) {
        const res = bridge.act(current, 'set_value', name);
        return { ok: !!res.ok, action: 'set_value', id: current, reason: res.reason };
    }
    return { ok: false, reason: 'unbound key: ' + name };
}

/** The focus order (the switch/keyboard walk), as handles. */
export function focusOrder(bridge) {
    return _focusables(bridge).map((n) => n.id);
}

/** A one-line status: what is focused and what it can do. */
export function hint(bridge) {
    const focus = bridge.focusId;
    if (!focus) {
        const first = _focusables(bridge)[0];
        return first ? 'tab to start; enter to activate' : 'nothing interactive here';
    }
    const node = bridge.tree.get(focus);
    if (!node) return 'tab to move; enter to activate';
    const verbs = (node.actions && node.actions.length) ? node.actions.join('/') : 'no action';
    return '[' + node.role + '] ' + (node.name || focus) + '  ->  ' + verbs + '  (enter to run, tab to move)';
}

/** A plain-text dump identical to the human lane's a11y dump (one surface). */
export function dump(bridge) {
    return a11yDump(bridge);
}

/**
 * Drive a Bridge from a real terminal (TTY). Blocks until the user quits
 * (`q` / `esc` / Ctrl-C). Returns the exit reason. Not used by tests.
 */
export async function run(bridge, opts = {}) {
    const stdin = opts.stdin || process.stdin;
    const stdout = opts.stdout || process.stdout;
    const width = Number.isFinite(opts.width) ? opts.width : (stdout.columns || 72);
    const paint = () => {
        stdout.write('\u001b[2J\u001b[H');
        stdout.write(render(bridge, { width }) + '\n');
    };

    const first = focusOrder(bridge)[0];
    if (first) bridge.focus(first);
    paint();

    if (!stdin.isTTY) return 'not-a-tty';
    stdin.setRawMode(true);
    stdin.resume();
    return new Promise((resolve) => {
        const onData = (buf) => {
            const seq = buf.toString('utf8');
            if (seq === '\u0003' || seq === 'q' || seq === '\u001b') {
                stdin.setRawMode(false);
                stdin.pause();
                stdin.removeListener('data', onData);
                stdout.write('\n');
                resolve('quit');
                return;
            }
            key(bridge, _decodeKey(seq));
            paint();
        };
        stdin.on('data', onData);
    });
}

// -- internals --------------------------------------------------------------

function _focusables(bridge) {
    return bridge.tree.list().filter((n) => isInteractiveRole(n.role) && !n.disabled);
}

function _move(bridge, focusables, step) {
    const order = focusables.map((n) => n.id);
    const cur = bridge.focusId;
    let idx = order.indexOf(cur);
    if (idx < 0) idx = step > 0 ? -1 : 0;
    const next = order[(idx + step + order.length) % order.length];
    bridge.focus(next);
    return { ok: true, action: 'focus', id: next };
}

function _decodeKey(seq) {
    if (seq === '\r' || seq === '\n') return 'enter';
    if (seq === '\u001b[Z') return 'shift+tab';
    if (seq === '\u001b[A') return 'up';
    if (seq === '\u001b[B') return 'down';
    if (seq === '\t') return 'tab';
    return seq;
}

function _depth(bridge, node) {
    let d = 0;
    let cur = node;
    while (cur && cur.parent) {
        d += 1;
        cur = bridge.tree.get(cur.parent);
    }
    return d;
}

function rule(width) {
    return '+' + '-'.repeat(Math.max(0, width - 2)) + '+';
}

function pad(s, width) {
    const plain = s.length > width - 2 ? s.slice(0, width - 3) + '\u2026' : s;
    return '|' + plain + ' '.repeat(Math.max(0, width - 2 - plain.length)) + '|';
}
