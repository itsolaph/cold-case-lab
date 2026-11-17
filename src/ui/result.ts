import { caseFile, getCharacter, getExhibit, getFact } from '../case';
import { solution } from '../case/solution';
import { decisiveLabCalls, judgeAccusation } from '../game/accuse';
import { pinnedSet, questionCounts, type GameState } from '../game/state';
import type { Ctx } from './context';
import { h, photo } from './dom';
import { PHOTO } from './people';

/** The charge sheet comes back stamped. Only rendered after an accusation was filed. */
export function renderResult(ctx: Ctx, s: GameState): HTMLElement {
  const acc = s.accusation;
  if (!acc) return h('div');
  const verdict = judgeAccusation({ suspect: acc.suspect, factIds: acc.factIds }, pinnedSet(s));
  const counts = questionCounts(s);
  const decisive = new Set(decisiveLabCalls(s.labCalls));
  const used = s.labCalls.filter((c) => c.status === 'done');
  const accused = getCharacter(acc.suspect);
  const culprit = getCharacter(solution.culprit);

  const line = (ok: boolean, title: string, detail: string) =>
    h('li', { class: `check ${ok ? 'check--ok' : 'check--bad'}` }, h('span', { class: 'check__title' }, title), h('span', { class: 'check__detail' }, detail), h('span', { class: 'check__mark' }, ok ? 'holds' : 'fails'));

  const factText = (id: string | null) => (id ? (getFact(id)?.text ?? id) : 'Neither chosen fact proves it.');

  const stamp = verdict.correct
    ? h('h1', { class: 'result__stamp result__stamp--closed', id: 'verdict', tabindex: -1 }, h('span', { class: 'result__stamp-main' }, 'Case closed'))
    : h(
        'h1',
        { class: 'result__stamp result__stamp--collapsed', id: 'verdict', tabindex: -1 },
        h('span', { class: 'result__stamp-main' }, 'Released, insufficient evidence'),
        ' ',
        h('span', { class: 'result__stamp-rim' }, 'Case collapsed'),
      );

  return h(
    'main',
    { class: 'result', id: 'main' },
    h(
      'article',
      { class: 'result__sheet', 'aria-labelledby': 'verdict' },
      h(
        'header',
        { class: 'result__head' },
        h('p', { class: 'sheet__org' }, `Halden Glasshouse Station. Case ${caseFile.number}`),
        h('p', { class: 'sheet__title' }, 'Charge sheet'),
      ),
      h(
        'div',
        { class: 'result__charged' },
        photo(PHOTO[accused.id], '', 480, 480, { cls: 'result__photo' }),
        h(
          'p',
          { class: 'result__lede' },
          verdict.correct
            ? `You charged ${accused.name}, and the evidence holds.`
            : verdict.culpritCorrect
              ? `You charged the right person, ${accused.name}, but the evidence you filed does not prove it.`
              : `You charged ${accused.name}. The culprit was ${culprit.name}.`,
        ),
      ),
      stamp,
      h(
        'ul',
        { class: 'checks' },
        line(verdict.culpritCorrect, 'Culprit', verdict.culpritCorrect ? accused.name : `${accused.name} did not do it`),
        line(verdict.meansFact !== null, 'Means', factText(verdict.meansFact)),
        line(verdict.opportunityFact !== null, 'Opportunity', factText(verdict.opportunityFact)),
      ),
      h(
        'dl',
        { class: 'stats' },
        h('div', {}, h('dt', {}, 'Questions asked'), h('dd', {}, String(counts.asked))),
        h('div', {}, h('dt', {}, 'Answered on this device'), h('dd', {}, String(counts.onDevice))),
        h('div', {}, h('dt', {}, 'Over the remote line'), h('dd', {}, String(counts.remote))),
        h('div', {}, h('dt', {}, 'Canisters sent to the lab'), h('dd', {}, `${used.length} of 3`)),
      ),
      h(
        'section',
        { class: 'result__lab' },
        h('h2', { class: 'result__h' }, 'Your lab requests'),
        used.length
          ? h(
              'ol',
              { class: 'calls' },
              used.map((c) =>
                h(
                  'li',
                  { class: `call ${decisive.has(c.id) ? 'call--decisive' : ''}` },
                  h('span', { class: 'call__code' }, `Exhibit ${getExhibit(c.exhibitId).code}`),
                  h('span', { class: 'call__req' }, `“${c.request}”`),
                  h('span', { class: decisive.has(c.id) ? 'stamp stamp--certified' : 'stamp stamp--said' }, decisive.has(c.id) ? 'Decisive' : c.findings.length ? 'Not decisive' : 'No finding'),
                ),
              ),
            )
          : h('p', { class: 'result__none' }, 'You never sent a canister to the lab.'),
      ),
      h('section', { class: 'result__story' }, h('h2', { class: 'result__h' }, 'What happened'), solution.narrative.map((p) => h('p', {}, p))),
      h(
        'div',
        { class: 'result__actions' },
        h('button', { class: 'btn btn--primary btn--xl', type: 'button', onclick: () => ctx.newCase() }, 'Open a new case file'),
      ),
    ),
  );
}
