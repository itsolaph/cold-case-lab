import { getCharacter, getExhibit, getFact } from '../case';
import { solution } from '../case/solution';
import { decisiveLabCalls, judgeAccusation } from '../game/accuse';
import { pinnedSet, questionCounts, type GameState } from '../game/state';
import type { Ctx } from './context';
import { h } from './dom';

/** Win/lose screen. Only rendered after an accusation was filed. */
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
    h('li', { class: `check ${ok ? 'check--ok' : 'check--bad'}` }, h('span', { class: 'check__mark' }, ok ? 'Holds' : 'Fails'), h('span', { class: 'check__title' }, title), h('span', { class: 'check__detail' }, detail));

  const factText = (id: string | null) => (id ? (getFact(id)?.text ?? id) : 'Neither chosen fact proves it.');

  return h(
    'main',
    { class: 'result', id: 'main' },
    h(
      'article',
      { class: 'result__sheet bag bag--e2', 'aria-labelledby': 'verdict' },
      h('p', { class: 'label' }, 'Case HG-0417. Verdict'),
      h('h1', { class: `result__stamp ${verdict.correct ? 'result__stamp--closed' : 'result__stamp--collapsed'}`, id: 'verdict' }, verdict.correct ? 'Case closed' : 'The case collapsed'),
      h(
        'p',
        { class: 'result__lede' },
        verdict.correct
          ? `You named ${accused.name}, and the evidence holds.`
          : verdict.culpritCorrect
            ? `You named the right person, ${accused.name}, but the evidence you filed does not prove it.`
            : `You named ${accused.name}. The culprit was ${culprit.name}.`,
      ),
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
        h('div', {}, h('dt', {}, 'Answered on device'), h('dd', {}, String(counts.onDevice))),
        h('div', {}, h('dt', {}, 'On the remote line'), h('dd', {}, String(counts.remote))),
        h('div', {}, h('dt', {}, 'Lab requests used'), h('dd', {}, `${used.length} of 3`)),
      ),
      h(
        'section',
        { class: 'result__lab' },
        h('h2', { class: 'label' }, 'Your lab calls'),
        used.length
          ? h(
              'ol',
              { class: 'calls' },
              used.map((c) =>
                h(
                  'li',
                  { class: `call ${decisive.has(c.id) ? 'call--decisive' : ''}` },
                  h('span', { class: 'exhibit__code' }, getExhibit(c.exhibitId).code),
                  h('span', { class: 'call__req' }, `“${c.request}”`),
                  h('span', { class: decisive.has(c.id) ? 'stamp stamp--lab' : 'stamp stamp--claim' }, decisive.has(c.id) ? 'Decisive' : c.findings.length ? 'Not decisive' : 'No finding'),
                ),
              ),
            )
          : h('p', { class: 'empty' }, 'You never used the lab.'),
      ),
      h('section', { class: 'result__story' }, h('h2', { class: 'label' }, 'What happened'), solution.narrative.map((p) => h('p', {}, p))),
      h(
        'div',
        { class: 'result__actions' },
        h('button', { class: 'btn btn--primary btn--xl', type: 'button', onclick: () => ctx.newCase() }, 'New case file'),
      ),
    ),
  );
}
