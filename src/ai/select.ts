import { readFirebaseSettings } from './config';
import type { AiEngine } from './engine';
import { MockEngine } from './mock-engine';

export interface Selected {
  engine: AiEngine;
  /** Why this engine was chosen, shown in the UI for the demo engine. */
  reason: string;
}

/**
 * Engine selection:
 * - `?engine=mock` forces the demo engine;
 * - otherwise Firebase AI Logic when the VITE_FIREBASE_* config is complete;
 * - otherwise the demo engine.
 * Demo-only switches: `?nano=0` simulates a browser without Gemini Nano, `?speed=N` divides latencies.
 */
export async function selectEngine(search: string = location.search): Promise<Selected> {
  const params = new URLSearchParams(search);
  const demo = () =>
    new MockEngine({
      onDevice: params.get('nano') !== '0',
      speed: Number(params.get('speed')) || 1,
    });

  if (params.get('engine') === 'mock') {
    return { engine: demo(), reason: 'Demo engine selected in the URL.' };
  }
  const settings = readFirebaseSettings();
  if (!settings) {
    return { engine: demo(), reason: 'No Firebase config in this build, so the demo engine is running.' };
  }
  try {
    // Loaded lazily so the demo build never downloads the Firebase SDK.
    const { FirebaseEngine } = await import('./firebase-engine');
    return { engine: new FirebaseEngine(settings), reason: 'Firebase AI Logic' };
  } catch (e) {
    console.error('Firebase engine failed to start, falling back to the demo engine.', e);
    return { engine: demo(), reason: 'Firebase failed to start, so the demo engine is running.' };
  }
}
