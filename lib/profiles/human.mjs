/**
 * gamestruct — the HUMAN accessibility lane.
 *
 * This lane renders the SAME Bridge tree for a human who uses assistive
 * technology: a screen reader, a switch, voice control, or a keyboard alone.
 * It does three things and nothing else:
 *
 *   1. render(tree)      -> a platform-agnostic AT description of each node
 *                           (role, name, value, state, actions, focus order)
 *   2. focus order       -> the linear traversal a switch/keyboard user walks
 *   3. a11yDump()        -> the flat "[A11Y]" text an agent or a test reads
 *                           to prove the surface is describable at all
 *
 * The output is deliberately plain: a screen reader consumes ARIA roles and
 * accessible names; the SAME fields are what an automated a11y audit checks.
 * If a surface renders here, it renders to NVDA/JAWS/VoiceOver/TalkBack.
 *
 * Zero dependencies.
 */

import { ROLES, ACTIONS, isInteractiveRole, isLiveRole, LIVE_POLITENESS } from '../roles.mjs';

/**
 * Describe a single node for assistive technology.
 * Returns a platform-agnostic record a host maps onto its own AT API
 * (ARIA on the web, AccessKit in Godot, NSAccessibility on macOS, ...).
 */
export function describeNode(node) {
    const rec = {
        id: node.id,
        role: node.role,
        name: node.name,
        description: node.description || undefined,
        // ARIA-ish state, only when meaningful.
        disabled: node.disabled || undefined,
        focusable: isInteractiveRole(node.role) && !node.disabled,
        actions: node.actions.slice(),
    };
    if (node.value !== null && node.value !== undefined) rec.value = node.value;
    if (node.checked !== null && node.checked !== undefined) rec.checked = !!node.checked;
    if (node.expanded !== null && node.expanded !== undefined) rec.expanded = !!node.expanded;
    if (node.min !== null && node.min !== undefined) rec.min = node.min;
    if (node.max !== null && node.max !== undefined) rec.max = node.max;
    if (node.level !== null && node.level !== undefined) rec.level = node.level;
    if (isLiveRole(node.role)) {
        rec.live = true;
        rec.politeness = LIVE_POLITENESS[node.role] || 'polite';
    }
    return rec;
}

/**
 * Render a whole tree for AT: the ordered node descriptions plus the linear
 * focus order (the tab/switch walk). `focusId` marks the current position.
 */
export function render(bridge) {
    const nodes = bridge.tree.list().map(describeNode);
    const focusOrder = bridge.tree.list()
        .filter((n) => isInteractiveRole(n.role) && !n.disabled)
        .map((n) => n.id);
    return {
        surface: bridge.name,
        focus: bridge.focusId,
        focusOrder,
        nodes,
    };
}

/**
 * The flat text dump an agent or a test reads. One line per node, in
 * traversal order, prefixed with the node's role. The current focus carries
 * a "*". This is the "is this surface describable at all" proof.
 */
export function a11yDump(bridge, opts = {}) {
    const lines = [];
    const focus = bridge.focusId;
    bridge.tree.walk((node) => {
        const depth = _depth(bridge, node);
        const pad = opts.indent === false ? '' : '  '.repeat(depth);
        const marker = node.id === focus ? '*' : ' ';
        const bits = [node.role];
        if (node.name) bits.push('"' + node.name + '"');
        if (node.value !== null && node.value !== undefined) bits.push('=' + JSON.stringify(node.value));
        if (node.checked !== null && node.checked !== undefined) bits.push(node.checked ? '[x]' : '[ ]');
        if (node.expanded !== null && node.expanded !== undefined) bits.push(node.expanded ? '(open)' : '(closed)');
        if (node.disabled) bits.push('(disabled)');
        if (node.actions.length) bits.push('{' + node.actions.join(',') + '}');
        lines.push('[' + marker + '] ' + pad + bits.join(' '));
    });
    return lines.join('\n');
}

/**
 * A cheap a11y audit: the two failures that break a screen reader most often.
 * Returns `{ ok, problems[] }`. This is a gate, not a grade -- a surface with
 * an unlabeled button or an unreachable interactive node is broken, not
 * merely imperfect.
 */
export function audit(bridge) {
    const problems = [];
    bridge.tree.walk((node) => {
        if (isInteractiveRole(node.role) && !node.name) {
            problems.push({ id: node.id, problem: 'interactive node has no accessible name' });
        }
        if (isInteractiveRole(node.role) && !node.disabled && node.actions.length === 0) {
            problems.push({ id: node.id, problem: 'interactive node declares no action' });
        }
        if (node.role === ROLES.IMAGE && !node.description && !node.name) {
            problems.push({ id: node.id, problem: 'image has no alt text' });
        }
        if (isLiveRole(node.role) && node.name && node.value === null) {
            // A live region with only a name is legal; no problem.
        }
    });
    return { ok: problems.length === 0, problems };
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

export { ROLES, ACTIONS };
