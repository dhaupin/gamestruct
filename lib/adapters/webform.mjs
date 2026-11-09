/**
 * gamestruct adapter — a web form (the door that is not a game).
 *
 * This is the generality receipt. gamestruct was born in games, but its
 * contract is not a game contract: it is the contract between ANY surface and
 * BOTH audiences. This adapter proves it by taking the most ordinary surface
 * there is -- a plain HTML form -- and building the SAME tree the game adapter
 * builds. No game loop, no player, no HP: just labeled fields, a submit, and
 * a status region.
 *
 * A host writes ONE function that maps its own state to a Tree; the two lanes
 * (screen reader + MCP client) fall out. That is the whole adoption story, and
 * it reads the same whether the host is a Godot MMO or a contact page.
 *
 * Edits are local (a field change mutates the node and records a ring event
 * both lanes can read); the door call fires ONCE, at submit.
 *
 * @example
 *   const bridge = buildBridge({
 *     surface: 'contact',
 *     fields: [
 *       { id: 'name',  label: 'Your name',  type: 'text',  required: true },
 *       { id: 'email', label: 'Email',      type: 'email', required: true },
 *       { id: 'topic', label: 'Topic',      type: 'select', options: ['Sales', 'Support'] },
 *       { id: 'body',  label: 'Message',    type: 'textarea' },
 *     ],
 *     submit: { label: 'Send' },
 *   }, { send: (verb, args) => fetch('/contact', { ... }) })
 *
 * Zero dependencies.
 */

import { Bridge } from '../bridge.mjs';
import { ROLES, ACTIONS } from '../roles.mjs';

/** HTML input type -> gamestruct role. The mapping is the whole adapter. */
const FIELD_ROLES = Object.freeze({
    text: ROLES.TEXTBOX,
    email: ROLES.TEXTBOX,
    tel: ROLES.TEXTBOX,
    url: ROLES.TEXTBOX,
    password: ROLES.TEXTBOX,
    search: ROLES.TEXTBOX,
    number: ROLES.TEXTBOX,
    textarea: ROLES.TEXTBOX,
    select: ROLES.COMBOBOX,
    checkbox: ROLES.CHECKBOX,
    radio: ROLES.RADIO,
    range: ROLES.SLIDER,
    submit: ROLES.BUTTON,
    button: ROLES.BUTTON,
});

/**
 * @param {object} spec  a form description:
 *   {
 *     surface, action?, method?,
 *     fields: [{ id, label?, type?, value?, required?, options?, help?,
 *                min?, max?, step?, disabled? }],
 *     submit?: { label?, disabled? },
 *     errors?: { [fieldId]: message },   // server-side errors, rendered live
 *   }
 * @param {object} [opts]
 * @param {(verb:string, args:object)=>Promise<any>} [opts.send]  the door call
 * @param {string} [opts.surface]
 */
export function buildBridge(spec, opts = {}) {
    const form = spec || {};
    const send = typeof opts.send === 'function' ? opts.send : async () => ({ ok: true, dry: true });
    const bridge = new Bridge({
        name: opts.surface || form.surface || 'form',
        meta: {
            source: 'webform',
            action: form.action || '',
            method: String(form.method || 'POST').toUpperCase(),
        },
    });

    const root = bridge.tree.root;
    const values = {};
    const errors = form.errors && typeof form.errors === 'object' ? form.errors : {};
    const fields = Array.isArray(form.fields) ? form.fields : [];

    // --- the fields --------------------------------------------------------
    for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i];
        const key = f.id || f.name || ('field' + i);
        const label = f.label || f.name || String(key);
        const type = f.type || 'text';
        const role = FIELD_ROLES[type] || ROLES.TEXTBOX;
        if (f.value !== undefined) values[key] = f.value;

        if (type === 'radio') {
            // A radio group is a GROUP of RADIO options (ARIA shape).
            const groupId = 'form:field:' + key;
            bridge.tree.add(root, {
                id: groupId,
                role: ROLES.GROUP,
                name: label,
                description: _describe(f, errors[key]),
            });
            const options = Array.isArray(f.options) ? f.options : [];
            for (const opt of options) {
                const val = _optionValue(opt);
                const optId = groupId + ':' + _slug(val);
                bridge.tree.add(groupId, {
                    id: optId,
                    role: ROLES.RADIO,
                    name: _optionLabel(opt),
                    checked: values[key] === val,
                    actions: [ACTIONS.ACTIVATE],
                });
                bridge.on(optId, {
                    activate: () => {
                        values[key] = val;
                        _recheck(bridge, groupId, optId);
                        bridge.ring.change(optId, 'checked', true, { name: _optionLabel(opt) });
                        return val;
                    },
                });
            }
            continue;
        }

        const id = 'form:field:' + key;
        bridge.tree.add(root, {
            id,
            role,
            name: label,
            value: values[key] !== undefined ? values[key] : null,
            description: _describe(f, errors[key]),
            disabled: !!f.disabled,
            checked: type === 'checkbox' ? !!f.value : null,
            min: f.min !== undefined ? f.min : null,
            max: f.max !== undefined ? f.max : null,
        });
        bridge.on(id, _fieldHandlers(type, key, values, bridge));
    }

    // --- the submit control ------------------------------------------------
    const submit = form.submit || {};
    if (submit !== null) {
        const submitId = 'form:submit';
        bridge.tree.add(root, {
            id: submitId,
            role: ROLES.BUTTON,
            name: submit.label || 'Submit',
            disabled: submit.disabled === true,
            actions: [ACTIONS.ACTIVATE],
        });
        bridge.on(submitId, {
            activate: () => {
                const check = validate(form, values);
                if (!check.ok) {
                    _announce(bridge, 'Please fix: ' + check.errors.map((e) => e.label).join(', '));
                    return { ok: false, reason: 'invalid', errors: check.errors };
                }
                _announce(bridge, 'Submitted.');
                return send('submit', { action: form.action || '', values: Object.assign({}, values) });
            },
        });
    }

    // --- the status live region --------------------------------------------
    const statusId = 'form:status';
    bridge.tree.add(root, { id: statusId, role: ROLES.STATUS, name: form.statusLabel || 'Status', value: '' });

    // Seed any server-side errors as live announcements.
    for (const key of Object.keys(errors)) {
        if (errors[key]) _announce(bridge, key + ': ' + errors[key]);
    }

    return bridge;
}

/** The current field values (what a submit would send). */
export function readValues(bridge) {
    const out = {};
    bridge.tree.walk((n) => {
        if (!n.id.startsWith('form:field:') || n.role === ROLES.GROUP) return;
        const key = n.id.slice('form:field:'.length).split(':')[0];
        if (n.role === ROLES.RADIO) {
            if (n.checked) out[key] = n.name;
            return;
        }
        out[key] = n.checked !== null && n.role === ROLES.CHECKBOX ? n.checked : n.value;
    });
    return out;
}

/**
 * Validate a form spec against values. Returns `{ ok, errors: [{field,label,problem}] }`.
 * A required empty field and a malformed email are the two honest failures.
 */
export function validate(spec, values) {
    const form = spec || {};
    const vals = values || {};
    const problems = [];
    const fields = Array.isArray(form.fields) ? form.fields : [];
    for (let i = 0; i < fields.length; i += 1) {
        const f = fields[i];
        const key = f.id || f.name || ('field' + i);
        const label = f.label || f.name || String(key);
        const v = vals[key];
        const empty = v === undefined || v === null || v === '' ||
            (Array.isArray(v) && v.length === 0);
        if (f.required && empty) {
            problems.push({ field: key, label, problem: 'required' });
            continue;
        }
        if ((f.type === 'email') && !empty && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v))) {
            problems.push({ field: key, label, problem: 'not an email' });
        }
    }
    return { ok: problems.length === 0, errors: problems };
}

// Field edits are LOCAL: they mutate the node and record a ring event (both
// lanes see the change via `events`), but the door call fires once, at submit.
// A host that wants live validation reads `readValues` or listens to the ring.
function _fieldHandlers(type, key, values, bridge) {
    if (type === 'checkbox') {
        return {
            activate: () => {
                values[key] = !values[key];
                const node = bridge.tree.get('form:field:' + key);
                if (node) node.checked = values[key];
                bridge.ring.change('form:field:' + key, 'checked', values[key], { name: key });
                return values[key];
            },
        };
    }
    // textbox family, combobox, slider all take set_value.
    return {
        set_value: (v) => {
            values[key] = v;
            const node = bridge.tree.get('form:field:' + key);
            if (node) node.value = v;
            bridge.ring.change('form:field:' + key, 'value', v, { name: key });
            return v;
        },
    };
}

function _recheck(bridge, groupId, chosenId) {
    const group = bridge.tree.get(groupId);
    if (!group) return;
    for (const childId of group.children) {
        const child = bridge.tree.get(childId);
        if (child) child.checked = childId === chosenId;
    }
}

function _announce(bridge, text) {
    bridge.ring.announce(text, { source: 'form' });
    const status = bridge.tree.get('form:status');
    if (status) status.value = text;
}

function _describe(f, error) {
    if (error) return String(error);
    return f.help ? String(f.help) : '';
}

function _optionValue(opt) {
    return opt && typeof opt === 'object' ? (opt.value != null ? opt.value : opt.label) : opt;
}

function _optionLabel(opt) {
    return opt && typeof opt === 'object' ? String(opt.label != null ? opt.label : opt.value) : String(opt);
}

function _slug(v) {
    return String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'option';
}

export { ROLES, ACTIONS };
