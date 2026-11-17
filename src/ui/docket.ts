import { LAB_TOKENS, type GameState } from '../game/state';
import { h, prefersReducedMotion } from './dom';

type SealState = 'sealed' | 'working' | 'spent';

/**
 * The lab docket: three sealed evidence bags with red tamper tape.
 * Spending a lab request tears the tape; the bag glows luminol blue while the lab works.
 * This is the loudest element on screen on purpose.
 */
export class Docket {
  readonly el: HTMLElement;
  private seals: HTMLElement[] = [];
  private states: SealState[] = [];
  private readonly caption: HTMLElement;

  constructor(onOpenLab: () => void) {
    this.caption = h('span', { class: 'docket__caption' });
    this.el = h(
      'section',
      { class: 'docket', 'aria-label': 'Lab docket' },
      h('div', { class: 'docket__head' }, h('span', { class: 'label' }, 'Lab docket'), this.caption),
    );
    const row = h('div', { class: 'docket__row' });
    for (let i = 0; i < LAB_TOKENS; i++) {
      const seal = h(
        'button',
        { class: 'seal', type: 'button', 'data-state': 'sealed', onclick: onOpenLab },
        h('span', { class: 'seal__zip', 'aria-hidden': 'true' }),
        // Two identical layers clipped along the same jagged line: one strip until torn.
        h(
          'span',
          { class: 'seal__tape', 'aria-hidden': 'true' },
          h('span', { class: 'seal__half seal__half--l' }, 'Evidence sealed'),
          h('span', { class: 'seal__half seal__half--r' }, 'Evidence sealed'),
        ),
        h('span', { class: 'seal__no', 'aria-hidden': 'true' }, `0${i + 1}`),
        h('span', { class: 'seal__state' }, 'Sealed'),
      );
      this.seals.push(seal);
      this.states.push('sealed');
      row.append(seal);
    }
    this.el.append(row);
  }

  update(s: GameState) {
    const live = s.labCalls.filter((c) => c.status !== 'failed');
    let left = 0;
    this.seals.forEach((seal, i) => {
      const call = live[i];
      const next: SealState = !call ? 'sealed' : call.status === 'working' ? 'working' : 'spent';
      if (next === 'sealed') left++;
      const prev = this.states[i];
      if (prev === next) return;
      this.states[i] = next;
      seal.dataset.state = next;
      // Tear only on the live transition, never when restoring a saved game.
      if (prev === 'sealed' && next !== 'sealed' && !prefersReducedMotion()) {
        seal.classList.add('is-tearing');
        seal.addEventListener('animationend', () => seal.classList.remove('is-tearing'), { once: true });
      }
      const label = seal.querySelector('.seal__state');
      if (label) label.textContent = next === 'sealed' ? 'Sealed' : next === 'working' ? 'At the lab' : `Report ${i + 1}`;
      seal.setAttribute(
        'aria-label',
        next === 'sealed' ? `Lab request ${i + 1}: sealed, unused` : next === 'working' ? `Lab request ${i + 1}: at the lab now` : `Lab request ${i + 1}: used`,
      );
    });
    this.caption.textContent = live.some((c) => c.status === 'working') ? 'At the lab' : left ? '' : 'All seals broken';
    this.el.setAttribute('aria-label', `Lab docket: ${left} of ${LAB_TOKENS} lab requests left`);
  }

  /** Initial paint from a saved game: no tear animation. */
  prime(s: GameState) {
    const live = s.labCalls.filter((c) => c.status !== 'failed');
    this.seals.forEach((seal, i) => {
      const call = live[i];
      const st: SealState = !call ? 'sealed' : call.status === 'working' ? 'working' : 'spent';
      this.states[i] = st === 'sealed' ? 'sealed' : st;
      seal.dataset.state = st;
      const label = seal.querySelector('.seal__state');
      if (label) label.textContent = st === 'sealed' ? 'Sealed' : st === 'working' ? 'At the lab' : `Report ${i + 1}`;
    });
    this.update(s);
  }
}
