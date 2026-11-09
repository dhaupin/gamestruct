#!/usr/bin/env node
/**
 * gamestruct CLI.
 *
 *   gamestruct check     run the self-checks (the bridgeworks' own gates)
 *   gamestruct doctor    build a demo surface and dump BOTH lanes' output,
 *                        proving the tree renders to a screen reader AND to
 *                        an MCP client from the one description
 *   gamestruct version   print the version
 *
 * `doctor` is the truth battery: it never claims a surface is accessible --
 * it SHOWS the a11y dump and the tool catalog, and runs the a11y audit.
 *
 * Zero dependencies.
 */

import { Bridge, ROLES, ACTIONS, VERSION, human, agent } from '../lib/index.mjs';

const argv = process.argv.slice(2);
const verb = argv[0] || 'help';

switch (verb) {
    case 'check':
        process.exit(await runCheck());
        break;
    case 'doctor':
        process.exit(runDoctor());
        break;
    case 'version':
    case '--version':
    case '-v':
        console.log(VERSION);
        process.exit(0);
        break;
    case 'help':
    case '--help':
    case '-h':
    default:
        printHelp();
        process.exit(verb === 'help' || verb === '--help' || verb === '-h' ? 0 : 1);
}

function printHelp() {
    console.log(`gamestruct ${VERSION} — the game-agent lane bridge

usage:
  gamestruct check      run the bridgeworks self-checks
  gamestruct doctor     build a demo surface, show both lanes + the audit
  gamestruct version    print the version
  gamestruct help       this text
`);
}

async function runCheck() {
    const { runSelfChecks } = await import('../lib/selfcheck.mjs');
    const res = await runSelfChecks();
    for (const row of res.rows) {
        console.log((row.ok ? '  PASS  ' : '  FAIL  ') + row.name + (row.detail ? '  ' + row.detail : ''));
    }
    console.log('');
    console.log(res.ok ? `OK — ${res.rows.length} checks` : `FAILED — ${res.rows.filter((r) => !r.ok).length} of ${res.rows.length}`);
    return res.ok ? 0 : 1;
}

function runDoctor() {
    const bridge = new Bridge({ name: 'demo' });
    bridge.tree.add(null, { id: 'ui:start', role: ROLES.BUTTON, name: 'Start game' });
    bridge.tree.add(null, { id: 'ui:volume', role: ROLES.SLIDER, name: 'Volume', value: 50, min: 0, max: 100 });
    bridge.tree.add(null, { id: 'ui:mute', role: ROLES.CHECKBOX, name: 'Mute', checked: false });
    bridge.tree.add(null, { id: 'ui:status', role: ROLES.STATUS, name: 'Ready' });
    bridge.on('ui:start', { activate: () => 'starting' });
    bridge.on('ui:volume', { set_value: (v) => v });
    bridge.on('ui:mute', { activate: () => true });

    console.log('=== HUMAN LANE (what a screen reader reads) ===');
    console.log(human.a11yDump(bridge));
    console.log('');
    console.log('focus order:', human.render(bridge).focusOrder.join(' -> '));
    console.log('');
    console.log('=== AGENT LANE (what an MCP client auto-wires) ===');
    for (const tool of agent.toolCatalog(bridge)) {
        console.log('  ' + tool.name + '  — ' + tool.description);
    }
    console.log('');
    const audit = human.audit(bridge);
    console.log('a11y audit:', audit.ok ? 'clean' : JSON.stringify(audit.problems));
    console.log('');
    console.log('=== ONE ACT, EITHER LANE ===');
    console.log('act ui:start ->', JSON.stringify(bridge.act('ui:start')));
    console.log('act ui:volume set_value 75 ->', JSON.stringify(bridge.act('ui:volume', ACTIONS.SET_VALUE, 75)));
    console.log('events since -1 ->', JSON.stringify(bridge.events(-1).events.length) + ' events');
    return audit.ok ? 0 : 1;
}
