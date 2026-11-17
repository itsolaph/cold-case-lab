import { LAB_TOKENS, type GameState } from '../game/state';
import { h, prefersReducedMotion } from './dom';

type SealState = 'sealed' | 'working' | 'spent';

const canisterLabel = (i: number, st: SealState) =>
  st === 'sealed' ? `Canister ${i + 1}: in the rack, unused` : st === 'working' ? `Canister ${i + 1}: at the lab now` : `Canister ${i + 1}: used, report ${i + 1} is back`;

/**
 * The brass pneumatic-tube station on the right wall: one canister per lab request.
 * Sending a request fires a canister up the tube; the glass glints while the lab works.
 * This is the loudest object on screen on purpose.
 */
export class Docket {
  readonly el: HTMLElement;
  private seals: HTMLElement[] = [];
  private states: SealState[] = [];
  private readonly caption: HTMLElement;
  private readonly count: HTMLElement;
  private readonly countWord: HTMLElement;

  constructor(onOpenLab: () => void) {
    this.caption = h('p', { class: 'station__caption', role: 'status' });
    this.count = h('span', { class: 'counter__n' }, String(LAB_TOKENS));
    this.countWord = h('span', {}, ' canisters left');
    const tube = h(
      'div',
      { class: 'tube', 'aria-hidden': 'true' },
      h('span', { class: 'tube__pipe tube__pipe--in' }),
      h('span', { class: 'tube__collar' }),
      h('span', { class: 'tube__glass' }, h('span', { class: 'tube__glint' })),
      h('span', { class: 'tube__collar' }),
      h('span', { class: 'tube__pipe tube__pipe--out' }),
      h('span', { class: 'tube__mouth' }),
    );
    const rack = h('div', { class: 'rack' });
    for (let i = 0; i < LAB_TOKENS; i++) {
      const seal = h(
        'button',
        { class: 'seal', type: 'button', 'data-state': 'sealed', 'aria-label': canisterLabel(i, 'sealed'), onclick: onOpenLab },
        h('span', { class: 'canister', 'aria-hidden': 'true' }, h('span', { class: 'canister__no' }, String(i + 1))),
        h('span', { class: 'seal__socket', 'aria-hidden': 'true' }),
      );
      this.seals.push(seal);
      this.states.push('sealed');
      rack.append(seal);
    }
    this.el = h(
      'section',
      { class: 'station', 'aria-label': 'Tube station to the forensic lab' },
      tube,
      h('div', { class: 'station__rack' }, rack, h('p', { class: 'counter counter--lab' }, this.count, this.countWord), this.caption),
    );
  }

  private stateOf(s: GameState): SealState[] {
    const live = s.labCalls.filter((c) => c.status !== 'failed');
    return Array.from({ length: LAB_TOKENS }, (_, i) => {
      const call = live[i];
      return !call ? 'sealed' : call.status === 'working' ? 'working' : 'spent';
    });
  }

  update(s: GameState) {
    const next = this.stateOf(s);
    this.seals.forEach((seal, i) => {
      const st = next[i] ?? 'sealed';
      const prev = this.states[i];
      if (prev === st) return;
      this.states[i] = st;
      seal.dataset.state = st;
      seal.setAttribute('aria-label', canisterLabel(i, st));
      // Launch only on the live transition, never when restoring a saved game.
      if (prev === 'sealed' && st !== 'sealed' && !prefersReducedMotion()) {
        seal.classList.add('is-launching');
        seal.addEventListener('animationend', () => seal.classList.remove('is-launching'), { once: true });
      }
    });
    const left = next.filter((x) => x === 'sealed').length;
    const busy = next.includes('working');
    this.el.dataset.busy = String(busy);
    this.count.textContent = String(left);
    this.countWord.textContent = left === 1 ? ' canister left' : ' canisters left';
    const at = next.indexOf('working');
    this.caption.textContent = busy ? `Canister ${at + 1} is at the lab` : left ? '' : 'The rack is empty';
  }

  /** Initial paint from a saved game: no launch animation. */
  prime(s: GameState) {
    const next = this.stateOf(s);
    this.seals.forEach((seal, i) => {
      const st = next[i] ?? 'sealed';
      this.states[i] = st;
      seal.dataset.state = st;
      seal.setAttribute('aria-label', canisterLabel(i, st));
    });
    this.update(s);
  }
}
