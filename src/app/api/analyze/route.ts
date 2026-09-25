import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { demoFixtures } from "@/data/demo";
import {
  DEFAULT_MODEL,
  TOTAL_BUDGET_MS,
  extract,
  type ExtractionMime,
} from "@/lib/extract";
import { buildReport } from "@/lib/report";
import type { DemoFixture } from "@/lib/schemas";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED: Record<string, ExtractionMime> = {
  "image/png": "image/png",
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/webp": "image/webp",
};

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fixtureForHash(hash: string): DemoFixture | undefined {
  return demoFixtures.find((fixture) => fixture.image_sha256 === hash);
}

/** One line per request so the terminal shows what happened during a live demo. */
function log(fields: Record<string, string | number | boolean>) {
  const body = Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(`[analyze] ${body}`);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "image_required" }, { status: 400 });
  }

  const mime = ACCEPTED[image.type];
  if (!mime) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (image.size > MAX_BYTES) {
    return NextResponse.json({ error: "image_too_large" }, { status: 413 });
  }

  // Image bytes live in memory only — they are never written to disk.
  const bytes = new Uint8Array(await image.arrayBuffer());
  const hash = sha256(bytes);
  const fixture = fixtureForHash(hash);

  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    log({
      mode: "unavailable",
      model: "-",
      ms: Date.now() - startedAt,
      hash_match: Boolean(fixture),
    });
    return NextResponse.json({ error: "ai_unavailable" }, { status: 503 });
  }

  const model = process.env.AI_MODEL || DEFAULT_MODEL;
  const fallbackModel = process.env.AI_FALLBACK_MODEL || undefined;

  try {
    const result = await extract(bytes, mime, {
      apiKey,
      model,
      fallbackModel,
      totalBudgetMs: TOTAL_BUDGET_MS,
    });
    log({
      mode: "live",
      model: result.model,
      fallback_model_used: result.usedFallbackModel,
      ms: Date.now() - startedAt,
      hash_match: Boolean(fixture),
    });
    return NextResponse.json(buildReport(result.extraction, "live"));
  } catch (error) {
    const ms = Date.now() - startedAt;
    if (fixture) {
      log({ mode: "fallback", model, ms, hash_match: true });
      return NextResponse.json(buildReport(fixture.extraction, "fallback"));
    }
    log({ mode: "error", model, ms, hash_match: false });
    console.error("[analyze] extraction failed", error);
    return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
  }
}
