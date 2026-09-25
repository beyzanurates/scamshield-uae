import { extractionSchema } from "@/lib/schemas";
import type { Extraction } from "@/lib/types";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5";
export const MAX_TOKENS = 1500;

/** Whole-extraction budget, shared by the primary model, the JSON retry and the fallback model. */
export const TOTAL_BUDGET_MS = 25_000;
const PRIMARY_BUDGET_MS = 15_000;

export const SYSTEM_PROMPT = `You read a screenshot of a message (WhatsApp, SMS, email or social) and report ONLY observable facts.

Return ONLY a JSON object with exactly this shape, no prose and no markdown fences:
{
  "channel": "whatsapp|sms|email|social|unknown",
  "language": "en|ar|mixed|other",
  "message_text": "verbatim text in the original language",
  "claimed_sender": "string|null",
  "sender_handle": "string|null",
  "urls": ["..."],
  "phone_numbers": ["..."],
  "amounts": [{"value": 420, "currency": "AED", "quote": "Pay AED 420"}],
  "requests": [{"type": "payment|credentials_otp|personal_info|click_link|call_number|other", "quote": "..."}],
  "pressure_cues": [{"type": "urgency|threat|reward|authority", "quote": "..."}],
  "extraction_confidence": 0.0
}

Rules:
- claimed_sender is the name or organization the message presents itself as; null if none is shown.
- sender_handle is the phone number, short code, alphanumeric sender ID, email or username as displayed; null if none is shown.
- Every quote must be a verbatim substring of message_text.
- Never output a risk score, a verdict, an opinion or any field not listed above.
- Report what is visible only. Do not infer an organization that is not named.
- extraction_confidence is your confidence that the text was read correctly, between 0 and 1.`;

export type ExtractionMime = "image/png" | "image/jpeg" | "image/webp";

export interface ExtractResult {
  extraction: Extraction;
  model: string;
  /** True when the primary model failed and AI_FALLBACK_MODEL produced the result. */
  usedFallbackModel: boolean;
}

export class ExtractionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}

/** Models wrap JSON in ```json fences often enough that this is not optional. */
export function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return (fenced ? fenced[1] : trimmed).trim();
}

export function parseExtraction(raw: string): Extraction {
  return extractionSchema.parse(JSON.parse(stripCodeFences(raw)));
}

function dataUrl(image: Uint8Array, mime: ExtractionMime): string {
  return `data:${mime};base64,${Buffer.from(image).toString("base64")}`;
}

type Message = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

async function callModel(
  apiKey: string,
  model: string,
  messages: Message[],
  signal: AbortSignal
): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "X-Title": "ScamShield UAE",
    },
    body: JSON.stringify({ model, messages, temperature: 0, max_tokens: MAX_TOKENS }),
  });

  const json: unknown = await response.json();
  if (!response.ok) {
    throw new ExtractionError(`OpenRouter HTTP ${response.status}`, json);
  }

  const content = (json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
    ?.message?.content;
  if (!content) {
    throw new ExtractionError("OpenRouter returned no message content", json);
  }
  return content;
}

/**
 * One model attempt plus one retry when the model returns unparseable JSON.
 * The retry echoes the bad output back so the model corrects itself.
 */
async function extractWithModel(
  apiKey: string,
  model: string,
  image: Uint8Array,
  mime: ExtractionMime,
  signal: AbortSignal
): Promise<Extraction> {
  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        { type: "text", text: "Extract the observable facts from this screenshot." },
        { type: "image_url", image_url: { url: dataUrl(image, mime) } },
      ],
    },
  ];

  const first = await callModel(apiKey, model, messages, signal);
  try {
    return parseExtraction(first);
  } catch {
    const retry = await callModel(
      apiKey,
      model,
      [
        ...messages,
        { role: "assistant", content: first },
        {
          role: "user",
          content:
            "That was not valid JSON matching the required shape. Reply with the JSON object only — no prose, no markdown fences.",
        },
      ],
      signal
    );
    try {
      return parseExtraction(retry);
    } catch (error) {
      throw new ExtractionError("Model did not return valid extraction JSON", error);
    }
  }
}

/** Aborts `signal`-aware work after `ms`, or when the caller's budget runs out first. */
function budget(ms: number, parent?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onParentAbort = () => controller.abort();
  parent?.addEventListener("abort", onParentAbort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      parent?.removeEventListener("abort", onParentAbort);
    },
  };
}

/**
 * The only AI step. Returns observable facts; it never decides anything about risk —
 * verification and scoring stay deterministic.
 *
 * Budget: the primary model gets `PRIMARY_BUDGET_MS`, and whatever remains of
 * `TOTAL_BUDGET_MS` is handed to `AI_FALLBACK_MODEL`, so the caller never waits longer
 * than the total no matter which stage is slow.
 */
export async function extract(
  image: Uint8Array,
  mime: ExtractionMime,
  options: {
    apiKey: string;
    model?: string;
    fallbackModel?: string;
    totalBudgetMs?: number;
    signal?: AbortSignal;
  }
): Promise<ExtractResult> {
  const model = options.model || DEFAULT_MODEL;
  const total = options.totalBudgetMs ?? TOTAL_BUDGET_MS;
  const startedAt = Date.now();

  const primary = budget(Math.min(PRIMARY_BUDGET_MS, total), options.signal);
  try {
    const extraction = await extractWithModel(
      options.apiKey,
      model,
      image,
      mime,
      primary.signal
    );
    return { extraction, model, usedFallbackModel: false };
  } catch (primaryError) {
    const remaining = total - (Date.now() - startedAt);
    if (!options.fallbackModel || remaining <= 0 || options.signal?.aborted) {
      throw primaryError instanceof ExtractionError
        ? primaryError
        : new ExtractionError("Extraction failed", primaryError);
    }

    const fallback = budget(remaining, options.signal);
    try {
      const extraction = await extractWithModel(
        options.apiKey,
        options.fallbackModel,
        image,
        mime,
        fallback.signal
      );
      return { extraction, model: options.fallbackModel, usedFallbackModel: true };
    } catch (fallbackError) {
      throw new ExtractionError("Extraction failed on primary and fallback models", {
        primaryError,
        fallbackError,
      });
    } finally {
      fallback.done();
    }
  } finally {
    primary.done();
  }
}
