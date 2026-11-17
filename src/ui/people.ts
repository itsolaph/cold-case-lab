import { caseFile } from '../case';
import type { CharacterId, Mood } from '../case/types';
import type { Ephemeral } from '../game/controller';
import type { GameState } from '../game/state';
import type { Ctx } from './context';
import { h } from './dom';

export const MOOD_LABEL: Record<Mood, string> = { calm: 'Calm', evasive: 'Evasive', rattled: 'Rattled', cracked: 'Cracked' };

export function lastMood(s: GameState, id: CharacterId): Mood | null {
  for (let i = s.messages.length - 1; i >= 0; i--) {
    const m = s.messages[i];
    if (m && m.characterId === id && m.role === 'character' && m.mood) return m.mood;
  }
  return null;
}

/** Left rail: the four people as chain-of-custody tags. */
export class People {
  readonly el: HTMLElement;
  private tags = new Map<CharacterId, { btn: HTMLButtonElement; mood: HTMLElement; count: HTMLElement }>();

  constructor(private ctx: Ctx) {
    const list = h('ul', { class: 'tags', role: 'list' });
    for (const c of caseFile.characters) {
      const mood = h('span', { class: 'tag__mood', 'data-mood': 'none' }, 'Not interviewed');
      const count = h('span', { class: 'tag__count' }, '');
      const btn = h(
        'button',
        {
          class: 'tag',
          type: 'button',
          'data-id': c.id,
          onclick: () => {
            ctx.game.setActive(c.id);
            ctx.setUi({ view: 'room', tab: 'room' });
          },
        },
        h('span', { class: 'tag__eyelet', 'aria-hidden': 'true' }),
        h('span', { class: 'tag__mono', 'aria-hidden': 'true' }, c.initials),
        h(
          'span',
          { class: 'tag__body' },
          h('span', { class: 'tag__name' }, c.name),
          h('span', { class: 'tag__role' }, c.role),
          h('span', { class: 'tag__meta' }, mood, count),
        ),
        h('span', { class: 'tag__no', 'aria-hidden': 'true' }, c.custodyNo),
      );
      this.tags.set(c.id, { btn, mood, count });
      list.append(h('li', {}, btn));
    }
    this.el = h(
      'nav',
      { class: 'rail', 'aria-label': 'People' },
      h('h2', { class: 'label rail__title' }, 'In the interview room'),
      list,
      h(
        'div',
        { class: 'rail__foot' },
        h('p', { class: 'rail__hint' }, 'Ready to name someone? You need the culprit and two pinned facts: one for means, one for opportunity.'),
        h('button', { class: 'btn btn--tamper', type: 'button', onclick: () => ctx.openAccuse() }, 'Make the accusation'),
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
      t.btn.classList.toggle('is-busy', !!e.busy[c.id]);
      const mood = lastMood(s, c.id);
      t.mood.dataset.mood = mood ?? 'none';
      t.mood.textContent = e.busy[c.id] ? 'Answering…' : mood ? MOOD_LABEL[mood] : 'Not interviewed';
      const n = s.messages.filter((m) => m.characterId === c.id && m.role === 'detective').length;
      t.count.textContent = n ? `${n} Q` : '';
    }
  }
}
