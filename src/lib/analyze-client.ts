import { demoFixtures } from "@/data/demo";
import { buildReport } from "@/lib/report";
import type { AnalysisReport } from "@/lib/types";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

/** Slightly above the server budget so the route's own fallback wins the race when it can. */
const CLIENT_TIMEOUT_MS = 26_000;

export function fileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported file type. Upload a PNG, JPG or WebP screenshot.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "That screenshot is larger than 8 MB.";
  }
  return null;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Sends the screenshot to `/api/analyze`. If the service is unavailable or errors and the
 * image is one of the demo PNGs, the fixture extraction is scored locally instead so the
 * demo keeps working; the report is marked `fallback` and the UI shows the cached banner.
 */
export async function analyzeImage(file: File): Promise<AnalysisReport> {
  const bytes = await file.arrayBuffer();
  const body = new FormData();
  body.append("image", file);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    if (response.ok) {
      return (await response.json()) as AnalysisReport;
    }
    return await cachedOrThrow(bytes);
  } catch {
    return await cachedOrThrow(bytes);
  }
}

async function cachedOrThrow(bytes: ArrayBuffer): Promise<AnalysisReport> {
  const hash = await sha256Hex(bytes);
  const fixture = demoFixtures.find((item) => item.image_sha256 === hash);
  if (!fixture) {
    throw new Error("analysis_failed");
  }
  return buildReport(fixture.extraction, "fallback");
}
