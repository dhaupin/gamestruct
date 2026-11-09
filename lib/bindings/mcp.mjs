/**
 * gamestruct — the MCP binding.
 *
 * Maps the four primitives onto JSON-RPC 2.0 (the MCP wire) so a brain's MCP
 * client auto-wires the surface with no bespoke code. The three MCP methods
 * an agent needs:
 *
 *   initialize   -> server info + capabilities
 *   tools/list   -> the tool catalog (one tool per actionable node)
 *   tools/call   -> dispatch onto act()
 *
 * Plus the raw primitives as direct methods (`observe`, `events`) for clients
 * that prefer them to the tool dance.
 *
 * `handle(message)` takes a parsed JSON-RPC request object and returns a
 * parsed JSON-RPC response object. Transport (stdio, SSE, HTTP) is the host's.
 *
 * Zero dependencies.
 */

import { toolCatalog, toolCall } from '../profiles/agent.mjs';
import { VERSION } from '../version.mjs';

export const PROTOCOL_VERSION = '2024-11-05';

/**
 * Build a JSON-RPC handler over a Bridge.
 * @param {Bridge} bridge
 * @param {object} [opts]
 * @param {string} [opts.name]     server name (defaults to bridge.name)
 * @param {string} [opts.version]  server version
 */
export function createHandler(bridge, opts = {}) {
    const serverName = opts.name || ('gamestruct:' + bridge.name);
    const serverVersion = opts.version || VERSION;

    return function handle(message) {
        const id = message && message.id !== undefined ? message.id : null;
        const method = message && message.method;
        const params = (message && message.params) || {};

        try {
            switch (method) {
                case 'initialize':
                    return ok(id, {
                        protocolVersion: PROTOCOL_VERSION,
                        capabilities: { tools: { listChanged: false } },
                        serverInfo: { name: serverName, version: serverVersion },
                    });
                case 'tools/list':
                    return ok(id, { tools: toolCatalog(bridge) });
                case 'tools/call': {
                    const res = toolCall(bridge, params.name, params.arguments || {});
                    if (!res.ok) {
                        return ok(id, {
                            content: [{ type: 'text', text: 'refused: ' + res.reason }],
                            isError: true,
                        });
                    }
                    return ok(id, {
                        content: [{ type: 'text', text: JSON.stringify(res.detail === null ? { ok: true, id: res.id, verb: res.verb } : res.detail) }],
                        isError: false,
                    });
                }
                case 'observe':
                    return ok(id, bridge.observe());
                case 'events':
                    return ok(id, bridge.events(params.since === undefined ? -1 : params.since));
                default:
                    return err(id, -32601, 'Method not found: ' + method);
            }
        } catch (e) {
            return err(id, -32603, 'Internal error: ' + (e && e.message ? e.message : String(e)));
        }
    };
}

function ok(id, result) {
    return { jsonrpc: '2.0', id, result };
}

function err(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
}
