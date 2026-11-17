import { caseFile } from '../case';
import type { DeviceStatus } from '../ai/engine';
import { h, photo } from './dom';

export interface TitleOptions {
  demo: boolean;
  engineReason: string;
  hasSave: boolean;
  /** Called inside the click handler: it must start `initializeDeviceModel` synchronously. */
  onOpen(): Promise<DeviceStatus>;
  onNew(): void;
  onEnter(): void;
}

/**
 * The empty interview room at night. On load the lamp comes up, then the case name settles on the wall.
 * The "Open the case" click initialises the on-device model.
 */
export function renderTitle(root: HTMLElement, opts: TitleOptions) {
  const progressBar = h('span', { class: 'meter__fill' });
  const progressText = h('span', { class: 'meter__text' }, '');
  const meter = h('div', { class: 'meter', hidden: true, role: 'status', 'aria-live': 'polite' }, h('span', { class: 'meter__track' }, progressBar), progressText);

  const showStatus = (s: DeviceStatus) => {
    meter.hidden = false;
    const who = opts.demo ? 'Demo engine: simulated model download' : 'Downloading Gemini Nano';
    if (s.state === 'downloading') {
      const pct = Math.round(s.progress * 100);
      progressBar.style.transform = `scaleX(${s.progress})`;
      progressText.textContent = `${who}, ${pct}%`;
    } else if (s.state === 'ready') {
      progressBar.style.transform = 'scaleX(1)';
      progressText.textContent = opts.demo ? 'Demo engine ready' : 'Gemini Nano is ready on this device';
    } else {
      progressBar.style.transform = 'scaleX(1)';
      meter.classList.add('meter--remote');
      progressText.textContent = 'No on-device model here, so interviews go over a remote line';
    }
  };

  let opening = false;
  const open = async (fresh: boolean) => {
    if (opening) return;
    opening = true;
    if (fresh) opts.onNew();
    openBtn.setAttribute('aria-busy', 'true');
    openBtn.disabled = true;
    const statusPromise = opts.onOpen(); // initializeDeviceModel starts here, inside the click
    try {
      const s = await statusPromise;
      showStatus(s);
    } catch {
      showStatus({ state: 'unavailable', reason: 'init failed' });
    }
    // Let the meter land before the room opens.
    setTimeout(() => opts.onEnter(), 450);
  };

  const openBtn = h(
    'button',
    { class: 'btn btn--primary btn--xl', type: 'button', onclick: () => void open(false) },
    opts.hasSave ? 'Resume the case' : 'Open the case',
  );
  const newBtn = opts.hasSave
    ? h('button', { class: 'btn btn--text', type: 'button', onclick: () => void open(true) }, 'Start a new case file')
    : null;

  const cover = h(
    'main',
    { class: 'title', id: 'main' },
    h(
      'div',
      { class: 'title__room', 'aria-hidden': 'true' },
      photo('room', '', 1920, 1080, { cls: 'title__photo', eager: true }),
      h('span', { class: 'title__wash' }),
      h('span', { class: 'title__lamp' }),
    ),
    h(
      'article',
      { class: 'cover', 'aria-labelledby': 'case-title' },
      h('h1', { class: 'cover__title', id: 'case-title' }, caseFile.title),
      h('p', { class: 'cover__premise' }, 'Overnight, the last Ashfall lily seeds vanished from the station’s vault. Four people were in the building.'),
      h('div', { class: 'cover__actions' }, openBtn, newBtn),
      meter,
      h('p', { class: 'cover__route' }, 'Interviews run on Gemini Nano in your browser. The lab runs on Gemini in the cloud.'),
      opts.demo
        ? h('p', { class: 'cover__demo' }, `${opts.engineReason} Answers come from the case file; no AI model is called.`)
        : null,
    ),
  );
  root.replaceChildren(cover);
}
