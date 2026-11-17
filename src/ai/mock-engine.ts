import type { Fact, TopicFact } from '../case/types';
import { keywordFindings } from '../game/grading';
import { ruleMatches } from '../game/keywords';
import type { AiEngine, DeviceStatus, EngineResult, InterrogationRequest, LabRequest, Route } from './engine';

/**
 * Demo engine: a deterministic stand-in for Gemini so the whole game runs where no
 * model is available (CI, a VPS without a GPU, a browser without Gemini Nano).
 * It answers from the authored fact sheets with realistic latencies and is labelled
 * "demo engine" everywhere in the UI. It is not a language model and never claims to be.
 *
 * It returns raw JSON text exactly like a model would, so the same hardened parsers run.
 */

export interface MockOptions {
  /** Simulate a browser with Gemini Nano available. Default true. */
  onDevice?: boolean;
  /** Divide all latencies by this factor (tests). Default 1. */
  speed?: number;
  /** Override the sleep function (tests). */
  sleep?: (ms: number) => Promise<void>;
}

/** FNV-1a: stable pseudo-randomness from the request text. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic latency in [min, max] ms for a given text. */
export function latencyFor(text: string, min: number, max: number): number {
  return min + (hash(text) % (max - min + 1));
}

export const LATENCY = {
  onDevice: [300, 700],
  remoteLine: [1800, 2600],
  cloudLab: [4000, 7000],
} as const;

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MockEngine implements AiEngine {
  readonly kind = 'mock' as const;
  readonly label = 'Demo engine';
  private readonly onDevice: boolean;
  private readonly speed: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: MockOptions = {}) {
    this.onDevice = opts.onDevice ?? true;
    this.speed = Math.max(1, opts.speed ?? 1);
    this.sleep = opts.sleep ?? defaultSleep;
  }

  get interrogationRoute(): Route {
    return this.onDevice ? 'on-device' : 'remote-line';
  }

  async init(onStatus: (s: DeviceStatus) => void): Promise<DeviceStatus> {
    if (!this.onDevice) {
      const s: DeviceStatus = { state: 'unavailable', reason: 'Demo engine is simulating a browser without an on-device model.' };
      onStatus(s);
      return s;
    }
    // A short simulated "download" so the progress UI is exercised.
    for (let p = 0; p <= 1.0001; p += 0.2) {
      onStatus({ state: 'downloading', progress: Math.min(1, p) });
      await this.sleep(180 / this.speed);
    }
    const ready: DeviceStatus = { state: 'ready' };
    onStatus(ready);
    return ready;
  }

  async interrogate(req: InterrogationRequest): Promise<EngineResult> {
    const route = this.interrogationRoute;
    const [min, max] = route === 'on-device' ? LATENCY.onDevice : LATENCY.remoteLine;
    const ms = latencyFor(`${req.character.id}|${req.question}|${req.turn}`, min, max);
    await this.sleep(ms / this.speed);
    return { raw: JSON.stringify(performTurn(req)), route, ms };
  }

  async lab(req: LabRequest): Promise<EngineResult> {
    const [min, max] = LATENCY.cloudLab;
    const ms = latencyFor(`${req.exhibit.id}|${req.request}`, min, max);
    await this.sleep(ms / this.speed);
    const findings = keywordFindings(req.exhibit, req.request);
    const summary = findings.length
      ? `Examination of ${req.exhibit.code} (${req.exhibit.title.toLowerCase()}) against the request. ${findings.length} finding${findings.length > 1 ? 's' : ''} certified; nothing outside the request was examined.`
      : req.exhibit.vagueSummary;
    // Wrapped in a little prose on purpose: real models do this too.
    return { raw: `Lab report follows.\n${JSON.stringify({ findings, summary })}`, route: 'cloud-lab', ms };
  }
}

/** The scripted performance: which authored lines answer this question. */
export function performTurn(req: InterrogationRequest): { reply: string; mood: string; revealed: string[] } {
  const c = req.character;
  const allowed = new Set(req.allowedFactIds);

  if (req.pressure?.status === 'applied') {
    const p = c.pressures.find((x) => x.id === req.pressure?.pressureId);
    if (p) return { reply: p.reveals.map((f) => f.says).join(' '), mood: 'cracked', revealed: p.reveals.map((f) => f.id) };
  }
  if (req.pressure?.status === 'bluff') {
    const p = c.pressures.find((x) => x.id === req.pressure?.pressureId);
    if (p) return { reply: p.bluffLine, mood: req.turn % 2 ? 'rattled' : 'evasive', revealed: [] };
  }

  const topical: TopicFact[] = [...c.claims, ...c.open].filter((f) => allowed.has(f.id) && ruleMatches(req.question, f.topic));
  // Admissions already earned can be repeated if the question returns to them.
  const admitted: Fact[] = c.pressures
    .flatMap((p) => p.reveals)
    .filter((f) => allowed.has(f.id) && ruleMatches(req.question, [f.text.toLowerCase().split(/\W+/).filter((w) => w.length > 6).slice(0, 6)]));

  const picked = [...topical, ...admitted].slice(0, 2);
  if (picked.length) {
    const hasClaim = picked.some((f) => c.claims.some((x) => x.id === f.id));
    return { reply: picked.map((f) => f.says).join(' '), mood: hasClaim ? 'evasive' : 'calm', revealed: picked.map((f) => f.id) };
  }
  return { reply: c.deflections[req.turn % c.deflections.length] ?? c.fallback, mood: 'evasive', revealed: [] };
}
