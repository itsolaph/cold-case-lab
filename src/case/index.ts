import { characters } from './characters';
import { exhibits } from './exhibits';
import type { CaseFile, Character, CharacterId, Exhibit, ExhibitId, Fact } from './types';

export * from './types';

export const caseFile: CaseFile = {
  id: 'ashfall-accession',
  number: 'HG-0417',
  title: 'The Ashfall Accession',
  premise: [
    'Overnight, the last viable seeds of the Ashfall lily vanished from the seed vault of a small research greenhouse.',
    'Four people were in or near the building. You have their records, their answers, and three lab requests.',
  ],
  publicContext:
    'Halden Glasshouse Station is a small botanical research greenhouse. On the night of 14 to 15 March, accession AL-07, the last viable seed lot of the Ashfall lily, disappeared from the cryo-freezer in seed vault V2. ' +
    'The building has an east side (main gate, guard booth, prep room, potting houses) and a west wing (seed labs, vault V2, loading bay).',
  characters,
  exhibits,
};

export function getCharacter(id: CharacterId): Character {
  const c = characters.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown character ${id}`);
  return c;
}

export function getExhibit(id: ExhibitId): Exhibit {
  const e = exhibits.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown exhibit ${id}`);
  return e;
}

export type FactSource =
  | { kind: 'interrogation'; characterId: CharacterId; label: 'open' | 'claim' | 'admission' }
  | { kind: 'lab'; exhibitId: ExhibitId };

export interface IndexedFact {
  id: string;
  text: string;
  source: FactSource;
}

/** Every fact in the case, keyed by id, with where it comes from. */
export const factIndex: ReadonlyMap<string, IndexedFact> = (() => {
  const map = new Map<string, IndexedFact>();
  const add = (f: Pick<Fact, 'id' | 'text'>, source: FactSource) => {
    if (map.has(f.id)) throw new Error(`Duplicate fact id ${f.id}`);
    map.set(f.id, { id: f.id, text: f.text, source });
  };
  for (const c of characters) {
    for (const f of c.open) add(f, { kind: 'interrogation', characterId: c.id, label: 'open' });
    for (const f of c.claims) add(f, { kind: 'interrogation', characterId: c.id, label: 'claim' });
    for (const p of c.pressures) for (const f of p.reveals) add(f, { kind: 'interrogation', characterId: c.id, label: 'admission' });
  }
  for (const e of exhibits) for (const t of e.truths) add(t, { kind: 'lab', exhibitId: e.id });
  return map;
})();

export function getFact(id: string): IndexedFact | undefined {
  return factIndex.get(id);
}
