import { caseFile, getFact } from '../case';
import type { CharacterId } from '../case/types';
import type { Ctx } from './context';
import { h, photo } from './dom';
import { sourceStamp } from './board';
import { PHOTO } from './people';

/** The charge sheet: pick the culprit by badge photo and exactly two pinned facts. */
export function openAccuseDialog(ctx: Ctx, onFiled: () => void) {
  const s = ctx.game.snapshot;
  if (s.accusation) return onFiled();
  let suspect: CharacterId | null = null;
  const chosen = new Set<string>();

  const fileBtn = h('button', { class: 'btn btn--tamper btn--file', type: 'submit', disabled: true }, 'File the accusation') as HTMLButtonElement;
  const status = h('p', { class: 'sheet__status', role: 'status' });
  const refresh = () => {
    fileBtn.disabled = !suspect || chosen.size !== 2;
    fileBtn.classList.toggle('is-armed', !fileBtn.disabled);
    status.textContent = !suspect ? 'Name a suspect.' : chosen.size !== 2 ? `Pick ${2 - chosen.size} more fact${chosen.size === 1 ? '' : 's'}.` : 'Ready to file.';
    for (const box of factList.querySelectorAll<HTMLInputElement>('input[type=checkbox]')) {
      box.disabled = !box.checked && chosen.size >= 2;
    }
  };

  const suspects = h(
    'fieldset',
    { class: 'sheet__field sheet__suspects' },
    h('legend', { class: 'sheet__legend' }, 'Charged'),
    h(
      'div',
      { class: 'picks' },
      caseFile.characters
        .filter((c) => c.kind === 'suspect')
        .map((c) =>
          h(
            'label',
            { class: 'pick' },
            h('input', {
              type: 'radio',
              name: 'suspect',
              value: c.id,
              onchange: () => {
                suspect = c.id;
                refresh();
              },
            }),
            photo(PHOTO[c.id], '', 480, 480, { cls: 'pick__photo' }),
            h('span', { class: 'pick__name' }, c.name),
            h('span', { class: 'pick__role' }, c.role),
          ),
        ),
    ),
  );

  // Lab findings first: they are certified; statements can be retracted.
  const pins = [...s.pins]
    .map((p) => getFact(p.factId))
    .filter((f) => f !== undefined)
    .sort((a, b) => Number(b.source.kind === 'lab') - Number(a.source.kind === 'lab'));

  const factList = h(
    'fieldset',
    { class: 'sheet__field sheet__facts' },
    h('legend', { class: 'sheet__legend' }, 'Evidence: two pinned facts, one for means and one for opportunity'),
    pins.length
      ? pins.map((f) =>
          h(
            'label',
            { class: 'pickfact' },
            h('input', {
              type: 'checkbox',
              value: f.id,
              onchange: (ev: Event) => {
                const el = ev.currentTarget as HTMLInputElement;
                if (el.checked) chosen.add(f.id);
                else chosen.delete(f.id);
                refresh();
              },
            }),
            h('span', { class: 'pickfact__body' }, h('span', { class: 'pickfact__text' }, f.text), sourceStamp(f)),
          ),
        )
      : h('p', { class: 'sheet__empty' }, 'The case folder is empty. Question people and use the lab before you charge anyone.'),
  );

  const dialog = h(
    'dialog',
    { class: 'accuse sheet', 'aria-labelledby': 'accuse-title' },
    h(
      'form',
      {
        method: 'dialog',
        onsubmit: (ev: Event) => {
          ev.preventDefault();
          if (!suspect || chosen.size !== 2) return;
          const [a, b] = [...chosen] as [string, string];
          ctx.game.accuse(suspect, [a, b]);
          dialog.close();
          onFiled();
        },
      },
      h(
        'header',
        { class: 'sheet__head' },
        h('p', { class: 'sheet__org' }, `Halden Glasshouse Station. Case ${caseFile.number}`),
        h('h2', { class: 'sheet__title', id: 'accuse-title' }, 'Charge sheet'),
        h('p', { class: 'sheet__lede' }, 'Filing this closes the case. Confessions can be retracted in court; lab findings cannot.'),
      ),
      suspects,
      factList,
      h(
        'div',
        { class: 'sheet__foot' },
        status,
        h('button', { class: 'btn btn--text', type: 'button', onclick: () => dialog.close() }, 'Keep investigating'),
        fileBtn,
      ),
    ),
  ) as HTMLDialogElement;
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  refresh();
  dialog.showModal();
}
