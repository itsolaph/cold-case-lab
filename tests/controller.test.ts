import { describe, expect, it } from 'vitest';
import { Game } from '../src/game/controller';
import { labTokensLeft, loadGame, newGame, pinnedSet } from '../src/game/state';
import type { AiEngine } from '../src/ai/engine';
import { MemoryStorage, fileLoader, instantMock } from './helpers';

const makeGame = (engine: AiEngine = instantMock(), storage = new MemoryStorage()) => new Game(engine, fileLoader, storage, newGame(), () => 1000);

describe('the intended solve path, end to end through the controller (demo engine)', () => {
  it('reaches a correct accusation with two lab calls and pressure', async () => {
    const storage = new MemoryStorage();
    const g = makeGame(instantMock(), storage);
    await g.open();

    await g.ask('mara', 'Where were you between 01:45 and 02:40?');
    await g.ask('mara', 'Who can open the vault? Is there an override PIN?');
    expect(pinnedSet(g.snapshot)).toEqual(new Set(['m_claims_east', 'm_override']));

    // Bluff: naming the badge without evidence does not crack Arden.
    await g.ask('felix', 'Did you badge out with your card?');
    const bluff = g.snapshot.messages.at(-1)!;
    expect(bluff.pressure).toBe('bluff');
    expect(pinnedSet(g.snapshot).has('f_crack_badge')).toBe(false);

    const lab1 = await g.requestLab('badge-log', "How was vault V2 opened at 02:14? Check the auth mode, and whether Arden's card 0193 ever left the building.");
    expect(lab1?.findings.map((f) => f.factId)).toEqual(['lab_badge_override', 'lab_badge_card_inside']);
    expect(labTokensLeft(g.snapshot)).toBe(2);

    await g.ask('felix', 'Your card 0193 never left the building and opened the vault at 02:14. Where was your badge?');
    const crack = g.snapshot.messages.at(-1)!;
    expect(crack.pressure).toBe('applied');
    expect(crack.mood).toBe('cracked');
    expect(pinnedSet(g.snapshot).has('f_crack_badge')).toBe(true);

    const lab2 = await g.requestLab('phone-log', "Which cell sector was Mara Quill's handset on between 01:45 and 02:40? Did the guard desk handset make any long call?");
    expect(lab2?.findings.map((f) => f.factId)).toEqual(['lab_phone_cell', 'lab_phone_guard_call']);

    await g.ask('mara', 'Your handset was on the west sector, by the vault, at 02:14.');
    expect(pinnedSet(g.snapshot).has('m_crack_west')).toBe(true);

    const verdict = g.accuse('mara', ['lab_badge_override', 'lab_phone_cell']);
    expect(verdict.correct).toBe(true);
    expect(g.snapshot.accusation?.correct).toBe(true);

    // After the case closes, no more questions or lab calls.
    await g.ask('mara', 'One more thing');
    expect(await g.requestLab('receipt', 'What was rented?')).toBeNull();

    // Persisted.
    expect(loadGame(storage)?.accusation?.suspect).toBe('mara');
  });

  it('a wrong accusation is recorded as wrong', async () => {
    const g = makeGame();
    await g.requestLab('badge-log', 'How was vault V2 opened at 02:14? Which auth mode?');
    await g.requestLab('statement', 'Is the courier timeline consistent?');
    const v = g.accuse('felix', ['lab_badge_override', 'lab_statement_courier']);
    expect(v.correct).toBe(false);
    expect(v.culpritCorrect).toBe(false);
  });

  it('allows exactly three lab requests', async () => {
    const g = makeGame();
    for (let i = 0; i < 3; i++) expect(await g.requestLab('receipt', `What was rented? (${i})`)).not.toBeNull();
    expect(labTokensLeft(g.snapshot)).toBe(0);
    expect(await g.requestLab('receipt', 'What was rented?')).toBeNull();
    expect(g.snapshot.labCalls).toHaveLength(3);
  });

  it('routes interrogation to the remote line when there is no on-device model', async () => {
    const g = makeGame(instantMock(false));
    const status = await g.open();
    expect(status.state).toBe('unavailable');
    await g.ask('ruth', 'What are your rounds?');
    expect(g.snapshot.messages.at(-1)?.route).toBe('remote-line');
  });
});

describe('failure handling', () => {
  const failing = (what: 'interrogate' | 'lab'): AiEngine => {
    const base = instantMock();
    return {
      kind: 'mock',
      label: 'Demo engine',
      init: (cb) => base.init(cb),
      interrogate: what === 'interrogate' ? async () => Promise.reject(new Error('network down')) : (r) => base.interrogate(r),
      lab: what === 'lab' ? async () => Promise.reject(new Error('quota')) : (r) => base.lab(r),
    };
  };

  it('an interrogation error leaves a notice and does not crash', async () => {
    const g = makeGame(failing('interrogate'));
    await g.ask('mara', 'Hello?');
    expect(g.snapshot.messages.at(-1)).toMatchObject({ role: 'notice' });
    expect(g.ephemeral.error).toBe('network down');
    expect(g.ephemeral.busy.mara).toBe(false);
  });

  it('a lab error returns the seal', async () => {
    const g = makeGame(failing('lab'));
    const call = await g.requestLab('receipt', 'What was rented?');
    expect(call?.status).toBe('failed');
    expect(labTokensLeft(g.snapshot)).toBe(3);
  });

  it('garbage model output gives an in-character fallback, but a code-decided crack still pins', async () => {
    const base = instantMock();
    const garbage: AiEngine = { ...base, kind: 'mock', label: 'x', init: (cb) => base.init(cb), lab: (r) => base.lab(r), interrogate: async () => ({ raw: 'I am a language model and cannot', route: 'on-device', ms: 400 }) };
    const g = makeGame(garbage);
    await g.ask('ruth', 'What are your rounds?');
    const m = g.snapshot.messages.at(-1)!;
    expect(m.fallback).toBe(true);
    expect(m.text).toBe("I'm sorry, could you repeat the question?");
    expect(g.snapshot.pins).toEqual([]);
  });
});
