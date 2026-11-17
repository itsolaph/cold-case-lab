import { caseFile } from '../case';
import type { DeviceStatus } from '../ai/engine';
import type { Ephemeral, ExhibitLoader } from '../game/controller';
import { labTokensLeft, questionCounts, type GameState } from '../game/state';
import { openAccuseDialog } from './accuse';
import { Board, Drawer } from './board';
import type { Ctx, Tab } from './context';
import { Docket } from './docket';
import { h } from './dom';
import { Lab } from './lab';
import { People } from './people';
import { renderResult } from './result';
import { Room } from './room';

function deviceLine(d: DeviceStatus | null, demo: boolean): string {
  if (!d) return demo ? 'Demo engine' : 'Starting';
  if (d.state === 'ready') return demo ? 'Demo engine: on device (simulated)' : 'Gemini Nano on this device';
  if (d.state === 'downloading') return `${demo ? 'Simulated download' : 'Gemini Nano downloading'} ${Math.round(d.progress * 100)}%`;
  return demo ? 'Demo engine: remote line (simulated)' : 'Remote line: no on-device model';
}

/** Confirm before wiping progress. Native <dialog>, styled like the accusation sheet. */
function confirmNewCase(onConfirm: () => void) {
  const dialog = h(
    'dialog',
    { class: 'accuse confirm bag bag--e2', 'aria-labelledby': 'confirm-title' },
    h(
      'form',
      { method: 'dialog' },
      h(
        'header',
        { class: 'accuse__head' },
        h('h2', { class: 'accuse__title', id: 'confirm-title' }, 'Start a new case file?'),
        h('p', {}, 'Your questions, pinned facts and lab reports will be cleared, and all three seals restored.'),
      ),
      h(
        'div',
        { class: 'accuse__foot' },
        h('button', { class: 'btn btn--quiet', value: 'cancel', autofocus: true }, 'Keep this case'),
        h('button', { class: 'btn btn--tamper is-armed', value: 'reset' }, 'Start a new case file'),
      ),
    ),
  ) as HTMLDialogElement;
  dialog.addEventListener('close', () => {
    const confirmed = dialog.returnValue === 'reset';
    dialog.remove();
    if (confirmed) onConfirm();
  });
  document.body.append(dialog);
  dialog.showModal();
}

/** The investigation screen: header with docket, three columns, mobile tabs. */
export class GameScreen {
  readonly el: HTMLElement;
  private readonly people: People;
  private readonly room: Room;
  private readonly lab: Lab;
  private readonly board: Board;
  private readonly drawer: Drawer;
  private readonly docket: Docket;
  private readonly qCount: HTMLElement;
  private readonly qLabel: HTMLElement;
  private readonly labCount: HTMLElement;
  private readonly engineBadge: HTMLElement;
  private readonly tabs = new Map<Tab, { btn: HTMLElement; badge: HTMLElement }>();
  private readonly segRoom: HTMLElement;
  private readonly segLab: HTMLElement;

  constructor(
    private ctx: Ctx,
    loader: ExhibitLoader,
  ) {
    this.people = new People(ctx);
    this.room = new Room(ctx);
    this.lab = new Lab(ctx, loader);
    this.board = new Board();
    this.drawer = new Drawer(ctx);
    this.docket = new Docket(() => ctx.setUi({ view: 'lab', tab: 'lab' }));

    this.qCount = h('span', { class: 'counter__n' }, '0');
    this.qLabel = h('span', { class: 'counter__label' }, 'questions on device, free');
    this.labCount = h('span', { class: 'counter__n counter__n--lab' }, '3');
    this.engineBadge = h('span', { class: `engine ${ctx.demo ? 'engine--demo' : ''}`, title: ctx.engineReason, role: 'status' });

    const header = h(
      'header',
      { class: 'top' },
      h(
        'div',
        { class: 'top__case' },
        h('span', { class: 'label' }, `Case ${caseFile.number}`),
        h('span', { class: 'top__title' }, caseFile.title),
      ),
      h(
        'div',
        { class: 'top__counters' },
        h('p', { class: 'counter' }, this.qCount, this.qLabel),
        h('p', { class: 'counter counter--lab' }, this.labCount, h('span', { class: 'counter__label' }, 'lab requests left')),
        this.engineBadge,
      ),
      this.docket.el,
      h(
        'button',
        {
          class: 'btn btn--quiet top__reset',
          type: 'button',
          onclick: () => confirmNewCase(() => ctx.newCase()),
        },
        'New case file',
      ),
    );

    this.segRoom = h('button', { class: 'switch__btn', type: 'button', onclick: () => ctx.setUi({ view: 'room', tab: 'room' }) }, 'Interview room');
    this.segLab = h('button', { class: 'switch__btn switch__btn--lab', type: 'button', onclick: () => ctx.setUi({ view: 'lab', tab: 'lab' }) }, 'Forensic lab');

    const center = h('div', { class: 'col col--center' }, h('div', { class: 'switch', role: 'group', 'aria-label': 'Centre view' }, this.segRoom, this.segLab), this.room.el, this.lab.el);

    const tabNav = h('nav', { class: 'tabs', 'aria-label': 'Sections' });
    const tabDefs: [Tab, string][] = [
      ['people', 'People'],
      ['room', 'Room'],
      ['board', 'Board'],
      ['lab', 'Lab'],
    ];
    for (const [id, label] of tabDefs) {
      const badge = h('span', { class: 'tabs__badge' });
      const btn = h(
        'button',
        { class: 'tabs__btn', type: 'button', onclick: () => ctx.setUi({ tab: id, ...(id === 'lab' ? { view: 'lab' } : id === 'room' ? { view: 'room' } : {}) }) },
        h('span', {}, label),
        badge,
      );
      this.tabs.set(id, { btn, badge });
      tabNav.append(btn);
    }

    this.el = h(
      'div',
      { class: 'app' },
      h('a', { class: 'skip', href: '#question' }, 'Skip to the question box'),
      header,
      h(
        'main',
        { class: 'stage', id: 'main' },
        h('div', { class: 'col col--people' }, this.people.el),
        center,
        h('div', { class: 'col col--side' }, this.board.el, this.drawer.el),
      ),
      tabNav,
    );
  }

  prime(s: GameState) {
    this.docket.prime(s);
  }

  update(s: GameState, e: Ephemeral) {
    const ui = this.ctx.ui;
    this.el.dataset.view = ui.view;
    this.el.dataset.tab = ui.tab;
    this.segRoom.setAttribute('aria-pressed', String(ui.view === 'room'));
    this.segLab.setAttribute('aria-pressed', String(ui.view === 'lab'));
    for (const [id, t] of this.tabs) {
      if (ui.tab === id) t.btn.setAttribute('aria-current', 'page');
      else t.btn.removeAttribute('aria-current');
    }

    const counts = questionCounts(s);
    const remote = e.device?.state === 'unavailable';
    this.qCount.textContent = String(remote ? counts.remote + counts.onDevice : counts.onDevice);
    this.qLabel.textContent = remote ? 'questions on the remote line' : 'questions on device, free';
    const left = labTokensLeft(s);
    this.labCount.textContent = String(left);
    this.engineBadge.textContent = deviceLine(e.device, this.ctx.demo);
    this.engineBadge.dataset.state = e.device?.state ?? 'none';

    const boardBadge = this.tabs.get('board')?.badge;
    if (boardBadge) boardBadge.textContent = s.pins.length ? String(s.pins.length) : '';
    const labBadge = this.tabs.get('lab')?.badge;
    if (labBadge) labBadge.textContent = `${left}`;

    this.people.update(s, e);
    this.room.update(s, e);
    this.lab.update(s);
    this.board.update(s);
    this.drawer.update(s);
    this.docket.update(s);
  }

  openAccuse(onFiled: () => void) {
    openAccuseDialog(this.ctx, onFiled);
  }
}

export { renderResult };
