import { caseFile, getCharacter, getExhibit, getFact, type IndexedFact } from '../case';
import type { GameState } from '../game/state';
import type { Ctx } from './context';
import { h } from './dom';

export function sourceStamp(f: IndexedFact): HTMLElement {
  if (f.source.kind === 'lab') {
    return h('span', { class: 'stamp stamp--lab' }, `Lab ${getExhibit(f.source.exhibitId).code}`);
  }
  const who = getCharacter(f.source.characterId).shortName;
  if (f.source.label === 'admission') return h('span', { class: 'stamp stamp--admit' }, `Admitted, ${who}`);
  if (f.source.label === 'claim') return h('span', { class: 'stamp stamp--claim' }, `Claim, ${who}`);
  return h('span', { class: 'stamp stamp--said' }, `Said, ${who}`);
}

/** Right column, top: pinned facts. Keyed by fact id so old pins never re-animate. */
export class Board {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private readonly count: HTMLElement;
  private readonly empty: HTMLElement;
  private nodes = new Map<string, HTMLElement>();
  private primed = false;

  constructor() {
    this.count = h('span', { class: 'board__count' });
    this.list = h('ul', { class: 'pins', role: 'list' });
    this.empty = h(
      'p',
      { class: 'empty' },
      'Nothing pinned yet. Facts land here when someone states them or the lab certifies them.',
    );
    this.el = h(
      'section',
      { class: 'board bag', 'aria-labelledby': 'board-title' },
      h('header', { class: 'panel__head' }, h('h2', { class: 'label', id: 'board-title' }, 'Case board'), this.count),
      this.empty,
      this.list,
    );
  }

  update(s: GameState) {
    this.count.textContent = s.pins.length ? `${s.pins.length} pinned` : '';
    this.empty.hidden = s.pins.length > 0;
    for (const p of s.pins) {
      if (this.nodes.has(p.factId)) continue;
      const f = getFact(p.factId);
      if (!f) continue;
      const node = h('li', { class: `pin pin--${f.source.kind === 'lab' ? 'lab' : f.source.label}`, 'data-fact': f.id }, sourceStamp(f), h('p', { class: 'pin__text' }, f.text));
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

/** Right column, bottom: the exhibits drawer. */
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
              onclick: () => ctx.setUi({ view: 'lab', tab: 'lab', labExhibit: e.id }),
            },
            h('span', { class: 'exhibit__code' }, e.code),
            h('span', { class: 'exhibit__body' }, h('span', { class: 'exhibit__title' }, e.title), h('span', { class: 'exhibit__meta', title: e.provenance }, e.size)),
            mark,
          ),
        ),
      );
    }
    this.el = h(
      'section',
      { class: 'drawer bag', 'aria-labelledby': 'drawer-title' },
      h('header', { class: 'panel__head' }, h('h2', { class: 'label', id: 'drawer-title' }, 'Exhibits'), h('span', { class: 'board__count' }, 'Read one or send it to the lab')),
      list,
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
