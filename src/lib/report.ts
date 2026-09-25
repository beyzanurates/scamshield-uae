import { analyze } from "@/lib/scoring";
import type { AnalysisMeta, AnalysisReport, Extraction } from "@/lib/types";
import { verify } from "@/lib/verify";

/** Single pipeline used by every mode: live, demo and fallback all run the same verify + score code. */
export function buildReport(
  extraction: Extraction,
  mode: AnalysisReport["mode"],
  analysis?: AnalysisMeta
): AnalysisReport {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const report = analyze(extraction, verify(extraction), mode, id, new Date().toISOString());
  return analysis ? { ...report, analysis } : report;
}
