/**
 * gamestruct adapter — a live DOM subtree.
 *
 * The second surface that is not a game, and the one every web app already
 * has: an HTML element. `fromElement(el)` walks a real DOM subtree and builds
 * the SAME gamestruct tree the game and form adapters build, reading the
 * attributes an accessible page already carries (`role`, `aria-*`, `alt`,
 * `title`) and falling back to the tag name and text when they are absent.
 *
 * The receipt is sharper here than for the form: a page that is already
 * accessible to a screen reader is, with no extra markup, ALREADY a door an
 * agent can drive. The two lanes are not two features; they are one tree read
 * two ways.
 *
 * The walk duck-types the element interface (`tagName`, `children`,
 * `getAttribute`, `textContent`), so it runs against a real DOM in a browser
 * and against a plain fixture in Node — no jsdom, no dependency.
 *
 * Zero dependencies.
 */

import { Bridge } from '../bridge.mjs';
import { ROLES, ACTIONS, isInteractiveRole, defaultAction } from '../roles.mjs';

/** tag name -> role, for elements that carry no explicit `role`. */
const TAG_ROLES = Object.freeze({
    button: ROLES.BUTTON,
    a: ROLES.LINK,
    select: ROLES.COMBOBOX,
    textarea: ROLES.TEXTBOX,
    option: ROLES.OPTION,
    h1: ROLES.HEADING,
    h2: ROLES.HEADING,
    h3: ROLES.HEADING,
    h4: ROLES.HEADING,
    h5: ROLES.HEADING,
    h6: ROLES.HEADING,
    ul: ROLES.LIST,
    ol: ROLES.LIST,
    li: ROLES.LISTITEM,
    img: ROLES.IMAGE,
    nav: ROLES.NAVIGATION,
    main: ROLES.MAIN,
    form: ROLES.FORM,
    dialog: ROLES.DIALOG,
    table: ROLES.TABLE,
    p: ROLES.TEXT,
    span: ROLES.TEXT,
    progress: ROLES.PROGRESSBAR,
});

/** input type -> role. */
const INPUT_ROLES = Object.freeze({
    text: ROLES.TEXTBOX,
    email: ROLES.TEXTBOX,
    tel: ROLES.TEXTBOX,
    url: ROLES.TEXTBOX,
    password: ROLES.TEXTBOX,
    search: ROLES.TEXTBOX,
    number: ROLES.TEXTBOX,
    checkbox: ROLES.CHECKBOX,
    radio: ROLES.RADIO,
    range: ROLES.SLIDER,
    submit: ROLES.BUTTON,
    button: ROLES.BUTTON,
    reset: ROLES.BUTTON,
});

/**
 * Build a Bridge from a DOM subtree.
 * @param {object} rootEl  a DOM element (or a duck-typed fixture)
 * @param {object} [opts]
 * @param {(handle:string, verb:string, value?:any)=>any} [opts.act]  the door call
 * @param {string} [opts.surface]
 */
export function fromElement(rootEl, opts = {}) {
    const act = typeof opts.act === 'function' ? opts.act : null;
    const bridge = new Bridge({
        name: opts.surface || _name(rootEl) || _tag(rootEl) || 'dom',
        meta: { source: 'dom' },
    });

    const seen = new Set();
    _walk(rootEl, rootEl, bridge.tree.root, bridge, act, seen, []);
    return bridge;
}

/**
 * The gamestruct role for a DOM element: explicit `role` wins, then the tag
 * (and input type). Returns `null` for elements that carry no semantics.
 */
export function roleFor(el) {
    const explicit = _attr(el, 'role');
    if (explicit) return String(explicit);
    const tag = _tag(el);
    if (tag === 'input') {
        const type = String(_attr(el, 'type') || 'text').toLowerCase();
        return INPUT_ROLES[type] || ROLES.TEXTBOX;
    }
    if (tag === 'a') return _attr(el, 'href') != null ? ROLES.LINK : ROLES.TEXT;
    return TAG_ROLES[tag] || null;
}

/**
 * The accessible name for a DOM element, in the order assistive tech uses:
 * aria-label, aria-labelledby (resolved by id), alt (images), title, the
 * label's text, placeholder, then the element's own trimmed text.
 */
export function nameFor(el, rootEl) {
    const label = _attr(el, 'aria-label');
    if (label) return String(label).trim();

    const labelledby = _attr(el, 'aria-labelledby');
    if (labelledby && rootEl) {
        const names = String(labelledby).split(/\s+/)
            .map((id) => _byId(rootEl, id))
            .filter(Boolean)
            .map((node) => _text(node).trim())
            .filter(Boolean);
        if (names.length) return names.join(' ');
    }

    const alt = _attr(el, 'alt');
    if (alt) return String(alt).trim();

    const title = _attr(el, 'title');
    if (title) return String(title).trim();

    const placeholder = _attr(el, 'placeholder');
    if (placeholder && _isField(_tag(el))) return String(placeholder).trim();

    return _text(el).trim();
}

/** A stable handle: `dom:<id>` when the element has an id, else a tag path. */
export function handleFor(el, indexPath) {
    const id = _attr(el, 'id');
    if (id) return 'dom:' + String(id).replace(/\s+/g, '-');
    const tag = _tag(el) || 'node';
    const idx = indexPath.length ? indexPath.join('.') : '0';
    return 'dom:' + tag + '[' + idx + ']';
}

// -- internals --------------------------------------------------------------

function _walk(el, rootEl, parentId, bridge, act, seen, indexPath) {
    if (!el || _hidden(el)) return;
    const tag = _tag(el);

    // A label with a `for` is a name source, not a node of its own.
    const role = roleFor(el);
    let myParent = parentId;

    if (role) {
        const handle = handleFor(el, indexPath);
        if (seen.has(handle)) {
            myParent = parentId; // duplicate id: keep the first, do not double-add
        } else {
            seen.add(handle);
            const node = _node(el, rootEl, role, handle);
            bridge.tree.add(parentId, node);
            if (act && isInteractiveRole(role)) _wire(bridge, act, handle, role, el);
            myParent = handle;
        }
    }

    const children = _children(el);
    for (let i = 0; i < children.length; i += 1) {
        _walk(children[i], rootEl, myParent, bridge, act, seen, indexPath.concat(i));
    }
}

function _node(el, rootEl, role, handle) {
    const node = {
        id: handle,
        role,
        name: nameFor(el, rootEl) || _labelText(el, rootEl),
        actions: [],
    };
    const desc = _attr(el, 'aria-description') || _attr(el, 'title');
    if (desc && String(desc).trim() !== node.name) node.description = String(desc).trim();

    if (_attr(el, 'aria-disabled') === 'true' || _prop(el, 'disabled') === true) node.disabled = true;

    if (role === ROLES.CHECKBOX || role === ROLES.RADIO || role === ROLES.SWITCH) {
        node.checked = _attr(el, 'aria-checked') === 'true' || _prop(el, 'checked') === true;
    } else {
        const value = _valueOf(el, role);
        if (value !== null) node.value = value;
    }

    const min = _attr(el, 'aria-valuemin');
    const max = _attr(el, 'aria-valuemax');
    if (min != null) node.min = Number(min);
    if (max != null) node.max = Number(max);
    const level = _attr(el, 'aria-level');
    if (level != null) node.level = Number(level);
    const expanded = _attr(el, 'aria-expanded');
    if (expanded != null) node.expanded = expanded === 'true';

    if (isInteractiveRole(role)) node.actions = [defaultAction(role)];
    if (role === ROLES.LINK && _attr(el, 'href') != null) node.actions = [ACTIONS.ACTIVATE];
    return node;
}

function _wire(bridge, act, handle, role, el) {
    const handlers = {};
    const verb = defaultAction(role);
    if (verb === ACTIONS.SET_VALUE) {
        handlers.set_value = (v) => act(handle, 'set_value', v);
    } else {
        handlers.activate = () => act(handle, 'activate');
    }
    handlers.focus = () => act(handle, 'focus');
    handlers.select = () => act(handle, 'select');
    bridge.on(handle, handlers);
}

function _valueOf(el, role) {
    const aria = _attr(el, 'aria-valuenow');
    if (aria != null) return Number(aria);
    const val = _prop(el, 'value');
    if (val != null && val !== '') return val;
    if (role === ROLES.PROGRESSBAR) {
        const now = _attr(el, 'value');
        if (now != null) return Number(now);
    }
    return null;
}

function _name(el) {
    const aria = _attr(el, 'aria-label');
    if (aria) return String(aria).trim();
    const tag = _tag(el);
    return tag ? tag : '';
}

function _byId(rootEl, id) {
    if (rootEl.querySelector) {
        try { return rootEl.querySelector('#' + id); } catch { return null; }
    }
    // Fixture path: a flat scan by id attribute.
    const stack = [rootEl];
    while (stack.length) {
        const node = stack.shift();
        if (_attr(node, 'id') === id) return node;
        for (const c of _children(node)) stack.push(c);
    }
    return null;
}

function _hidden(el) {
    if (_attr(el, 'aria-hidden') === 'true') return true;
    if (_prop(el, 'hidden') === true) return true;
    const style = _prop(el, 'style');
    if (style && typeof style.display === 'string' && style.display === 'none') return true;
    return false;
}

function _isField(tag) {
    return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/** A `label for=<id>` elsewhere in the subtree names its field. */
function _labelText(el, rootEl) {
    const id = _attr(el, 'id');
    if (!id || !_isField(_tag(el))) return '';
    const stack = [rootEl];
    while (stack.length) {
        const node = stack.shift();
        if (_tag(node) === 'label' && _attr(node, 'for') === id) {
            const text = _text(node).trim();
            if (text) return text;
        }
        for (const c of _children(node)) stack.push(c);
    }
    return '';
}

function _tag(el) {
    return el && el.tagName ? String(el.tagName).toLowerCase() : '';
}

function _attr(el, name) {
    if (!el) return null;
    if (typeof el.getAttribute === 'function') return el.getAttribute(name);
    if (el.attributes && typeof el.attributes === 'object') return el.attributes[name] != null ? el.attributes[name] : null;
    return null;
}

function _prop(el, name) {
    return el ? el[name] : undefined;
}

function _children(el) {
    if (!el) return [];
    const kids = el.children;
    if (!kids) return [];
    return typeof kids.length === 'number' ? Array.from(kids) : [];
}

function _text(el) {
    if (!el) return '';
    if (el.textContent != null) return String(el.textContent);
    // Fixture path: concatenate direct text nodes.
    const kids = _children(el);
    return kids.map((c) => (c.nodeType === 3 ? String(c.data || '') : '')).join('');
}

export { ROLES, ACTIONS };
