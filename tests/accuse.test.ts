import { describe, expect, it } from 'vitest';
import { AccusationError, decisiveLabCalls, judgeAccusation } from '../src/game/accuse';
import { solution } from '../src/case/solution';
import type { LabCall } from '../src/game/state';

const all = new Set(['lab_badge_override', 'lab_receipt_shipper', 'lab_phone_cell', 'f_crack_badge', 'lab_statement_courier', 'm_crack_west']);

describe('judgeAccusation', () => {
  it('accepts the culprit with one means fact and one opportunity fact, in either order', () => {
    expect(judgeAccusation({ suspect: 'mara', factIds: ['lab_badge_override', 'lab_phone_cell'] }, all).correct).toBe(true);
    expect(judgeAccusation({ suspect: 'mara', factIds: ['lab_phone_cell', 'lab_receipt_shipper'] }, all).correct).toBe(true);
  });

  it('rejects the wrong suspect even with the right facts', () => {
    const v = judgeAccusation({ suspect: 'felix', factIds: ['lab_badge_override', 'lab_phone_cell'] }, all);
    expect(v).toMatchObject({ correct: false, culpritCorrect: false, meansFact: 'lab_badge_override', opportunityFact: 'lab_phone_cell' });
  });

  it('rejects two means facts (no opportunity)', () => {
    const v = judgeAccusation({ suspect: 'mara', factIds: ['lab_badge_override', 'lab_receipt_shipper'] }, all);
    expect(v.correct).toBe(false);
    expect(v.opportunityFact).toBeNull();
    expect(v.meansFact).not.toBeNull();
  });

  it('a confession is not accepted as proof of opportunity', () => {
    const v = judgeAccusation({ suspect: 'mara', factIds: ['lab_badge_override', 'm_crack_west'] }, all);
    expect(v.correct).toBe(false);
  });

  it('rejects red-herring facts', () => {
    expect(judgeAccusation({ suspect: 'mara', factIds: ['lab_statement_courier', 'f_crack_badge'] }, all)).toMatchObject({
      correct: false,
      meansFact: null,
      opportunityFact: null,
    });
  });

  it('requires two different, pinned facts', () => {
    expect(() => judgeAccusation({ suspect: 'mara', factIds: ['lab_phone_cell', 'lab_phone_cell'] }, all)).toThrow(AccusationError);
    expect(() => judgeAccusation({ suspect: 'mara', factIds: ['lab_phone_cell', 'lab_badge_override'] }, new Set(['lab_phone_cell']))).toThrow(
      AccusationError,
    );
  });

  it('every solution fact is a lab finding, so at least two lab calls are needed', () => {
    for (const id of [...solution.means, ...solution.opportunity]) expect(id.startsWith('lab_')).toBe(true);
    const meansExhibits = new Set(solution.means.map((id) => id.split('_')[1]));
    const oppExhibits = new Set(solution.opportunity.map((id) => id.split('_')[1]));
    for (const e of oppExhibits) expect(meansExhibits.has(e as string)).toBe(false);
  });
});

describe('decisiveLabCalls', () => {
  const call = (id: string, factIds: string[], status: LabCall['status'] = 'done'): LabCall => ({
    id,
    exhibitId: 'phone-log',
    request: 'r',
    status,
    at: 0,
    summary: '',
    findings: factIds.map((factId) => ({ factId, text: '' })),
  });
  it('marks calls that certified a means or opportunity fact', () => {
    const calls = [call('a', ['lab_phone_cell']), call('b', ['lab_statement_courier']), call('c', []), call('d', ['lab_badge_override'], 'failed')];
    expect(decisiveLabCalls(calls)).toEqual(['a']);
  });
});
