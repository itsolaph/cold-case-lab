import { caseFile } from '../case';
import type { DeviceStatus } from '../ai/engine';
import { h } from './dom';

export interface TitleOptions {
  demo: boolean;
  engineReason: string;
  hasSave: boolean;
  /** Called inside the click handler: it must start `initializeDeviceModel` synchronously. */
  onOpen(): Promise<DeviceStatus>;
  onNew(): void;
  onEnter(): void;
}

/** Case-file cover on the light table. The "Open the case" click initialises the on-device model. */
export function renderTitle(root: HTMLElement, opts: TitleOptions) {
  const progressBar = h('span', { class: 'meter__fill' });
  const progressText = h('span', { class: 'meter__text' }, '');
  const meter = h('div', { class: 'meter', hidden: true, role: 'status', 'aria-live': 'polite' }, h('span', { class: 'meter__track' }, progressBar), progressText);

  const showStatus = (s: DeviceStatus) => {
    meter.hidden = false;
    const who = opts.demo ? 'Demo engine: simulated model download' : 'Downloading Gemini Nano';
    if (s.state === 'downloading') {
      const pct = Math.round(s.progress * 100);
      progressBar.style.inlineSize = `${pct}%`;
      progressText.textContent = `${who} ${pct}%`;
    } else if (s.state === 'ready') {
      progressBar.style.inlineSize = '100%';
      progressText.textContent = opts.demo ? 'Demo engine ready' : 'Gemini Nano ready on this device';
    } else {
      progressBar.style.inlineSize = '100%';
      meter.classList.add('meter--remote');
      progressText.textContent = 'No on-device model here: suspects will be on a remote line';
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
    ? h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => void open(true) }, 'Start a new case file')
    : null;

  const cover = h(
    'main',
    { class: 'title', id: 'main' },
    h(
      'article',
      { class: 'cover bag bag--e2', 'aria-labelledby': 'case-title' },
      h('div', { class: 'cover__tape', 'aria-hidden': 'true' }, h('span', {}, 'Evidence sealed'), h('span', {}, 'Evidence sealed')),
      h(
        'header',
        { class: 'cover__head' },
        h('p', { class: 'label' }, `Case file ${caseFile.number}`),
        h('p', { class: 'label label--quiet' }, 'Halden Glasshouse Station'),
      ),
      h('h1', { class: 'cover__title', id: 'case-title' }, caseFile.title),
      h('p', { class: 'cover__premise' }, caseFile.premise[0], h('br'), caseFile.premise[1]),
      h(
        'dl',
        { class: 'custody' },
        h('div', {}, h('dt', {}, 'Exhibits'), h('dd', {}, '4 sealed')),
        h('div', {}, h('dt', {}, 'People'), h('dd', {}, '3 suspects, 1 witness')),
        h('div', {}, h('dt', {}, 'Lab requests'), h('dd', {}, '3, no refills')),
      ),
      h('div', { class: 'cover__actions' }, openBtn, newBtn),
      meter,
      h(
        'p',
        { class: 'cover__route' },
        'On-device interrogation via Gemini Nano in Chrome · forensic lab via Gemini in the cloud',
      ),
      opts.demo
        ? h(
            'p',
            { class: 'cover__demo' },
            h('strong', {}, 'Demo engine. '),
            `${opts.engineReason} Answers are scripted from the case file; no AI model is called.`,
          )
        : null,
    ),
  );
  root.replaceChildren(cover);
}
