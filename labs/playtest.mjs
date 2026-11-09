/**
 * gamestruct — the live play-test harness (a reference BRAIN).
 *
 * Drives a RUNNING world door through the five primitives --
 * observe / act / wait_for / events / see -- using nothing but the library's
 * own client. This is the "is the lane real?" receipt a human runs by hand:
 * it plays a game the way an agent would, and captures frames with the eyes so
 * a person can look at what the agent saw.
 *
 * It is the reference wiring for `see`: the eyes are only useful when a
 * play-test actually uses them, so this harness captures a frame at each step
 * and reports its path. The door owns where a frame lands (its own captures
 * dir); the harness only reports the path the door answered.
 *
 * Usage (a door must already be listening):
 *   node labs/playtest.mjs --url http://127.0.0.1:3799
 *   node labs/playtest.mjs --url http://127.0.0.1:3799 --journey login
 *
 * Zero dependencies (uses global fetch, Node >= 18). The harness never throws
 * on a refusal -- a refusal is data (SPEC N21), so a missing button is a
 * skipped step, not a crash.
 */

import { DoorClient } from '../lib/adapters/vant.mjs';
import { doorNodes } from '../lib/adapters/synmergia.mjs';

function arg(name, fallback) {
    const i = process.argv.indexOf('--' + name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const URL = arg('url', 'http://127.0.0.1:3799');
const JOURNEY = arg('journey', 'full');

const client = new DoorClient({ url: URL, mapNodes: doorNodes });

const say = (...a) => console.log(...a);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Observe + print the scene, the actionable handles, and capture a frame. */
async function look(label) {
    const snap = await client.observe();
    if (!snap.ok) { say('  observe FAILED:', snap.reason); return null; }
    const nodes = doorNodes(snap);
    say(`  scene=${snap.scene} in_world=${snap.in_world} handles=${nodes.length}`);
    const shot = await client.see({ label });
    say(shot.ok ? `  see -> ${shot.path}` : `  see -> (blind: ${shot.reason})`);
    return snap;
}

/** Act on the first handle whose name matches a pattern (never a hardcoded id). */
async function press(pattern, value) {
    const snap = await client.observe();
    const nodes = doorNodes(snap);
    const re = new RegExp(pattern, 'i');
    const node = nodes.find((n) => re.test(n.name) || re.test(n.id));
    if (!node) { say(`  [skip] no handle matching /${pattern}/`); return false; }
    const verb = value !== undefined ? 'set_value' : 'activate';
    const res = await client.act(node.id, verb, value);
    say(`  [${res.ok ? 'ok' : 'refused'}] ${verb} ${node.id}${res.ok ? '' : ' -> ' + res.reason}`);
    await wait(400);
    return res.ok === true;
}

async function main() {
    say(`gamestruct play-test -> ${URL}`);
    let snap = await look('boot');
    if (!snap) { say('door unreachable; is it running?'); process.exit(1); }

    // The scripted journey: each step is best-effort (a missing button is a
    // skip). Screens vary by build, so the harness reports what it found.
    if (JOURNEY === 'full') {
        if (snap.scene === 'MainMenu') { await press('start'); await wait(900); snap = await look('after_start'); }
        // Register a throwaway account so the run is repeatable.
        if (snap && snap.scene === 'Login') {
            await press('create.*account');
            await wait(700);
            const stamp = Date.now().toString().slice(-6);
            await press('username', 'cairn' + stamp);
            await press('password', 'SeeTheWorld!42');
            await press('email', 'cairn' + stamp + '@creadev.org');
            await press('create account and enter');
            await wait(2600);
            snap = await look('after_register');
        }
        if (snap && snap.scene === 'Lobby') { await press('create new'); await wait(1400); snap = await look('character_select'); }
        if (snap && snap.scene === 'CharacterSelect') {
            // Pick species -> class -> Enter World (the handle names the door
            // gives, read live -- never a hardcoded id).
            await press('choose human');
            await wait(900);
            await press('play cleric');
            await wait(900);
            await press('enter world');
            await wait(3200);
            snap = await look('world');
        }
    } else if (JOURNEY === 'login') {
        await press('login');
        await wait(1500);
        snap = await look('after_login');
    }

    // The event ring: what the world told us while we played.
    const ring = await client.events(0);
    say(`events since 0: ${Array.isArray(ring.events) ? ring.events.length : 0}`);
    say('done.');
}

main().catch((e) => { say('harness error:', e && e.message ? e.message : String(e)); process.exit(1); });
