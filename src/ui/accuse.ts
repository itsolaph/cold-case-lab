import { caseFile, getFact } from '../case';
import type { CharacterId } from '../case/types';
import type { Ctx } from './context';
import { h } from './dom';
import { sourceStamp } from './board';

/** Accusation dialog: pick the culprit and exactly two pinned facts. */
export function openAccuseDialog(ctx: Ctx, onFiled: () => void) {
  const s = ctx.game.snapshot;
  if (s.accusation) return onFiled();
  let suspect: CharacterId | null = null;
  const chosen = new Set<string>();

  const fileBtn = h('button', { class: 'btn btn--tamper', type: 'submit', disabled: true }, 'File the accusation') as HTMLButtonElement;
  const status = h('p', { class: 'accuse__status', role: 'status' });
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
    { class: 'accuse__suspects' },
    h('legend', { class: 'label' }, 'The culprit'),
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
          h('span', { class: 'tag__mono', 'aria-hidden': 'true' }, c.initials),
          h('span', { class: 'pick__body' }, h('span', { class: 'tag__name' }, c.name), h('span', { class: 'tag__role' }, c.role)),
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
    { class: 'accuse__facts' },
    h('legend', { class: 'label' }, 'Two pinned facts: one proves means, one proves opportunity'),
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
            h('span', { class: 'pickfact__body' }, sourceStamp(f), h('span', {}, f.text)),
          ),
        )
      : h('p', { class: 'empty' }, 'The board is empty. Question people and use the lab before you accuse anyone.'),
  );

  const dialog = h(
    'dialog',
    { class: 'accuse bag bag--e2', 'aria-labelledby': 'accuse-title' },
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
        { class: 'accuse__head' },
        h('h2', { class: 'accuse__title', id: 'accuse-title' }, 'Make the accusation'),
        h('p', {}, 'This closes the case. Confessions can be retracted in court; lab findings cannot.'),
      ),
      suspects,
      factList,
      h(
        'div',
        { class: 'accuse__foot' },
        status,
        h('button', { class: 'btn btn--quiet', type: 'button', onclick: () => dialog.close() }, 'Keep investigating'),
        fileBtn,
      ),
    ),
  ) as HTMLDialogElement;
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  refresh();
  dialog.showModal();
}
