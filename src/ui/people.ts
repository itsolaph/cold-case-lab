import { caseFile } from '../case';
import type { CharacterId, Mood } from '../case/types';
import type { Ephemeral } from '../game/controller';
import type { GameState } from '../game/state';
import type { Ctx } from './context';
import { h, photo } from './dom';

export const MOOD_LABEL: Record<Mood, string> = { calm: 'Calm', evasive: 'Evasive', rattled: 'Rattled', cracked: 'Cracked' };

/** Badge photo per person (public/img). */
export const PHOTO: Record<CharacterId, string> = { mara: 'mara', felix: 'felix', sol: 'sol', ruth: 'ruth' };

/** Access-card numbers as printed in the door-controller export (Exhibit E-2). Contractors have none. */
const CARD_NO: Partial<Record<CharacterId, string>> = { mara: '0207', felix: '0193', ruth: '0301' };

export const badgeNumber = (id: CharacterId, custodyNo: string) => (CARD_NO[id] ? `Card ${CARD_NO[id]}` : `Visitor ${custodyNo}`);

export function lastMood(s: GameState, id: CharacterId): Mood | null {
  for (let i = s.messages.length - 1; i >= 0; i--) {
    const m = s.messages[i];
    if (m && m.characterId === id && m.role === 'character' && m.mood) return m.mood;
  }
  return null;
}

/** Left wall: four staff ID badges on lanyards, and the accusation stamp on the desk edge below. */
export class People {
  readonly el: HTMLElement;
  private tags = new Map<CharacterId, { btn: HTMLButtonElement; mood: HTMLElement }>();

  constructor(private ctx: Ctx) {
    const list = h('ul', { class: 'badges', role: 'list' });
    for (const c of caseFile.characters) {
      const mood = h('span', { class: 'badge__tape', 'data-mood': 'none' }, 'Not interviewed yet');
      const btn = h(
        'button',
        {
          class: 'tag badge',
          type: 'button',
          'data-id': c.id,
          onclick: () => {
            ctx.game.setActive(c.id);
            ctx.setUi({ view: 'room', tab: 'room' });
          },
        },
        h('span', { class: 'badge__clip', 'aria-hidden': 'true' }),
        photo(PHOTO[c.id], '', 480, 480, { cls: 'badge__photo' }),
        h('span', { class: 'badge__name' }, c.name),
        h('span', { class: 'badge__role' }, c.role),
        h('span', { class: 'badge__no' }, badgeNumber(c.id, c.custodyNo)),
        mood,
      );
      this.tags.set(c.id, { btn, mood });
      list.append(h('li', { class: 'hook' }, h('span', { class: 'hook__peg', 'aria-hidden': 'true' }), h('span', { class: 'hook__strap', 'aria-hidden': 'true' }), btn));
    }
    this.el = h(
      'nav',
      { class: 'rail', 'aria-label': 'People' },
      h('h2', { class: 'sr-only' }, 'People in the building last night'),
      list,
      h(
        'div',
        { class: 'ledge' },
        h('p', { class: 'ledge__hint' }, 'To charge someone you need two pinned facts: one for means, one for opportunity.'),
        h('button', { class: 'btn btn--tamper', type: 'button', onclick: () => ctx.openAccuse() }, h('span', { class: 'stamp-tool', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'btn__text' }, 'Make the accusation')),
      ),
    );
  }

  update(s: GameState, e: Ephemeral) {
    for (const c of caseFile.characters) {
      const t = this.tags.get(c.id);
      if (!t) continue;
      const active = s.active === c.id;
      t.btn.classList.toggle('is-active', active);
      if (active) t.btn.setAttribute('aria-current', 'true');
      else t.btn.removeAttribute('aria-current');
      t.btn.parentElement?.classList.toggle('is-active', active);
      t.btn.classList.toggle('is-busy', !!e.busy[c.id]);
      const mood = lastMood(s, c.id);
      t.mood.dataset.mood = mood ?? 'none';
      t.mood.textContent = e.busy[c.id] ? 'Answering' : mood ? MOOD_LABEL[mood].toLowerCase() : 'Not interviewed yet';
    }
  }
}
