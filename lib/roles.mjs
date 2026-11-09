/**
 * gamestruct — the shared role + action vocabulary.
 *
 * THE ONE IDEA: a user interface that is accessible to a HUMAN (screen
 * reader, switch control, voice) and a user interface that is accessible to
 * an AGENT are the same interface. Both need a semantic tree of named,
 * role-tagged nodes with stable handles and a small set of verbs. Build the
 * tree once; render it twice.
 *
 * This module is the shared vocabulary both lanes read. It is ARIA-aligned on
 * purpose: the roles are the roles a screen reader already understands, so a
 * human lane can hand the tree to the platform accessibility API unchanged,
 * and an agent lane can hand the same tree to an MCP client unchanged.
 *
 * Zero dependencies. Plain ESM.
 */

/** The role vocabulary. ARIA-aligned; a host may extend with namespaced roles. */
export const ROLES = Object.freeze({
    // structure
    GROUP: 'group',
    REGION: 'region',
    LIST: 'list',
    LISTITEM: 'listitem',
    MENU: 'menu',
    MENUITEM: 'menuitem',
    DIALOG: 'dialog',
    TABLIST: 'tablist',
    TAB: 'tab',
    TABPANEL: 'tabpanel',
    SEPARATOR: 'separator',
    HEADING: 'heading',
    TEXT: 'text',
    IMAGE: 'image',
    // interactive
    BUTTON: 'button',
    LINK: 'link',
    TEXTBOX: 'textbox',
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    SLIDER: 'slider',
    SWITCH: 'switch',
    COMBOBOX: 'combobox',
    PROGRESSBAR: 'progressbar',
    // live
    STATUS: 'status',
    LOG: 'log',
    ALERT: 'alert',
});

/** The action (verb) vocabulary. A node's `actions` names the verbs it accepts. */
export const ACTIONS = Object.freeze({
    ACTIVATE: 'activate',   // press a button / follow a link / toggle
    FOCUS: 'focus',         // move focus here (the AT "move to" verb)
    SET_VALUE: 'set_value', // type / slide / select
    SELECT: 'select',       // choose this item in a list/menu/tablist
    EXPAND: 'expand',       // open a disclosure
    COLLAPSE: 'collapse',
    SCROLL: 'scroll',       // reveal this node in its container
});

/** Roles whose nodes carry actions (i.e. are reachable/operable). */
export const INTERACTIVE_ROLES = Object.freeze(new Set([
    ROLES.BUTTON, ROLES.LINK, ROLES.TEXTBOX, ROLES.CHECKBOX, ROLES.RADIO,
    ROLES.SLIDER, ROLES.SWITCH, ROLES.COMBOBOX, ROLES.MENUITEM, ROLES.TAB,
    ROLES.LISTITEM,
]));

/** Roles that announce themselves when their content changes (ARIA live). */
export const LIVE_ROLES = Object.freeze(new Set([
    ROLES.STATUS, ROLES.LOG, ROLES.ALERT,
]));

/** The default action a role accepts when a caller names none. */
export const DEFAULT_ACTION = Object.freeze({
    [ROLES.BUTTON]: ACTIONS.ACTIVATE,
    [ROLES.LINK]: ACTIONS.ACTIVATE,
    [ROLES.CHECKBOX]: ACTIONS.ACTIVATE,
    [ROLES.RADIO]: ACTIONS.ACTIVATE,
    [ROLES.SWITCH]: ACTIONS.ACTIVATE,
    [ROLES.MENUITEM]: ACTIONS.ACTIVATE,
    [ROLES.TAB]: ACTIONS.SELECT,
    [ROLES.LISTITEM]: ACTIONS.SELECT,
    [ROLES.TEXTBOX]: ACTIONS.SET_VALUE,
    [ROLES.COMBOBOX]: ACTIONS.SET_VALUE,
    [ROLES.SLIDER]: ACTIONS.SET_VALUE,
});

/** ARIA live politeness for a live role. */
export const LIVE_POLITENESS = Object.freeze({
    [ROLES.STATUS]: 'polite',
    [ROLES.LOG]: 'polite',
    [ROLES.ALERT]: 'assertive',
});

export function isInteractiveRole(role) {
    return INTERACTIVE_ROLES.has(role);
}

export function isLiveRole(role) {
    return LIVE_ROLES.has(role);
}

export function defaultAction(role) {
    return DEFAULT_ACTION[role] || ACTIONS.ACTIVATE;
}
