import { getCharacter, getExhibit } from '../case';
import type { CharacterId, ExhibitId } from '../case/types';
import type { AiEngine, DeviceStatus } from '../ai/engine';
import { parseInterrogation, parseLab } from '../ai/parse';
import { buildInterrogationPrompt, buildLabPrompt, type Exchange } from '../ai/prompts';
import { judgeAccusation, type Verdict } from './accuse';
import { gradeLabReport } from './grading';
import { allowedFactIds, assessPressure } from './pressure';
import {
  addPins,
  clearGame,
  labTokensLeft,
  newGame,
  nextId,
  pinnedSet,
  saveGame,
  type GameState,
  type LabCall,
  type Message,
} from './state';

/** Things the UI needs that are not worth saving. */
export interface Ephemeral {
  busy: Partial<Record<CharacterId, boolean>>;
  device: DeviceStatus | null;
  /** last error worth surfacing (cleared on next action) */
  error: string | null;
}

type Listener = (s: GameState, e: Ephemeral) => void;

export interface ExhibitLoader {
  text(exhibitId: ExhibitId): Promise<string>;
  imageBase64(exhibitId: ExhibitId): Promise<string>;
}

export class Game {
  private state: GameState;
  private eph: Ephemeral = { busy: {}, device: null, error: null };
  private listeners = new Set<Listener>();

  constructor(
    private readonly engine: AiEngine,
    private readonly loader: ExhibitLoader,
    private readonly storage: Storage | null,
    initial: GameState,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.state = initial;
  }

  get snapshot(): GameState {
    return this.state;
  }
  get ephemeral(): Ephemeral {
    return this.eph;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(next: GameState) {
    this.state = next;
    if (this.storage) saveGame(next, this.storage);
    this.emit();
  }
  private patchEph(p: Partial<Ephemeral>) {
    this.eph = { ...this.eph, ...p };
    this.emit();
  }
  private emit() {
    for (const l of this.listeners) l(this.state, this.eph);
  }

  /** Call from the "Open the case" click. */
  open(): Promise<DeviceStatus> {
    const p = this.engine.init((device) => this.patchEph({ device }));
    if (!this.state.started) this.commit({ ...this.state, started: true });
    return p;
  }

  setActive(id: CharacterId) {
    if (this.state.active !== id) this.commit({ ...this.state, active: id });
  }

  historyFor(id: CharacterId): Exchange[] {
    const out: Exchange[] = [];
    const msgs = this.state.messages.filter((m) => m.characterId === id && m.role !== 'notice');
    for (let i = 0; i < msgs.length - 1; i++) {
      const q = msgs[i];
      const a = msgs[i + 1];
      if (q?.role === 'detective' && a?.role === 'character') out.push({ question: q.text, reply: a.text });
    }
    return out;
  }

  async ask(characterId: CharacterId, rawQuestion: string): Promise<void> {
    const question = rawQuestion.replace(/\s+/g, ' ').trim().slice(0, 300);
    if (!question || this.eph.busy[characterId] || this.state.accusation) return;
    const character = getCharacter(characterId);

    const history = this.historyFor(characterId);
    const pinned = pinnedSet(this.state);
    const pressure = assessPressure(character, question, pinned);
    const allowed = allowedFactIds(character, pinned, pressure);
    const prompt = buildInterrogationPrompt({ character, question, history, pinned, pressure });

    let [qid, s] = nextId(this.state, 'm');
    const qMsg: Message = { id: qid, role: 'detective', characterId, text: question, at: this.now() };
    this.commit({ ...s, messages: [...s.messages, qMsg] });
    this.patchEph({ busy: { ...this.eph.busy, [characterId]: true }, error: null });

    try {
      const res = await this.engine.interrogate({
        character,
        question,
        prompt,
        allowedFactIds: allowed,
        pressure: pressure ? { status: pressure.status, pressureId: pressure.pressure.id } : null,
        turn: history.length,
      });
      const parsed = parseInterrogation(res.raw, character, allowed);
      let revealed = parsed.revealed;
      let mood = parsed.mood;
      // Code decided the crack: its admissions are pinned even if the model forgot to list them.
      if (pressure?.status === 'applied') {
        revealed = [...new Set([...revealed, ...pressure.pressure.reveals.map((f) => f.id)])];
        if (parsed.ok) mood = 'cracked';
      }
      if (!parsed.ok) revealed = pressure?.status === 'applied' ? revealed : [];
      let aid: string;
      [aid, s] = nextId(this.state, 'm');
      const aMsg: Message = {
        id: aid,
        role: 'character',
        characterId,
        text: parsed.ok || pressure?.status !== 'applied' ? parsed.reply : pressure.pressure.reveals.map((f) => f.says).join(' '),
        at: this.now(),
        mood: pressure?.status === 'applied' ? 'cracked' : mood,
        route: res.route,
        ms: res.ms,
        revealed,
        ...(pressure ? { pressure: pressure.status } : {}),
        ...(parsed.ok ? {} : { fallback: true }),
      };
      s = addPins({ ...s, messages: [...s.messages, aMsg] }, revealed, aid, this.now());
      this.commit(s);
    } catch (e) {
      let nid: string;
      [nid, s] = nextId(this.state, 'm');
      const notice: Message = {
        id: nid,
        role: 'notice',
        characterId,
        text: 'The line dropped before an answer came back. Ask again.',
        at: this.now(),
      };
      this.commit({ ...s, messages: [...s.messages, notice] });
      this.patchEph({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      this.patchEph({ busy: { ...this.eph.busy, [characterId]: false } });
    }
  }

  get labBusy(): boolean {
    return this.state.labCalls.some((c) => c.status === 'working');
  }

  async requestLab(exhibitId: ExhibitId, rawRequest: string): Promise<LabCall | null> {
    const request = rawRequest.replace(/\s+/g, ' ').trim().slice(0, 600);
    if (!request || labTokensLeft(this.state) <= 0 || this.labBusy || this.state.accusation) return null;
    const exhibit = getExhibit(exhibitId);

    let [cid, s] = nextId(this.state, 'lab');
    const call: LabCall = { id: cid, exhibitId, request, status: 'working', at: this.now(), findings: [], summary: '' };
    this.commit({ ...s, labCalls: [...s.labCalls, call] });
    this.patchEph({ error: null });

    const finish = (patch: Partial<LabCall>, pins: string[] = []) => {
      const calls = this.state.labCalls.map((c) => (c.id === cid ? { ...c, ...patch } : c));
      this.commit(addPins({ ...this.state, labCalls: calls }, pins, cid, this.now()));
      return this.state.labCalls.find((c) => c.id === cid) ?? null;
    };

    try {
      const isImage = exhibit.kind === 'image';
      const content = isImage ? undefined : await this.loader.text(exhibitId);
      const image = isImage ? { mimeType: exhibit.mimeType, base64: await this.loader.imageBase64(exhibitId) } : undefined;
      const prompt = buildLabPrompt({ exhibit, request, content });
      const res = await this.engine.lab({ exhibit, request, prompt, image });
      const graded = gradeLabReport(exhibit, request, parseLab(res.raw, exhibit));
      return finish(
        { status: 'done', findings: graded.findings, summary: graded.summary, ms: res.ms, ...(graded.fallback ? { fallback: true } : {}) },
        graded.findings.map((f) => f.factId),
      );
    } catch (e) {
      this.patchEph({ error: e instanceof Error ? e.message : String(e) });
      return finish({ status: 'failed', summary: 'The lab could not be reached. The seal was returned; nothing was spent.' });
    }
  }

  accuse(suspect: CharacterId, factIds: [string, string]): Verdict {
    const verdict = judgeAccusation({ suspect, factIds }, pinnedSet(this.state));
    this.commit({ ...this.state, accusation: { suspect, factIds, correct: verdict.correct, at: this.now() } });
    return verdict;
  }

  reset() {
    if (this.storage) clearGame(this.storage);
    this.eph = { ...this.eph, busy: {}, error: null };
    this.commit({ ...newGame(), started: true });
  }
}
