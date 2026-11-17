import { getCharacter, getFact } from '../case';
import type { CharacterId } from '../case/types';
import type { Ephemeral } from '../game/controller';
import type { GameState, Message } from '../game/state';
import type { Ctx } from './context';
import { h, routeChip } from './dom';
import { MOOD_LABEL } from './people';

const STARTERS: Record<CharacterId, string[]> = {
  mara: ['When did you last see AL-07?', 'Where were you between 01:45 and 02:40?', 'Who can open the vault?'],
  felix: ['What is AL-07 to you?', 'When did you leave last night?', 'Why did you argue with the director?'],
  sol: ['What was your job here last night?', 'Who met you at the bay?', 'When did you leave?'],
  ruth: ['What are your rounds?', 'Did you see anything unusual at 02:00?', 'Where did you find the receipt?'],
};

/** Centre column: the interrogation transcript and the question box. */
export class Room {
  readonly el: HTMLElement;
  private readonly head: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly log: HTMLElement;
  private readonly typing: HTMLElement;
  private readonly starters: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly send: HTMLButtonElement;
  private renderedFor: CharacterId | null = null;
  private nodes = new Map<string, HTMLElement>();

  constructor(private ctx: Ctx) {
    this.head = h('header', { class: 'room__head' });
    this.notice = h('p', { class: 'notice', hidden: true, role: 'status' });
    this.log = h('ol', { class: 'transcript', role: 'log', 'aria-live': 'polite', 'aria-label': 'Interview transcript' });
    this.typing = h('div', { class: 'typing', hidden: true, 'aria-hidden': 'true' });
    this.starters = h('div', { class: 'starters' });
    this.input = h('textarea', {
      class: 'composer__input',
      id: 'question',
      rows: 1,
      maxlength: 300,
      autocomplete: 'off',
      enterkeyhint: 'send',
    }) as HTMLTextAreaElement;
    this.send = h('button', { class: 'btn btn--primary composer__send', type: 'submit' }, 'Ask') as HTMLButtonElement;
    const form = h(
      'form',
      {
        class: 'composer',
        onsubmit: (ev: Event) => {
          ev.preventDefault();
          this.submit();
        },
      },
      h('label', { class: 'sr-only', for: 'question' }, 'Your question'),
      this.input,
      this.send,
    );
    this.input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        this.submit();
      }
    });
    this.input.addEventListener('input', () => {
      const id = this.ctx.game.snapshot.active;
      this.ctx.ui.drafts[`q:${id}`] = this.input.value;
    });
    const scroller = h('div', { class: 'room__scroll' }, this.log, this.typing);
    this.el = h('section', { class: 'room bag', 'aria-labelledby': 'room-name' }, this.head, this.notice, scroller, this.starters, form);
  }

  private submit() {
    const s = this.ctx.game.snapshot;
    const q = this.input.value.trim();
    if (!q || this.ctx.game.ephemeral.busy[s.active] || s.accusation) return;
    this.input.value = '';
    this.ctx.ui.drafts[`q:${s.active}`] = '';
    void this.ctx.game.ask(s.active, q);
  }

  private renderMessage(m: Message): HTMLElement {
    const c = getCharacter(m.characterId);
    if (m.role === 'detective') {
      return h('li', { class: 'msg msg--q', 'data-id': m.id }, h('span', { class: 'msg__who' }, 'You'), h('p', { class: 'msg__q' }, m.text));
    }
    if (m.role === 'notice') {
      return h('li', { class: 'msg msg--notice', 'data-id': m.id }, h('p', {}, m.text));
    }
    const pins = (m.revealed ?? []).map((id) => getFact(id)).filter((f) => f !== undefined);
    return h(
      'li',
      { class: `msg msg--a${m.pressure === 'applied' ? ' msg--cracked' : ''}`, 'data-id': m.id, 'data-mood': m.mood ?? 'calm' },
      h('span', { class: 'msg__who' }, c.shortName),
      h('blockquote', { class: 'msg__a' }, h('p', {}, m.text)),
      h(
        'div',
        { class: 'msg__meta' },
        m.route ? routeChip(m.route, m.ms, this.ctx.demo) : null,
        m.mood ? h('span', { class: 'mood', 'data-mood': m.mood }, MOOD_LABEL[m.mood]) : null,
        m.pressure === 'applied' ? h('span', { class: 'stamp stamp--press' }, 'Pressure landed') : null,
        m.pressure === 'bluff' ? h('span', { class: 'stamp stamp--bluff', title: 'Pin the evidence to the board first' }, 'Bluff: no evidence pinned') : null,
        m.fallback ? h('span', { class: 'stamp stamp--bluff', title: 'The model reply could not be read; a safe line was used' }, 'Garbled line') : null,
      ),
      pins.length
        ? h(
            'ul',
            { class: 'msg__pins', 'aria-label': 'Pinned to the case board' },
            pins.map((f) => h('li', {}, h('span', { class: 'pin-dot', 'aria-hidden': 'true' }), f.text)),
          )
        : null,
    );
  }

  update(s: GameState, e: Ephemeral) {
    const c = getCharacter(s.active);
    const busy = !!e.busy[s.active];
    const route = e.device?.state === 'unavailable' ? 'remote-line' : 'on-device';

    if (this.renderedFor !== s.active) {
      // Character switch: rebuild without entrance animation.
      this.renderedFor = s.active;
      this.nodes.clear();
      this.log.replaceChildren();
      this.head.replaceChildren(
        h('span', { class: 'room__mono', 'aria-hidden': 'true' }, c.initials),
        h(
          'div',
          {},
          h('h2', { class: 'room__name', id: 'room-name' }, c.name),
          h('p', { class: 'room__role' }, `${c.role}. ${c.blurb}`),
          h('p', { class: 'room__hint' }, 'To press someone, name evidence that is pinned on your case board.'),
        ),
      );
      this.input.placeholder = `Ask ${c.shortName} a question`;
      this.input.value = this.ctx.ui.drafts[`q:${c.id}`] ?? '';
      this.log.append(h('li', { class: 'msg msg--a msg--greeting' }, h('span', { class: 'msg__who' }, c.shortName), h('blockquote', { class: 'msg__a' }, h('p', {}, c.greeting))));
      for (const m of s.messages) if (m.characterId === c.id) this.nodes.set(m.id, this.log.appendChild(this.renderMessage(m)));
      this.scrollToEnd(false);
    } else {
      let added = false;
      for (const m of s.messages) {
        if (m.characterId !== c.id || this.nodes.has(m.id)) continue;
        const node = this.renderMessage(m);
        node.classList.add('is-new');
        this.nodes.set(m.id, this.log.appendChild(node));
        added = true;
      }
      if (added) this.scrollToEnd(true);
    }

    // Typing indicator
    this.typing.hidden = !busy;
    if (busy && !this.typing.childElementCount) {
      this.typing.append(
        h('span', { class: 'typing__dots' }, h('i'), h('i'), h('i')),
        h('span', { class: 'typing__text' }, `${c.shortName} is answering`),
        routeChip(route, undefined, this.ctx.demo),
      );
      this.scrollToEnd(true);
    } else if (!busy) this.typing.replaceChildren();

    // Remote-line notice
    const remote = e.device?.state === 'unavailable';
    this.notice.hidden = !remote;
    this.notice.textContent = remote ? 'No on-device model in this browser: suspects are on a remote line (slower).' : '';

    // Starters only before the first question to this person
    const asked = s.messages.some((m) => m.characterId === c.id && m.role === 'detective');
    this.starters.hidden = asked || !!s.accusation;
    if (!asked && this.starters.dataset.for !== c.id) {
      this.starters.dataset.for = c.id;
      this.starters.replaceChildren(
        h('span', { class: 'label label--quiet' }, 'Try'),
        ...STARTERS[c.id].map((q) =>
          h(
            'button',
            {
              class: 'starter',
              type: 'button',
              onclick: () => {
                this.input.value = q;
                this.submit();
              },
            },
            q,
          ),
        ),
      );
    }

    const closed = !!s.accusation;
    this.input.disabled = closed;
    this.send.disabled = busy || closed;
    this.send.textContent = busy ? 'Waiting' : 'Ask';
  }

  focusInput() {
    this.input.focus();
  }

  private scrollToEnd(smooth: boolean) {
    const scroller = this.log.parentElement;
    if (!scroller) return;
    requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'instant' }));
  }
}
