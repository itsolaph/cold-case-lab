import type { Exhibit } from '../case/types';
import type { LabFinding, ParsedLab } from '../ai/parse';
import { ruleMatches, ruleScore } from './keywords';

/**
 * Lab grading: a vague request gets a vague report.
 *
 * The model judges which truths the request asked about; the keyword rules back it up:
 * - a model finding is kept only if the request touches its subject at all (>= 1 keyword group),
 *   so a lenient model cannot hand out everything for "anything suspicious?";
 * - a truth whose keyword rule fully matches is always reported, so a stingy or broken
 *   model cannot rob a precise request.
 */

export function keywordFindings(exhibit: Exhibit, request: string): LabFinding[] {
  return exhibit.truths.filter((t) => ruleMatches(request, t.asks)).map((t) => ({ factId: t.id, text: t.text }));
}

export interface GradedReport {
  findings: LabFinding[];
  summary: string;
  /** true when the model output was unusable and the keyword grader wrote the report. */
  fallback: boolean;
}

export function gradeLabReport(exhibit: Exhibit, request: string, parsed: ParsedLab): GradedReport {
  const byKeyword = keywordFindings(exhibit, request);
  if (!parsed.ok) {
    return {
      findings: byKeyword,
      summary: byKeyword.length
        ? `Report reconstructed from the analyst's bench notes for ${exhibit.code}. ${byKeyword.length} finding${byKeyword.length > 1 ? 's' : ''} certified.`
        : exhibit.vagueSummary,
      fallback: true,
    };
  }
  const truths = new Map(exhibit.truths.map((t) => [t.id, t]));
  const kept = parsed.findings.filter((f) => {
    const t = truths.get(f.factId);
    return t ? ruleScore(request, t.asks) >= 1 : false;
  });
  const keptIds = new Set(kept.map((f) => f.factId));
  const findings = [...kept, ...byKeyword.filter((f) => !keptIds.has(f.factId))];
  // keep authored order so reports read consistently
  const order = exhibit.truths.map((t) => t.id);
  findings.sort((a, b) => order.indexOf(a.factId) - order.indexOf(b.factId));
  // A model summary written for zero findings would contradict keyword-added findings.
  // A summary written for findings that were all dropped would overclaim too.
  const modelSummaryFits = parsed.summary && (kept.length > 0 || (findings.length === 0 && parsed.findings.length === 0));
  const summary = modelSummaryFits
    ? parsed.summary
    : findings.length
      ? `Examination of ${exhibit.code} against the request. ${findings.length} finding${findings.length > 1 ? 's' : ''} certified.`
      : exhibit.vagueSummary;
  return { findings, summary, fallback: false };
}
