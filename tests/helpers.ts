import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ExhibitId } from '../src/case/types';
import { getExhibit } from '../src/case';
import type { ExhibitLoader } from '../src/game/controller';
import { MockEngine } from '../src/ai/mock-engine';

export class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
}

/** Reads the real exhibit files from public/. */
export const fileLoader: ExhibitLoader = {
  async text(id: ExhibitId) {
    return readFileSync(join(process.cwd(), 'public', getExhibit(id).file), 'utf8');
  },
  async imageBase64(id: ExhibitId) {
    return readFileSync(join(process.cwd(), 'public', getExhibit(id).file)).toString('base64');
  },
};

export const instantMock = (onDevice = true) => new MockEngine({ onDevice, sleep: async () => undefined });
