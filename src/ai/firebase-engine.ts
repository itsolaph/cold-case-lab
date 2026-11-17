import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  InferenceSource,
  Schema,
  type GenerativeModel,
  type InlineDataPart,
  type LanguageModelExpected,
} from 'firebase/ai';
import type { FirebaseSettings } from './config';
import type { AiEngine, DeviceStatus, EngineResult, InterrogationRequest, LabRequest } from './engine';
import { interrogationJsonSchema } from './prompts';

/**
 * The real engine: Firebase AI Logic hybrid inference.
 * - Interrogation: PREFER_ON_DEVICE. Gemini Nano via the Chrome Prompt API when present,
 *   otherwise the SDK falls back to the cloud model and the UI shows "remote line".
 * - Lab: ONLY_IN_CLOUD. Long documents, images and reasoning are the cloud's job.
 */

declare global {
  // eslint-disable-next-line no-var
  var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

/** Chrome Prompt API global (only what we touch). */
interface LanguageModelGlobal {
  availability(options?: unknown): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
}

const textOnly: LanguageModelExpected[] = [{ type: 'text', languages: ['en'] }];

export class FirebaseEngine implements AiEngine {
  readonly kind = 'firebase' as const;
  readonly label = 'Firebase AI Logic';
  private readonly interrogationModel: GenerativeModel;
  private readonly labModel: GenerativeModel;
  private status: DeviceStatus = { state: 'unavailable', reason: 'Not initialised yet.' };

  constructor(settings: FirebaseSettings) {
    if (settings.appCheckDebug) self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    const app = initializeApp(settings.firebase);
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(settings.recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    const ai = getAI(app, { backend: new GoogleAIBackend() });

    this.interrogationModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      onDeviceParams: {
        createOptions: { expectedInputs: textOnly, expectedOutputs: textOnly },
        promptOptions: { responseConstraint: interrogationJsonSchema },
      },
      inCloudParams: {
        model: settings.cloudModel,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 400,
          responseMimeType: 'application/json',
          responseSchema: Schema.object({
            properties: {
              reply: Schema.string(),
              mood: Schema.enumString({ enum: ['calm', 'evasive', 'rattled', 'cracked'] }),
              revealed: Schema.array({ items: Schema.string() }),
            },
          }),
        },
      },
    });

    this.labModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: settings.cloudModel,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
          responseSchema: Schema.object({
            properties: {
              findings: Schema.array({
                items: Schema.object({ properties: { factId: Schema.string(), text: Schema.string() } }),
              }),
              summary: Schema.string(),
            },
          }),
        },
      },
    });
  }

  /** Must run inside the click handler: `initializeDeviceModel` may start the Nano download. */
  init(onStatus: (s: DeviceStatus) => void): Promise<DeviceStatus> {
    // Kick off the download synchronously, while the user activation is still fresh.
    const download = this.interrogationModel.initializeDeviceModel((progress) => {
      this.status = { state: 'downloading', progress };
      onStatus(this.status);
    });

    return (async () => {
      const lm = (globalThis as { LanguageModel?: LanguageModelGlobal }).LanguageModel;
      if (!lm) {
        this.status = { state: 'unavailable', reason: 'This browser has no Prompt API (LanguageModel).' };
        onStatus(this.status);
        download.catch(() => undefined);
        return this.status;
      }
      let availability: Awaited<ReturnType<LanguageModelGlobal['availability']>>;
      try {
        availability = await lm.availability({ expectedInputs: textOnly, expectedOutputs: textOnly });
      } catch {
        availability = 'unavailable';
      }
      if (availability === 'unavailable') {
        this.status = { state: 'unavailable', reason: 'Gemini Nano is unavailable on this device.' };
        onStatus(this.status);
        download.catch(() => undefined);
        return this.status;
      }
      if (availability !== 'available') {
        this.status = { state: 'downloading', progress: 0 };
        onStatus(this.status);
        // Do not block the game on a large download: PREFER_ON_DEVICE uses the cloud meanwhile.
        download.then(
          () => {
            this.status = { state: 'ready' };
            onStatus(this.status);
          },
          (e: unknown) => {
            this.status = { state: 'unavailable', reason: e instanceof Error ? e.message : 'Model download failed.' };
            onStatus(this.status);
          },
        );
        return this.status;
      }
      await download.catch(() => undefined);
      this.status = { state: 'ready' };
      onStatus(this.status);
      return this.status;
    })();
  }

  async interrogate(req: InterrogationRequest): Promise<EngineResult> {
    const t0 = performance.now();
    const result = await this.interrogationModel.generateContent(req.prompt);
    const ms = Math.round(performance.now() - t0);
    const onDevice = result.response.inferenceSource === InferenceSource.ON_DEVICE;
    return { raw: safeText(result.response), route: onDevice ? 'on-device' : 'remote-line', ms };
  }

  async lab(req: LabRequest): Promise<EngineResult> {
    const t0 = performance.now();
    const parts: string | (string | InlineDataPart)[] = req.image
      ? [req.prompt, { type: 'inlineData', inlineData: { mimeType: req.image.mimeType, data: req.image.base64 } }]
      : req.prompt;
    const result = await this.labModel.generateContent(parts);
    return { raw: safeText(result.response), route: 'cloud-lab', ms: Math.round(performance.now() - t0) };
  }
}

function safeText(response: { text: () => string }): string {
  try {
    return response.text();
  } catch {
    // Blocked or empty candidates: the hardened parser turns '' into a safe fallback.
    return '';
  }
}
