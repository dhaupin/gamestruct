/**
 * gamestruct — the bridgeworks.
 *
 * The shared contract between a game world (a "door") and an agent brain (a
 * "client"), built so the SAME surface serves a human with assistive
 * technology and a machine agent. Four primitives, two lanes, one tree.
 *
 *   import { Bridge, ROLES, ACTIONS, human, agent } from 'gamestruct'
 *
 *   const bridge = new Bridge({ name: 'pause menu' })
 *   bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start' })
 *   bridge.on('ui:start', { activate: () => startGame() })
 *
 *   human.a11yDump(bridge)        // what a screen reader reads
 *   agent.toolCatalog(bridge)     // what an MCP client auto-wires
 *   await bridge.act('ui:start')  // either lane can drive it
 *
 * See SPEC.md for the normative contract.
 */

export { ROLES, ACTIONS, INTERACTIVE_ROLES, LIVE_ROLES, LIVE_POLITENESS, isInteractiveRole, isLiveRole, defaultAction } from './roles.mjs';
export { Tree, mintHandle } from './tree.mjs';
export { EventRing } from './events.mjs';
export { Bridge } from './bridge.mjs';

import * as human from './profiles/human.mjs';
import * as agent from './profiles/agent.mjs';
import * as httpBinding from './bindings/http.mjs';
import * as mcpBinding from './bindings/mcp.mjs';

export const profiles = Object.freeze({ human, agent });
export const bindings = Object.freeze({ http: httpBinding, mcp: mcpBinding });
export { human, agent, httpBinding, mcpBinding };

export { VERSION } from './version.mjs';
