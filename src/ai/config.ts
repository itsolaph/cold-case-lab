/** Firebase config from Vite env vars. Missing config means the demo engine runs. */
export interface FirebaseSettings {
  firebase: {
    apiKey: string;
    authDomain?: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId: string;
  };
  recaptchaSiteKey: string;
  appCheckDebug: boolean;
  cloudModel: string;
}

export const DEFAULT_CLOUD_MODEL = 'gemini-3.5-flash-lite';

type Env = Record<string, string | boolean | undefined>;

export function readFirebaseSettings(env: Env = import.meta.env as Env): FirebaseSettings | null {
  const s = (k: string) => {
    const v = env[k];
    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };
  const apiKey = s('VITE_FIREBASE_API_KEY');
  const projectId = s('VITE_FIREBASE_PROJECT_ID');
  const appId = s('VITE_FIREBASE_APP_ID');
  const recaptchaSiteKey = s('VITE_RECAPTCHA_SITE_KEY');
  if (!apiKey || !projectId || !appId || !recaptchaSiteKey) return null;
  return {
    firebase: {
      apiKey,
      projectId,
      appId,
      authDomain: s('VITE_FIREBASE_AUTH_DOMAIN') ?? `${projectId}.firebaseapp.com`,
      storageBucket: s('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: s('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    },
    recaptchaSiteKey,
    appCheckDebug: s('VITE_APPCHECK_DEBUG') === '1',
    cloudModel: s('VITE_CLOUD_MODEL') ?? DEFAULT_CLOUD_MODEL,
  };
}
