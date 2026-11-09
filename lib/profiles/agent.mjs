/**
 * gamestruct — the AGENT accessibility lane.
 *
 * This lane renders the SAME Bridge tree for a machine: an agent brain, an
 * MCP client, or a scripted test. It answers the two questions an agent
 * always asks -- "what can I do here?" and "how do I do it?" -- from the
 * one tree:
 *
 *   1. toolCatalog(bridge)  -> MCP-shaped tools, one per actionable handle,
 *                              each with an inputSchema (auto-wiring)
 *   2. affordances(bridge)  -> the flat "you can X, Y, Z" list a brain reads
 *                              before choosing an act
 *   3. toolCall(bridge, name, args) -> dispatch an MCP tools/call onto act()
 *
 * The catalog is the bridge between the two lanes: an MCP client that reads
 * it needs to know nothing about the game; a screen reader that reads the
 * tree needs to know nothing about MCP. Same nodes.
 *
 * Zero dependencies.
 */

import { ACTIONS } from '../roles.mjs';

/** MCP tool-name-safe slug for a handle ("ui:start" -> "act__ui__start"). */
export function toolName(handle) {
    return 'act__' + String(handle).replace(/[^A-Za-z0-9_]+/g, '__');
}

/**
 * One MCP tool per actionable node. `inputSchema` names the verb (enum of the
 * node's actions) and the optional value. The description carries the node's
 * accessible name + role, so an MCP client's tool list is readable.
 *
 * When the bridge has eyes (`bridge.canSee`), a synthetic `see` tool is
 * appended: it is not tied to a node, it captures the whole surface. It is the
 * ONE tool that returns a capture descriptor instead of an act result.
 */
export function toolCatalog(bridge, opts = {}) {
    const tools = [];
    // Accept EITHER a live bridge OR a bare node list (a wire `observe().nodes`
    // snapshot). The remote case has no bridge object -- only the serialized
    // tree -- so the same catalog builds from the snapshot a door served.
    const nodes = Array.isArray(bridge) ? bridge : bridge.tree.list();
    for (const node of nodes) {
        if (node.disabled) continue;
        if (!node.actions || !node.actions.length) continue;
        const props = {
            verb: {
                type: 'string',
                enum: node.actions.slice(),
                default: node.actions[0],
                description: 'The action to perform.',
            },
        };
        if (node.actions.includes(ACTIONS.SET_VALUE)) {
            props.value = {
                type: node.value !== null && typeof node.value === 'number' ? 'number' : 'string',
                description: 'The value to set (for set_value).',
            };
        }
        tools.push({
            name: toolName(node.id),
            description: _describeTool(node),
            inputSchema: {
                type: 'object',
                properties: props,
                required: [],
                additionalProperties: false,
            },
            // Non-standard but harmless: the handle this tool drives.
            _handle: node.id,
            _role: node.role,
            _actions: node.actions.slice(),
        });
    }
    const canSee = Array.isArray(bridge) ? opts.canSee === true : !!bridge.canSee;
    if (canSee) {
        tools.push({
            name: SEE_TOOL,
            description: 'Capture a visual frame of the surface (the eyes). Returns a path/url an agent reads with its own vision.',
            inputSchema: {
                type: 'object',
                properties: {
                    label: { type: 'string', description: 'An optional label for the capture filename.' },
                    full: { type: 'boolean', description: 'Capture the whole surface rather than the current view.' },
                },
                required: [],
                additionalProperties: false,
            },
            _handle: SEE_HANDLE,
            _role: 'image',
            _actions: ['see'],
        });
    }
    if (opts.namesOnly) return tools.map((t) => t.name);
    return tools;
}

/** The synthetic handle + tool name for the eyes (the fifth primitive). */
export const SEE_HANDLE = 'surface:eyes';
export const SEE_TOOL = 'see';

/** True when `name` names the eyes tool (either the tool name or its handle). */
export function isSeeTool(name) {
    const s = String(name);
    return s === SEE_TOOL || s === SEE_HANDLE || s === toolName(SEE_HANDLE);
}

/** The flat "you can X, Y, Z" list a brain reads before acting. */
export function affordances(bridge) {
    return bridge.tree.list()
        .filter((n) => !n.disabled && n.actions.length)
        .map((n) => ({
            handle: n.id,
            role: n.role,
            name: n.name,
            actions: n.actions.slice(),
            disabled: n.disabled,
        }));
}

/**
 * Dispatch an MCP `tools/call` onto the bridge. Accepts either the tool name
 * ("act__ui__start") or the raw handle ("ui:start") in `name`. The eyes tool
 * ("see") is special-cased onto `bridge.see()`; every other tool lands on the
 * same `act()` the human lane uses. Returns a Promise (see is async) that
 * resolves to a Result.
 */
export async function toolCall(bridge, name, args = {}) {
    if (isSeeTool(name)) {
        return bridge.see({ label: args.label, full: args.full });
    }
    const handle = String(name).startsWith('act__')
        ? _resolveByName(bridge, name)
        : String(name);
    if (!handle) return { ok: false, reason: 'no such tool: ' + name };
    const verb = args.verb || args.action;
    const value = args.value;
    const res = bridge.act(handle, verb, value);
    return res;
}

function _resolveByName(bridge, tool) {
    for (const n of bridge.tree.list()) {
        if (toolName(n.id) === tool) return n.id;
    }
    return null;
}

function _describeTool(node) {
    const parts = [];
    parts.push('Perform "' + node.actions.join('"/"') + '" on ' + node.role);
    if (node.name) parts.push('"' + node.name + '"');
    if (node.value !== null && node.value !== undefined) parts.push('(current: ' + JSON.stringify(node.value) + ')');
    return parts.join(' ');
}

export { ACTIONS };
