import { caseFile, getExhibit, getFact } from '../case';
import type { Exhibit, ExhibitId } from '../case/types';
import type { ExhibitLoader } from '../game/controller';
import { labTokensLeft, LAB_TOKENS, type GameState, type LabCall } from '../game/state';
import type { Ctx } from './context';
import { h, prefersReducedMotion, routeChip } from './dom';

/** Minimal CSV parser for the exhibit (quoted fields, no embedded newlines). */
export function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const out: string[] = [];
      let cur = '';
      let q = false;
      for (const ch of line) {
        if (ch === '"') q = !q;
        else if (ch === ',' && !q) {
          out.push(cur);
          cur = '';
        } else cur += ch;
      }
      out.push(cur);
      return out;
    });
}

/**
 * The exhibit sheet and the lab request form (centre), plus the tray under the tube's mouth
 * where reports come back as pink carbon slips (`tray`, placed on the right wall).
 */
export class Lab {
  readonly el: HTMLElement;
  readonly tray: HTMLElement;
  private readonly tabs: HTMLElement;
  private readonly viewer: HTMLElement;
  private readonly input: HTMLTextAreaElement;
  private readonly sendBtn: HTMLButtonElement;
  private readonly sealNote: HTMLElement;
  private readonly formLabel: HTMLElement;
  private readonly reports: HTMLElement;
  private readonly reportNodes = new Map<string, { status: string; node: HTMLElement }>();
  private shown: ExhibitId | null = null;
  private primed = false;
  private viewerCache = new Map<ExhibitId, HTMLElement>();

  constructor(
    private ctx: Ctx,
    private loader: ExhibitLoader,
  ) {
    this.tabs = h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Exhibits' });
    for (const e of caseFile.exhibits) {
      this.tabs.append(
        h(
          'button',
          {
            class: 'seg__btn',
            type: 'button',
            role: 'tab',
            'data-id': e.id,
            id: `tab-${e.id}`,
            'aria-controls': 'exhibit-viewer',
            onclick: () => ctx.setUi({ labExhibit: e.id }),
          },
          h('span', { class: 'seg__code' }, e.code),
          h('span', { class: 'seg__label' }, e.title),
        ),
      );
    }
    this.viewer = h('div', { class: 'viewer', id: 'exhibit-viewer', role: 'tabpanel', tabindex: 0 });
    this.input = h('textarea', {
      class: 'lab__input',
      id: 'lab-request',
      rows: 3,
      maxlength: 600,
      placeholder: 'What should the lab test for? Name the person, handset, door or time.',
    }) as HTMLTextAreaElement;
    this.input.addEventListener('input', () => {
      this.ctx.ui.drafts[`lab:${this.ctx.ui.labExhibit}`] = this.input.value;
    });
    this.sendBtn = h('button', { class: 'btn btn--brass', type: 'submit' }, 'Send a canister') as HTMLButtonElement;
    this.sealNote = h('span', { class: 'lab__seal-note' });
    this.formLabel = h('label', { class: 'lab__label', for: 'lab-request' }, 'Lab request');
    const form = h(
      'form',
      {
        class: 'lab__form',
        onsubmit: (ev: Event) => {
          ev.preventDefault();
          this.submit();
        },
      },
      this.formLabel,
      h('p', { class: 'lab__rule' }, 'The lab runs on Gemini in the cloud. Each request uses one canister, and a vague request gets a vague report.'),
      this.input,
      h('div', { class: 'lab__send' }, this.sealNote, this.sendBtn),
    );
    this.reports = h('ol', { class: 'reports', 'aria-live': 'polite', 'aria-label': 'Lab reports' });
    this.el = h(
      'section',
      { class: 'lab', 'aria-labelledby': 'lab-title' },
      h('h2', { class: 'sr-only', id: 'lab-title' }, 'Exhibits and the lab'),
      this.tabs,
      h('div', { class: 'exsheet' }, this.viewer),
      form,
    );
    this.tray = h('section', { class: 'tray', 'aria-labelledby': 'tray-title' }, h('h2', { class: 'sr-only', id: 'tray-title' }, 'Lab reports'), this.reports);
  }

  private submit() {
    const s = this.ctx.game.snapshot;
    const req = this.input.value.trim();
    if (!req || labTokensLeft(s) <= 0 || this.ctx.game.labBusy || s.accusation) return;
    this.input.value = '';
    this.ctx.ui.drafts[`lab:${this.ctx.ui.labExhibit}`] = '';
    void this.ctx.game.requestLab(this.ctx.ui.labExhibit, req);
  }

  private async renderViewer(e: Exhibit): Promise<HTMLElement> {
    const cached = this.viewerCache.get(e.id);
    if (cached) return cached;
    const url = `${import.meta.env.BASE_URL}${e.file}`;
    const head = h(
      'div',
      { class: 'viewer__head' },
      h('h3', { class: 'viewer__title' }, `Exhibit ${e.code}. ${e.title}`),
      h('a', { class: 'viewer__raw', href: url, target: '_blank', rel: 'noopener' }, 'Open the raw file'),
    );
    const prov = h('p', { class: 'viewer__prov' }, `Chain of custody: ${e.provenance}. ${e.size}.`);
    let body: HTMLElement;
    if (e.kind === 'image') {
      body = h('img', { class: 'viewer__img', src: url, alt: e.alt ?? e.title, width: 900, height: 1200, loading: 'lazy' });
    } else {
      const text = await this.loader.text(e.id);
      if (e.kind === 'csv') {
        const rows = parseCsv(text);
        const [header, ...data] = rows;
        body = h(
          'div',
          { class: 'viewer__scroll' },
          h(
            'table',
            { class: 'csv' },
            h('caption', { class: 'sr-only' }, e.title),
            h('thead', {}, h('tr', {}, (header ?? []).map((c) => h('th', { scope: 'col' }, c)))),
            h('tbody', {}, data.map((r) => h('tr', {}, r.map((c) => h('td', {}, c))))),
          ),
        );
      } else {
        body = h('div', { class: 'viewer__scroll' }, h('pre', { class: `doc doc--${e.kind}` }, text));
      }
    }
    const node = h('div', { class: 'viewer__inner' }, head, prov, body);
    this.viewerCache.set(e.id, node);
    return node;
  }

  private renderReport(c: LabCall, n: number): HTMLElement {
    const e = getExhibit(c.exhibitId);
    if (c.status === 'working') {
      return h(
        'li',
        { class: 'report report--working', 'data-id': c.id },
        h(
          'p',
          { class: 'report__wait', role: 'status' },
          `Canister ${n} is at the lab with exhibit ${e.code}. `,
          h('span', { class: 'typing__dots', 'aria-hidden': 'true' }, h('i', {}, '.'), h('i', {}, '.'), h('i', {}, '.')),
        ),
        h('p', { class: 'report__req' }, `You asked: “${c.request}”`),
        routeChip('cloud-lab', undefined, this.ctx.demo),
      );
    }
    if (c.status === 'failed') {
      return h(
        'li',
        { class: 'report report--failed', 'data-id': c.id },
        h('p', { class: 'report__wait' }, `The canister came back unopened (exhibit ${e.code}). It is back in the rack.`),
        h('p', { class: 'report__req' }, `You asked: “${c.request}”`),
        h('p', { class: 'report__summary' }, c.summary),
      );
    }
    return h(
      'li',
      { class: 'report slip', 'data-id': c.id, style: `--tilt: ${n % 2 ? -0.9 : 0.7}deg` },
      h('header', { class: 'slip__head' }, h('p', { class: 'slip__lab' }, `Ashfall Forensic Services, report ${n}`), h('p', { class: 'slip__ref' }, `Exhibit ${e.code}, ${e.title.toLowerCase()}`)),
      h('p', { class: 'report__req' }, `Request: “${c.request}”`),
      h('p', { class: 'report__summary' }, c.summary),
      c.findings.length
        ? h(
            'ul',
            { class: 'findings' },
            c.findings.map((f) =>
              h(
                'li',
                { class: 'finding' },
                h('span', { class: 'stamp stamp--certified' }, 'Certified'),
                h('p', {}, f.text),
                getFact(f.factId) ? h('span', { class: 'finding__pinned' }, 'Pinned to the case folder') : null,
              ),
            ),
          )
        : h('p', { class: 'report__none' }, 'No finding certified.'),
      c.fallback ? h('p', { class: 'report__note' }, 'The model reply was unreadable; this report was rebuilt from the bench notes.') : null,
      h('p', { class: 'slip__foot' }, routeChip('cloud-lab', c.ms, this.ctx.demo)),
    );
  }

  update(s: GameState) {
    const exId = this.ctx.ui.labExhibit;
    const e = getExhibit(exId);
    for (const b of this.tabs.querySelectorAll<HTMLButtonElement>('.seg__btn')) {
      const on = b.dataset.id === exId;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    }
    if (this.shown !== exId) {
      this.shown = exId;
      this.viewer.setAttribute('aria-labelledby', `tab-${exId}`);
      this.viewer.replaceChildren(h('div', { class: 'skeleton skeleton--viewer', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i')));
      void this.renderViewer(e).then((node) => {
        if (this.shown === exId) this.viewer.replaceChildren(node);
      });
      this.input.value = this.ctx.ui.drafts[`lab:${exId}`] ?? '';
    }
    this.formLabel.textContent = `Lab request for exhibit ${e.code}`;

    const left = labTokensLeft(s);
    const busy = this.ctx.game.labBusy;
    const closed = !!s.accusation;
    this.sendBtn.disabled = left <= 0 || busy || closed;
    this.input.disabled = left <= 0 || closed;
    this.sealNote.textContent =
      left <= 0 ? 'All three canisters are used. Work with what you have.' : busy ? 'Wait for the canister to come back.' : `Uses canister ${LAB_TOKENS - left + 1} of ${LAB_TOKENS}`;

    // Reports, newest first, keyed by id; re-render only on status change.
    const live = s.labCalls.filter((c) => c.status !== 'failed');
    const numberOf = (c: LabCall) => live.indexOf(c) + 1;
    const seen = new Set<string>();
    let changed: HTMLElement | null = null;
    for (const c of s.labCalls) {
      seen.add(c.id);
      const prev = this.reportNodes.get(c.id);
      if (prev && prev.status === c.status) continue;
      const node = this.renderReport(c, numberOf(c));
      if (prev) {
        if (this.primed) node.classList.add('is-new');
        prev.node.replaceWith(node);
      } else {
        if (this.primed) node.classList.add('is-new');
        this.reports.prepend(node);
      }
      this.reportNodes.set(c.id, { status: c.status, node });
      if (this.primed) changed = node;
    }
    // Bring a new or finished report into view inside the tray, never on the first paint of a restored game.
    if (changed && this.tray.offsetParent !== null) {
      const node = changed;
      const behavior = prefersReducedMotion() ? 'instant' : 'smooth';
      requestAnimationFrame(() => {
        // Desktop: the right wall scrolls; the newest slip sits right under the tube's mouth, so go to the top.
        const wall = this.tray.closest<HTMLElement>('.wall--right');
        if (wall && wall.clientHeight > 0 && wall.scrollHeight > wall.clientHeight) wall.scrollTo({ top: 0, behavior });
        else node.scrollIntoView({ block: 'nearest', behavior });
      });
    }
    this.primed = true;
    for (const [id, r] of this.reportNodes) {
      if (!seen.has(id)) {
        r.node.remove();
        this.reportNodes.delete(id);
      }
    }
    if (!s.labCalls.length && !this.reports.childElementCount) {
      this.reports.append(h('li', { class: 'tray__empty', 'data-empty': '1' }, 'Reports drop out of the tube here. Read an exhibit, decide what would prove something, then ask the lab for exactly that.'));
    } else if (s.labCalls.length) {
      this.reports.querySelector('[data-empty]')?.remove();
    }
  }
}
