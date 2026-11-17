import { getCharacter, getFact } from '../case';
import type { CharacterId } from '../case/types';
import type { Ephemeral } from '../game/controller';
import type { GameState, Message } from '../game/state';
import type { Ctx } from './context';
import { h, prefersReducedMotion, routeChip } from './dom';
import { MOOD_LABEL } from './people';

const STARTERS: Record<CharacterId, string[]> = {
  mara: ['When did you last see AL-07?', 'Where were you between 01:45 and 02:40?', 'Who can open the vault?'],
  felix: ['What is AL-07 to you?', 'When did you leave last night?', 'Why did you argue with the director?'],
  sol: ['What was your job here last night?', 'Who met you at the bay?', 'When did you leave?'],
  ruth: ['What are your rounds?', 'Did you see anything unusual at 02:00?', 'Where did you find the receipt?'],
};

/**
 * Type a paragraph on, one character at a time. The full text is in the DOM from the start
 * (the untyped part is transparent), so line breaks never jump and screen readers get it whole.
 */
function typeOn(p: HTMLElement, text: string, done: () => void) {
  const typed = document.createElement('span');
  const rest = document.createElement('span');
  rest.className = 'untyped';
  rest.textContent = text;
  p.replaceChildren(typed, rest);
  const total = Math.min(2200, Math.max(500, text.length * 14));
  const t0 = performance.now();
  const step = (now: number) => {
    const n = Math.min(text.length, Math.ceil(((now - t0) / total) * text.length));
    typed.textContent = text.slice(0, n);
    rest.textContent = text.slice(n);
    if (n < text.length) requestAnimationFrame(step);
    else {
      p.textContent = text;
      done();
    }
  };
  requestAnimationFrame(step);
}

/** Centre: the interview record, a typed sheet under the lamp. The question box is its last line. */
export class Room {
  readonly el: HTMLElement;
  private readonly head: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly log: HTMLElement;
  private readonly typing: HTMLElement;
  private readonly starters: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly send: HTMLButtonElement;
  private readonly prompt: HTMLElement;
  private renderedFor: CharacterId | null = null;
  private nodes = new Map<string, HTMLElement>();

  constructor(private ctx: Ctx) {
    this.head = h('header', { class: 'record__head' });
    this.notice = h('p', { class: 'notice', hidden: true, role: 'status' });
    this.log = h('ol', { class: 'transcript', role: 'log', 'aria-live': 'polite', 'aria-label': 'Interview record' });
    this.typing = h('div', { class: 'typing', hidden: true, 'aria-hidden': 'true' });
    this.starters = h('div', { class: 'starters' });
    this.input = h('textarea', {
      class: 'line__input',
      id: 'question',
      rows: 1,
      maxlength: 300,
      autocomplete: 'off',
      enterkeyhint: 'send',
    }) as HTMLTextAreaElement;
    this.send = h('button', { class: 'key', type: 'submit' }, 'Ask') as HTMLButtonElement;
    this.prompt = h('span', { class: 'line__q', 'aria-hidden': 'true' }, 'Q.');
    const form = h(
      'form',
      {
        class: 'line',
        onsubmit: (ev: Event) => {
          ev.preventDefault();
          this.submit();
        },
      },
      this.prompt,
      h('label', { class: 'sr-only', for: 'question' }, 'Your question'),
      h('span', { class: 'line__field' }, this.input),
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
      this.fit();
    });
    const scroller = h('div', { class: 'record__scroll' }, this.head, this.notice, this.log, this.typing, form, this.starters);
    this.el = h('section', { class: 'room record', 'aria-labelledby': 'room-name' }, scroller);
  }

  /** Grow the typing line with its text (rows, not height animation). */
  private fit() {
    const len = this.input.value.length;
    this.input.rows = len > 110 ? 3 : len > 52 ? 2 : 1;
  }

  private submit() {
    const s = this.ctx.game.snapshot;
    const q = this.input.value.trim();
    if (!q || this.ctx.game.ephemeral.busy[s.active] || s.accusation) return;
    this.input.value = '';
    this.fit();
    this.ctx.ui.drafts[`q:${s.active}`] = '';
    void this.ctx.game.ask(s.active, q);
  }

  private renderMessage(m: Message, fresh: boolean): HTMLElement {
    const c = getCharacter(m.characterId);
    if (m.role === 'detective') {
      return h('li', { class: 'msg msg--q', 'data-id': m.id }, h('span', { class: 'msg__who', 'aria-hidden': 'true' }, 'Q.'), h('p', { class: 'msg__q' }, h('span', { class: 'sr-only' }, 'You: '), m.text));
    }
    if (m.role === 'notice') {
      return h('li', { class: 'msg msg--notice', 'data-id': m.id }, h('p', {}, m.text));
    }
    const pins = (m.revealed ?? []).map((id) => getFact(id)).filter((f) => f !== undefined);
    const words = h('span', { class: 'msg__words' }, m.text);
    const li = h(
      'li',
      { class: `msg msg--a${m.pressure === 'applied' ? ' msg--cracked' : ''}`, 'data-id': m.id, 'data-mood': m.mood ?? 'calm' },
      h('span', { class: 'msg__who', 'aria-hidden': 'true' }, 'A.'),
      h('blockquote', { class: 'msg__a' }, h('p', {}, h('b', { class: 'msg__name' }, `${c.shortName}: `), words)),
      m.pressure === 'applied' ? h('span', { class: 'stamp stamp--press stamp--margin' }, 'Cracked') : null,
      m.pressure === 'bluff' ? h('span', { class: 'stamp stamp--bluff stamp--margin', title: 'Pin the evidence to the case folder first' }, 'Bluff') : null,
      m.fallback ? h('span', { class: 'stamp stamp--bluff stamp--margin', title: 'The model reply could not be read; a safe line was used' }, 'Garbled') : null,
      h(
        'p',
        { class: 'msg__meta' },
        m.route ? routeChip(m.route, m.ms, this.ctx.demo) : null,
        m.mood ? h('span', { class: 'mood', 'data-mood': m.mood }, `, ${MOOD_LABEL[m.mood].toLowerCase()}`) : null,
        m.pressure === 'bluff' ? h('span', { class: 'msg__why' }, '. You named evidence that is not in the case folder yet.') : null,
      ),
      pins.length
        ? h(
            'ul',
            { class: 'msg__pins', 'aria-label': 'Pinned to the case folder' },
            pins.map((f) => h('li', {}, `Pinned: ${f.text}`)),
          )
        : null,
    );
    if (fresh && !prefersReducedMotion()) {
      li.classList.add('is-typing');
      const p = words;
      typeOn(p, m.text, () => {
        li.classList.remove('is-typing');
        this.scrollToEnd(true);
      });
    }
    return li;
  }

  update(s: GameState, e: Ephemeral) {
    const c = getCharacter(s.active);
    const busy = !!e.busy[s.active];
    const route = e.device?.state === 'unavailable' ? 'remote-line' : 'on-device';

    if (this.renderedFor !== s.active) {
      // Character switch: rebuild without any typing animation.
      this.renderedFor = s.active;
      this.nodes.clear();
      this.log.replaceChildren();
      this.head.replaceChildren(
        h('h2', { class: 'record__title', id: 'room-name' }, `Interview record. Halden Glasshouse Station. Subject: ${c.name}`),
        h('p', { class: 'record__sub' }, `${c.role}. ${c.blurb}`),
      );
      this.input.placeholder = `Ask ${c.shortName} a question`;
      this.input.value = this.ctx.ui.drafts[`q:${c.id}`] ?? '';
      this.fit();
      this.log.append(
        h(
          'li',
          { class: 'msg msg--a msg--greeting' },
          h('span', { class: 'msg__who', 'aria-hidden': 'true' }, 'A.'),
          h('blockquote', { class: 'msg__a' }, h('p', {}, h('b', { class: 'msg__name' }, `${c.shortName}: `), c.greeting)),
        ),
      );
      for (const m of s.messages) if (m.characterId === c.id) this.nodes.set(m.id, this.log.appendChild(this.renderMessage(m, false)));
      this.scrollToEnd(false);
    } else {
      let added = false;
      for (const m of s.messages) {
        if (m.characterId !== c.id || this.nodes.has(m.id)) continue;
        const node = this.renderMessage(m, m.role === 'character');
        node.classList.add('is-new');
        this.nodes.set(m.id, this.log.appendChild(node));
        added = true;
      }
      if (added) this.scrollToEnd(true);
    }

    // Typewriter carriage: three typed dots while the answer is on its way.
    this.typing.hidden = !busy;
    if (busy && !this.typing.childElementCount) {
      this.typing.append(
        h('span', { class: 'msg__who' }, 'A.'),
        h('span', { class: 'typing__line' }, h('b', {}, `${c.shortName}: `), h('span', { class: 'typing__dots' }, h('i', {}, '.'), h('i', {}, '.'), h('i', {}, '.'))),
        routeChip(route, undefined, this.ctx.demo),
      );
      this.scrollToEnd(true);
    } else if (!busy) this.typing.replaceChildren();

    // Remote-line notice
    const remote = e.device?.state === 'unavailable';
    this.notice.hidden = !remote;
    this.notice.textContent = remote ? 'No on-device model in this browser: suspects are on a remote line (slower).' : '';

    // Suggested questions only before the first question to this person
    const asked = s.messages.some((m) => m.characterId === c.id && m.role === 'detective');
    this.starters.hidden = asked || !!s.accusation;
    if (!asked && this.starters.dataset.for !== c.id) {
      this.starters.dataset.for = c.id;
      this.starters.replaceChildren(
        h('span', { class: 'starters__lead' }, 'Or start with'),
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
    this.send.textContent = busy ? 'Wait' : 'Ask';
  }

  focusInput() {
    this.input.focus();
  }

  private scrollToEnd(smooth: boolean) {
    const scroller = this.log.parentElement;
    if (!scroller) return;
    requestAnimationFrame(() => {
      // Desktop: the sheet scrolls inside itself. Mobile: the page does, so leave it alone.
      const behavior = smooth && !prefersReducedMotion() ? 'smooth' : 'instant';
      if (getComputedStyle(scroller).overflowY !== 'visible') scroller.scrollTo({ top: scroller.scrollHeight, behavior });
      else if (this.el.offsetParent !== null && smooth) this.input.closest('form')?.scrollIntoView({ block: 'nearest', behavior });
    });
  }
}
