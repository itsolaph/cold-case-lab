import { describe, expect, it } from 'vitest';
import { getExhibit } from '../src/case';
import { gradeLabReport, keywordFindings } from '../src/game/grading';
import type { ParsedLab } from '../src/ai/parse';

const phone = getExhibit('phone-log');
const badge = getExhibit('badge-log');
const receipt = getExhibit('receipt');
const statement = getExhibit('statement');
const ids = (fs: { factId: string }[]) => fs.map((f) => f.factId);

describe('keyword grading: a vague request gets a vague report', () => {
  it.each([
    ['phone-log', 'Anything suspicious in here?'],
    ['phone-log', 'Analyse this exhibit thoroughly.'],
    ['badge-log', 'Check the log for anomalies.'],
    ['receipt', 'Examine this receipt.'],
    ['statement', 'Is there anything useful in this statement?'],
  ] as const)('%s: "%s" yields no findings', (id, req) => {
    expect(keywordFindings(getExhibit(id), req)).toEqual([]);
  });

  it('a precise phone request about Quill\'s location finds the cell sector', () => {
    expect(ids(keywordFindings(phone, "Which cell sector was Mara Quill's handset on between 01:45 and 02:40?"))).toEqual(['lab_phone_cell']);
  });

  it('a precise badge request about the vault entry finds the override', () => {
    expect(ids(keywordFindings(badge, 'How was vault V2 opened at 02:14? Check the auth mode.'))).toContain('lab_badge_override');
  });

  it('a precise receipt request finds the dry shipper', () => {
    expect(ids(keywordFindings(receipt, 'What item was rented on this receipt?'))).toEqual(['lab_receipt_shipper']);
  });

  it('a multi-part request can earn several findings', () => {
    const r = ids(keywordFindings(phone, 'Where were all handsets between 01:30 and 03:00, and did the guard make any long call?'));
    expect(r).toEqual(expect.arrayContaining(['lab_phone_cell', 'lab_phone_guard_call', 'lab_phone_courier_left', 'lab_phone_arden_home']));
  });

  it('the red herring statement never yields a solution fact', () => {
    const r = ids(keywordFindings(statement, 'Is the courier timeline consistent, and is the 02:00 round account credible compared with the others?'));
    expect(r).toEqual(['lab_statement_courier', 'lab_statement_round']);
  });
});

describe('model + keyword grading', () => {
  const ok = (findings: { factId: string; text: string }[], summary = 'Report.'): ParsedLab => ({ ok: true, findings, summary });

  it('drops model findings the request never touched (lenient model)', () => {
    const everything = phone.truths.map((t) => ({ factId: t.id, text: t.text }));
    const r = gradeLabReport(phone, 'Anything suspicious?', ok(everything));
    expect(r.findings).toEqual([]);
    expect(r.summary).toBe(phone.vagueSummary);
  });

  it('keeps model findings the request partly asked about', () => {
    const r = gradeLabReport(phone, "Check Mara Quill's phone records.", ok([{ factId: 'lab_phone_cell', text: 'west sector' }]));
    expect(ids(r.findings)).toEqual(['lab_phone_cell']);
    expect(r.findings[0]?.text).toBe('west sector');
  });

  it('adds keyword-matched truths a stingy model left out, with a summary that fits', () => {
    const r = gradeLabReport(phone, "Which cell sector was Quill's handset on at 02:14?", ok([], 'Nothing to report.'));
    expect(ids(r.findings)).toEqual(['lab_phone_cell']);
    expect(r.summary).toMatch(/1 finding certified/);
    expect(r.fallback).toBe(false);
  });

  it('falls back to keyword grading when the model output is unusable', () => {
    const r = gradeLabReport(receipt, 'What was rented, and when was it issued?', { ok: false, findings: [], summary: '' });
    expect(ids(r.findings)).toEqual(['lab_receipt_shipper', 'lab_receipt_time']);
    expect(r.fallback).toBe(true);
  });

  it('a vague request with unusable model output gets the vague summary', () => {
    const r = gradeLabReport(badge, 'look at it', { ok: false, findings: [], summary: '' });
    expect(r.findings).toEqual([]);
    expect(r.summary).toBe(badge.vagueSummary);
  });
});
