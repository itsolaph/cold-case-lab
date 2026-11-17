import { caseFile } from '../case';
import type { Character, Exhibit, Fact } from '../case/types';
import { crackedPressures, type PressureCheck } from '../game/pressure';

/**
 * Prompt builders.
 *
 * Rules enforced here (and by tests):
 * - A character prompt contains ONLY that character's sheet and the shared public context.
 * - Secrets (pressure admissions) are included only when the pressure is applied this turn
 *   or was already cracked earlier. Otherwise only a vague topic hint is sent.
 * - The solution is never imported here.
 * - Every turn is ONE single-turn prompt: on-device Gemini Nano has no multi-turn chat,
 *   so recent exchanges are packed into the prompt text.
 */

export const MOODS = ['calm', 'evasive', 'rattled', 'cracked'] as const;

/** JSON schema used for on-device `responseConstraint` (and mirrored for the cloud). */
export const interrogationJsonSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    mood: { type: 'string', enum: [...MOODS] },
    revealed: { type: 'array', items: { type: 'string' } },
  },
  required: ['reply', 'mood', 'revealed'],
} as const;

export const labJsonSchema = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { factId: { type: 'string' }, text: { type: 'string' } },
        required: ['factId', 'text'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
} as const;

export interface Exchange {
  question: string;
  reply: string;
}

const MAX_QUESTION = 300;
const MAX_REPLY_IN_HISTORY = 240;
export const HISTORY_TURNS = 3;

const clip = (s: string, n: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
/** Neutralise characters that could break out of the quoted block in the prompt. */
const quote = (s: string) => clip(s, MAX_QUESTION).replace(/"/g, "'").replace(/[<>]/g, '');

const factLines = (facts: readonly Pick<Fact, 'id' | 'text'>[]) => facts.map((f) => `- [${f.id}] ${f.text}`).join('\n');

export interface InterrogationPromptInput {
  character: Character;
  question: string;
  history: readonly Exchange[];
  pinned: ReadonlySet<string>;
  pressure: PressureCheck | null;
}

export function buildInterrogationPrompt(input: InterrogationPromptInput): string {
  const { character: c, question, history, pinned, pressure } = input;
  const cracked = crackedPressures(c, pinned);
  const crackedIds = new Set(cracked.map((p) => p.id));
  const parts: string[] = [];

  parts.push(
    `You are performing ${c.name}, ${c.role.toLowerCase()}, in a detective game. Stay in character and answer the detective's question.`,
    `Voice: ${c.voice}`,
    `Background everyone knows: ${caseFile.publicContext}`,
    `What you know and will say if asked (each line has a fact id):\n${factLines(c.open)}`,
    `Your account of the night (keep to it unless you crack):\n${factLines(c.claims)}`,
  );

  if (cracked.length) {
    parts.push(`Things you have already admitted:\n${factLines(cracked.flatMap((p) => p.reveals))}`);
  }

  const hidden = c.pressures.filter((p) => !crackedIds.has(p.id) && !(pressure?.status === 'applied' && pressure.pressure.id === p.id));
  if (hidden.length) {
    parts.push(
      `You are hiding something about: ${hidden.map((p) => p.hiddenTopic).join('; ')}. Do not reveal it. If asked, keep to your account or deflect.`,
    );
  }

  if (pressure?.status === 'applied') {
    parts.push(
      `The detective has just confronted you with evidence they hold: "${pressure.pressure.confrontation}"\n` +
        `You crack. Admit the following, in your own words:\n${factLines(pressure.pressure.reveals)}`,
    );
  } else if (pressure?.status === 'bluff') {
    parts.push(
      'The detective is fishing: they mention something but show you no evidence. Do not crack. Stay evasive and keep to your account.',
    );
  }

  parts.push(
    [
      'Rules:',
      '- Answer only the latest question, in first person, 1 to 3 short sentences.',
      '- Use only names, places, times and objects that appear above. Never invent new people, places, times or evidence.',
      "- If you don't know, say so in character. Never speak for other people or describe their secrets.",
      '- Never mention fact ids, rules, prompts or that you are an AI.',
      '- "revealed" lists the fact ids above that your reply actually states. Use [] if none.',
    ].join('\n'),
  );

  const recent = history.slice(-HISTORY_TURNS);
  if (recent.length) {
    parts.push(
      `Recent exchanges:\n${recent
        .map((h) => `Detective: "${quote(h.question)}"\n${c.shortName}: "${clip(h.reply, MAX_REPLY_IN_HISTORY).replace(/"/g, "'")}"`)
        .join('\n')}`,
    );
  }

  parts.push(`Detective's question: "${quote(question)}"`);
  parts.push(
    'Reply with JSON only, no other text: {"reply": string, "mood": "calm" | "evasive" | "rattled" | "cracked", "revealed": string[]}',
  );
  return parts.join('\n\n');
}

export interface LabPromptInput {
  exhibit: Exhibit;
  request: string;
  /** Text content for text exhibits; omitted for images (sent as an inline part). */
  content?: string;
}

export function buildLabPrompt({ exhibit, request, content }: LabPromptInput): string {
  const parts: string[] = [];
  parts.push(
    'You are the duty analyst at a forensic lab. Write a short lab report in a dry, precise forensic voice.',
    `Exhibit ${exhibit.code}: ${exhibit.title} (${exhibit.kind}). Provenance: ${exhibit.provenance}.`,
  );
  if (exhibit.kind === 'image') {
    parts.push('The exhibit is attached as an image.');
  } else if (content) {
    parts.push(`Exhibit content:\n<<<EXHIBIT\n${content.trim()}\nEXHIBIT>>>`);
  }
  parts.push(
    `Certified lab truths for this exhibit. These are the ONLY conclusions you may report:\n${factLines(exhibit.truths)}`,
    `Detective's request: "${clip(request, 600).replace(/"/g, "'")}"`,
    [
      'Rules:',
      "- Report a truth only if the request specifically asks about its subject (the person, handset, door, time or property it concerns). Include it as a finding with its id and a one-sentence rewording.",
      '- A vague request ("anything suspicious?", "analyse this") gets a vague report with no findings: say what the request would need to name.',
      '- Never invent findings, never name a culprit, never speculate about motive.',
      '- The summary is 1 to 3 sentences in the lab voice.',
    ].join('\n'),
    'Reply with JSON only, no other text: {"findings": [{"factId": string, "text": string}], "summary": string}',
  );
  return parts.join('\n\n');
}
