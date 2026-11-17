import { caseFile, getCharacter, getExhibit, getFact, type IndexedFact } from '../case';
import type { GameState } from '../game/state';
import type { Ctx } from './context';
import { h } from './dom';

/** Where a fact came from, as the slip's source line. Admissions get the red stamp. */
export function sourceStamp(f: IndexedFact): HTMLElement {
  if (f.source.kind === 'lab') {
    return h('span', { class: 'stamp stamp--lab' }, `Certified, lab ${getExhibit(f.source.exhibitId).code}`);
  }
  const who = getCharacter(f.source.characterId).shortName;
  if (f.source.label === 'admission') return h('span', { class: 'stamp stamp--admit' }, `Admitted by ${who}`);
  if (f.source.label === 'claim') return h('span', { class: 'stamp stamp--claim' }, `${who} claims`);
  return h('span', { class: 'stamp stamp--said' }, `${who} said`);
}

/** Inside the case folder: pinned facts as typed slips. Keyed by fact id so old slips never re-animate. */
export class Board {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private readonly count: HTMLElement;
  private readonly empty: HTMLElement;
  private nodes = new Map<string, HTMLElement>();
  private primed = false;

  constructor() {
    this.count = h('span', { class: 'folder__count' });
    this.list = h('ul', { class: 'pins', role: 'list' });
    this.empty = h('p', { class: 'folder__empty' }, 'Nothing pinned yet. A fact lands here when someone states it or the lab certifies it.');
    this.el = h(
      'section',
      { class: 'board', 'aria-labelledby': 'board-title' },
      h('header', { class: 'folder__head' }, h('h2', { class: 'folder__title', id: 'board-title' }, 'Case folder'), this.count),
      this.empty,
      this.list,
    );
  }

  update(s: GameState) {
    this.count.textContent = s.pins.length === 1 ? '1 fact pinned' : s.pins.length ? `${s.pins.length} facts pinned` : '';
    this.empty.hidden = s.pins.length > 0;
    for (const p of s.pins) {
      if (this.nodes.has(p.factId)) continue;
      const f = getFact(p.factId);
      if (!f) continue;
      const kind = f.source.kind === 'lab' ? 'lab' : f.source.label;
      const node = h(
        'li',
        { class: `pin pin--${kind}`, 'data-fact': f.id },
        h('span', { class: 'pin__clip', 'aria-hidden': 'true' }),
        h('p', { class: 'pin__text' }, f.text),
        sourceStamp(f),
      );
      if (this.primed) node.classList.add('is-new');
      this.nodes.set(p.factId, node);
      this.list.prepend(node);
    }
    // Reset (new case file): drop pins that are gone.
    const live = new Set(s.pins.map((p) => p.factId));
    for (const [id, node] of this.nodes) {
      if (!live.has(id)) {
        node.remove();
        this.nodes.delete(id);
      }
    }
    this.primed = true;
  }
}

/** The folder's pocket: four evidence tags on strings. Each opens its exhibit sheet. */
export class Drawer {
  readonly el: HTMLElement;
  private readonly marks = new Map<string, HTMLElement>();

  constructor(ctx: Ctx) {
    const list = h('ul', { class: 'exhibits', role: 'list' });
    for (const e of caseFile.exhibits) {
      const mark = h('span', { class: 'exhibit__mark' });
      this.marks.set(e.id, mark);
      list.append(
        h(
          'li',
          {},
          h(
            'button',
            {
              class: 'exhibit',
              type: 'button',
              title: e.provenance,
              onclick: () => ctx.setUi({ view: 'lab', tab: 'lab', labExhibit: e.id }),
            },
            h('span', { class: 'exhibit__hole', 'aria-hidden': 'true' }),
            h('span', { class: 'exhibit__code' }, e.code),
            h('span', { class: 'exhibit__title' }, e.title),
            mark,
          ),
        ),
      );
    }
    this.el = h(
      'section',
      { class: 'drawer', 'aria-labelledby': 'drawer-title' },
      h('h2', { class: 'sr-only', id: 'drawer-title' }, 'Exhibits'),
      h('div', { class: 'pocket' }, list),
    );
  }

  update(s: GameState) {
    for (const [id, mark] of this.marks) {
      const n = s.labCalls.filter((c) => c.exhibitId === id && c.status !== 'failed').length;
      mark.textContent = n ? `${n} lab ${n > 1 ? 'reports' : 'report'}` : '';
      mark.hidden = !n;
    }
  }
}
