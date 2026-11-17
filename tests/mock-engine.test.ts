import { describe, expect, it } from 'vitest';
import { getCharacter, getExhibit } from '../src/case';
import { LATENCY, MockEngine, latencyFor } from '../src/ai/mock-engine';
import type { DeviceStatus, InterrogationRequest } from '../src/ai/engine';
import { routeText } from '../src/ui/format';
import { instantMock } from './helpers';

const req = (over: Partial<InterrogationRequest> = {}): InterrogationRequest => {
  const character = getCharacter('mara');
  return {
    character,
    question: 'What is your shift?',
    prompt: '(prompt)',
    allowedFactIds: [...character.open, ...character.claims].map((f) => f.id),
    pressure: null,
    turn: 0,
    ...over,
  };
};

describe('demo engine routing labels', () => {
  it('answers interrogations ON DEVICE when Nano is simulated, within 300-700 ms', async () => {
    const r = await instantMock(true).interrogate(req());
    expect(r.route).toBe('on-device');
    expect(r.ms).toBeGreaterThanOrEqual(LATENCY.onDevice[0]);
    expect(r.ms).toBeLessThanOrEqual(LATENCY.onDevice[1]);
    expect(routeText(r.route, r.ms)).toMatch(/^ON DEVICE · \d{3} ms$/);
  });

  it('puts suspects on the REMOTE LINE when Nano is unavailable', async () => {
    const e = instantMock(false);
    const statuses: DeviceStatus[] = [];
    expect(await e.init((s) => statuses.push(s))).toMatchObject({ state: 'unavailable' });
    const r = await e.interrogate(req());
    expect(r.route).toBe('remote-line');
    expect(r.ms).toBeGreaterThanOrEqual(LATENCY.remoteLine[0]);
    expect(routeText(r.route, r.ms)).toMatch(/^REMOTE LINE · \d\.\d s$/);
  });

  it('runs lab requests in the CLOUD LAB within 4-7 s', async () => {
    const r = await instantMock().lab({ exhibit: getExhibit('receipt'), request: 'What was rented?', prompt: '' });
    expect(r.route).toBe('cloud-lab');
    expect(r.ms).toBeGreaterThanOrEqual(4000);
    expect(r.ms).toBeLessThanOrEqual(7000);
    expect(routeText(r.route, r.ms)).toMatch(/^CLOUD LAB · [4-7]\.\d s$/);
  });

  it('reports simulated download progress, then ready', async () => {
    const statuses: DeviceStatus[] = [];
    const final = await instantMock(true).init((s) => statuses.push(s));
    expect(final).toEqual({ state: 'ready' });
    expect(statuses.some((s) => s.state === 'downloading')).toBe(true);
  });

  it('is labelled as a demo engine, not Gemini', () => {
    const e = new MockEngine();
    expect(e.kind).toBe('mock');
    expect(e.label.toLowerCase()).toContain('demo');
    expect(e.label.toLowerCase()).not.toContain('gemini');
  });

  it('is deterministic', async () => {
    const a = await instantMock().interrogate(req({ question: 'Who can open the vault?' }));
    const b = await instantMock().interrogate(req({ question: 'Who can open the vault?' }));
    expect(a).toEqual(b);
    expect(latencyFor('x', 10, 20)).toBe(latencyFor('x', 10, 20));
  });
});

describe('demo engine performance', () => {
  it('answers from the fact sheet and reports what it revealed', async () => {
    const r = JSON.parse((await instantMock().interrogate(req({ question: 'Who can open the vault? Is there an override PIN?' }))).raw);
    expect(r.revealed).toContain('m_override');
    expect(r.reply).toContain('override PIN');
  });

  it('cracks only when pressure is applied, and stays evasive on a bluff', async () => {
    const c = getCharacter('felix');
    const pressureId = c.pressures[0]!.id;
    const bluff = JSON.parse((await instantMock().interrogate(req({ character: c, question: 'Your badge?', pressure: { status: 'bluff', pressureId } }))).raw);
    expect(bluff.revealed).toEqual([]);
    expect(['evasive', 'rattled']).toContain(bluff.mood);
    const crack = JSON.parse((await instantMock().interrogate(req({ character: c, question: 'Your badge?', pressure: { status: 'applied', pressureId } }))).raw);
    expect(crack.mood).toBe('cracked');
    expect(crack.revealed).toEqual(['f_crack_badge']);
  });

  it('never reveals facts outside the allowed list', async () => {
    const r = JSON.parse((await instantMock().interrogate(req({ question: 'What is your shift?', allowedFactIds: [] }))).raw);
    expect(r.revealed).toEqual([]);
  });

  it('returns JSON wrapped in prose for the lab, like a real model', async () => {
    const r = await instantMock().lab({ exhibit: getExhibit('receipt'), request: 'What was rented?', prompt: '' });
    expect(r.raw.startsWith('Lab report follows.')).toBe(true);
  });
});
