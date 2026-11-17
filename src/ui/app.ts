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
  if (!d) return demo ? 'Demo engine' : 'Starting the model';
  if (d.state === 'ready') return demo ? 'The demo engine stands in for Gemini Nano' : 'Gemini Nano is running in this browser';
  if (d.state === 'downloading') return `${demo ? 'Simulated download' : 'Downloading Gemini Nano'}, ${Math.round(d.progress * 100)}%`;
  return demo ? 'Demo engine, simulating a remote line' : 'No on-device model, so interviews go over a remote line';
}

/** Confirm before wiping progress. A native <dialog>, printed like the charge sheet. */
function confirmNewCase(onConfirm: () => void) {
  const dialog = h(
    'dialog',
    { class: 'confirm sheet sheet--small', 'aria-labelledby': 'confirm-title' },
    h(
      'form',
      { method: 'dialog' },
      h(
        'header',
        { class: 'sheet__head' },
        h('h2', { class: 'sheet__title', id: 'confirm-title' }, 'Start a new case file?'),
        h('p', { class: 'sheet__lede' }, 'Your interview records, pinned facts and lab reports will be cleared, and all three canisters go back in the rack.'),
      ),
      h(
        'div',
        { class: 'sheet__foot' },
        h('button', { class: 'btn btn--text', value: 'cancel', autofocus: true }, 'Keep this case'),
        h('button', { class: 'btn btn--primary', value: 'reset' }, 'Start a new case file'),
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

/**
 * The night desk: badges on the left wall, the interview record under the lamp,
 * the tube station and case folder on the right wall. On phones the same objects stack behind tabs.
 */
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
  private readonly engineLine: HTMLElement;
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
    this.qLabel = h('span', { class: 'counter__label' }, ' questions asked on this device');
    this.engineLine = h('span', { class: 'engine', title: ctx.engineReason, role: 'status' });

    const header = h(
      'header',
      { class: 'top' },
      h('p', { class: 'top__case' }, h('span', { class: 'top__title' }, caseFile.title), h('span', { class: 'top__no' }, `Case ${caseFile.number}`)),
      h('p', { class: 'top__status' }, h('span', { class: 'counter' }, this.qCount, this.qLabel), h('span', { class: 'top__sep', 'aria-hidden': 'true' }, '. '), this.engineLine),
      h(
        'button',
        {
          class: 'btn btn--text top__reset',
          type: 'button',
          onclick: () => confirmNewCase(() => ctx.newCase()),
        },
        'New case file',
      ),
    );

    this.segRoom = h('button', { class: 'switch__btn', type: 'button', onclick: () => ctx.setUi({ view: 'room', tab: 'room' }) }, 'Interview room');
    this.segLab = h('button', { class: 'switch__btn switch__btn--lab', type: 'button', onclick: () => ctx.setUi({ view: 'lab', tab: 'lab' }) }, 'Exhibits and lab');

    const desk = h(
      'div',
      { class: 'col col--center desk' },
      h('span', { class: 'desk__lamp', 'aria-hidden': 'true' }),
      h('div', { class: 'switch', role: 'group', 'aria-label': 'On the table' }, this.segRoom, this.segLab),
      this.room.el,
      this.lab.el,
    );

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

    const folder = h('div', { class: 'folder' }, this.board.el, this.drawer.el);

    this.el = h(
      'div',
      { class: 'app' },
      h('a', { class: 'skip', href: '#question' }, 'Skip to the question line'),
      header,
      h(
        'main',
        { class: 'stage', id: 'main' },
        h('div', { class: 'col col--people wall wall--left' }, this.people.el),
        desk,
        h('div', { class: 'col col--side wall wall--right' }, this.docket.el, tabNav, this.lab.tray, folder),
      ),
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
    const n = remote ? counts.remote + counts.onDevice : counts.onDevice;
    this.qCount.textContent = String(n);
    this.qLabel.textContent = `${n === 1 ? ' question' : ' questions'} ${remote ? 'asked over the remote line' : 'asked on this device'}`;
    const left = labTokensLeft(s);
    this.engineLine.textContent = deviceLine(e.device, this.ctx.demo);
    this.engineLine.dataset.state = e.device?.state ?? 'none';

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
