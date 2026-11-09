/**
 * gamestruct — the event ring.
 *
 * Both lanes need "what happened while I was not looking": a screen reader
 * announces a change; an agent polls `events`. One ring, one cursor.
 *
 * The ring is bounded (a fixed capacity); old entries fall off the front.
 * Each entry carries a monotonic `frame` so a consumer resumes exactly where
 * it left off (an honest cursor, never a wall-clock guess).
 *
 * Zero dependencies.
 */

import { ROLES } from './roles.mjs';

export class EventRing {
    constructor(capacity = 256) {
        this.capacity = Math.max(1, capacity | 0);
        this._items = [];
        this._frame = 0;
    }

    /** The current frame cursor (the next event will be frame+1). */
    get frame() {
        return this._frame;
    }

    /**
     * Append an event. `kind` is one of: 'change' | 'announce' | 'focus' |
     * 'state'. `detail` is free-form and must be JSON-serializable.
     */
    push(kind, detail = {}) {
        this._frame += 1;
        const entry = {
            frame: this._frame,
            kind: String(kind),
            at: Date.now(),
            detail: detail && typeof detail === 'object' ? detail : { text: String(detail) },
        };
        this._items.push(entry);
        if (this._items.length > this.capacity) {
            this._items.splice(0, this._items.length - this.capacity);
        }
        return entry;
    }

    /** Announce text (the human lane's live region; the agent lane's event). */
    announce(text, opts = {}) {
        return this.push('announce', {
            text: String(text),
            role: opts.role || ROLES.STATUS,
            politeness: opts.politeness || (opts.role === ROLES.ALERT ? 'assertive' : 'polite'),
            source: opts.source || '',
        });
    }

    /** Record a node change (value/checked/expanded) with its handle. */
    change(id, field, value, opts = {}) {
        return this.push('change', {
            id: String(id),
            field: String(field),
            value,
            role: opts.role || '',
            name: opts.name || '',
        });
    }

    /** Record a focus move (the human lane's traversal; the agent lane's focus). */
    focus(id, opts = {}) {
        return this.push('focus', { id: String(id), name: opts.name || '', role: opts.role || '' });
    }

    /** Everything after `since` (exclusive). `since = -1` returns the whole ring. */
    since(sinceFrame = -1) {
        const from = Number(sinceFrame);
        if (!Number.isFinite(from) || from < 0) return this._items.slice();
        return this._items.filter((e) => e.frame > from);
    }

    /** The whole ring (oldest first). */
    all() {
        return this._items.slice();
    }

    clear() {
        this._items = [];
    }
}
