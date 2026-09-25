import type { AnalysisReport } from "@/lib/types";

const KEY = "scamshield:last-report";

let cachedRaw: string | null = null;
let cachedReport: AnalysisReport | null = null;
const listeners = new Set<() => void>();

export function storeReport(report: AnalysisReport): void {
  sessionStorage.setItem(KEY, JSON.stringify(report));
  listeners.forEach((listener) => listener());
}

export function subscribeToReport(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Cached so repeated snapshot reads return a stable reference. */
export function getReportSnapshot(): AnalysisReport | null {
  const raw = sessionStorage.getItem(KEY);
  if (raw === cachedRaw) return cachedReport;
  cachedRaw = raw;
  try {
    cachedReport = raw ? (JSON.parse(raw) as AnalysisReport) : null;
  } catch {
    cachedReport = null;
  }
  return cachedReport;
}

export function getServerReportSnapshot(): AnalysisReport | null {
  return null;
}
