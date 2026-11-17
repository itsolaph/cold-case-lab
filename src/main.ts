import './styles/base.css';
import './styles/app.css';
import { getExhibit } from './case';
import type { ExhibitId } from './case/types';
import { selectEngine } from './ai/select';
import { Game, type ExhibitLoader } from './game/controller';
import { loadGame, newGame } from './game/state';
import { GameScreen, renderResult } from './ui/app';
import { loadUi, saveUi, type Ctx, type UiState } from './ui/context';
import { renderTitle } from './ui/title';

function createLoader(): ExhibitLoader {
  const texts = new Map<ExhibitId, Promise<string>>();
  const images = new Map<ExhibitId, Promise<string>>();
  const url = (id: ExhibitId) => `${import.meta.env.BASE_URL}${getExhibit(id).file}`;
  const get = async (id: ExhibitId) => {
    const res = await fetch(url(id));
    if (!res.ok) throw new Error(`Exhibit ${id} could not be loaded (${res.status}).`);
    return res;
  };
  return {
    text(id) {
      let p = texts.get(id);
      if (!p) {
        p = get(id).then((r) => r.text());
        p.catch(() => texts.delete(id));
        texts.set(id, p);
      }
      return p;
    },
    imageBase64(id) {
      let p = images.get(id);
      if (!p) {
        p = get(id)
          .then((r) => r.arrayBuffer())
          .then((buf) => {
            const bytes = new Uint8Array(buf);
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            return btoa(bin);
          });
        p.catch(() => images.delete(id));
        images.set(id, p);
      }
      return p;
    },
  };
}

async function main() {
  const root = document.getElementById('root');
  if (!root) return;
  const { engine, reason } = await selectEngine();
  const demo = engine.kind === 'mock';
  document.documentElement.dataset.engine = engine.kind;
  const loader = createLoader();
  const saved = loadGame(localStorage);
  const game = new Game(engine, loader, localStorage, saved ?? newGame());

  let screen: GameScreen | null = null;
  let mode: 'title' | 'game' | 'result' = 'title';
  const ui: UiState = loadUi();

  const ctx: Ctx = {
    game,
    engine,
    demo,
    engineReason: reason,
    ui,
    setUi(patch) {
      Object.assign(ui, patch);
      saveUi(ui);
      if (screen && mode === 'game') screen.update(game.snapshot, game.ephemeral);
      if (patch.tab || patch.view) window.scrollTo({ top: 0, behavior: 'instant' });
    },
    openAccuse() {
      screen?.openAccuse(() => showResult());
    },
    newCase() {
      game.reset();
      Object.assign(ui, { view: 'room', tab: 'room', drafts: {} } satisfies Partial<UiState>);
      saveUi(ui);
      screen = null;
      showGame();
    },
  };

  const showResult = () => {
    mode = 'result';
    root.replaceChildren(renderResult(ctx, game.snapshot));
    window.scrollTo({ top: 0, behavior: 'instant' });
    root.querySelector<HTMLElement>('h1')?.focus();
  };

  const showGame = () => {
    if (game.snapshot.accusation) return showResult();
    mode = 'game';
    if (!screen) {
      screen = new GameScreen(ctx, loader);
      screen.prime(game.snapshot);
    }
    root.replaceChildren(screen.el);
    screen.update(game.snapshot, game.ephemeral);
  };

  game.subscribe((s, e) => {
    if (mode !== 'game' || !screen) return;
    if (s.accusation) return showResult();
    screen.update(s, e);
  });

  renderTitle(root, {
    demo,
    engineReason: reason,
    hasSave: !!saved && (saved.messages.length > 0 || saved.labCalls.length > 0 || !!saved.accusation),
    onOpen: () => game.open(),
    onNew: () => {
      game.reset();
      Object.assign(ui, { view: 'room', tab: 'room', drafts: {} } satisfies Partial<UiState>);
      saveUi(ui);
    },
    onEnter: () => showGame(),
  });
}

void main();
