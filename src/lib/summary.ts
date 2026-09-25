import type { AnalysisReport } from "@/lib/types";

/** Where the analysis came from: the live model and its latency, or the cached demo fixture. */
export function provenanceLine(report: AnalysisReport): string {
  if (report.mode === "live" && report.analysis) {
    const seconds = (report.analysis.latency_ms / 1000).toFixed(1);
    return `Analyzed live · ${report.analysis.model} · ${seconds} s`;
  }
  return "Cached analysis (demo fixture)";
}

/** Plain-text version of the report, used by "Copy report summary". */
export function buildReportSummary(report: AnalysisReport): string {
  const lines = [
    "ScamShield UAE — risk report",
    `Risk: ${report.risk.level} (${report.risk.score}/100)`,
    report.risk.summary,
    "",
    `Claimed organization: ${report.verification.claimed_org ?? "not stated"}`,
    `Registry status: ${report.verification.status_text}`,
  ];

  if (report.verification.domain_checks.length > 0) {
    lines.push("", "Links:");
    for (const check of report.verification.domain_checks) {
      lines.push(`- ${check.normalized} — ${check.result}`);
    }
  }

  if (report.indicators.length > 0) {
    lines.push("", "Risk indicators:");
    for (const indicator of report.indicators) {
      lines.push(`- [${indicator.severity}] ${indicator.id}: ${indicator.explanation}`);
    }
  }

  if (report.positives.length > 0) {
    lines.push("", "Positive signals:");
    for (const positive of report.positives) {
      lines.push(`- ${positive.id}: ${positive.explanation}`);
    }
  }

  lines.push(
    "",
    "What should I do?",
    ...report.recommended_actions.map((action, index) => `${index + 1}. ${action}`),
    "",
    "Report to Dubai Police eCrime: https://ecrime.ae",
    provenanceLine(report),
    "ScamShield identifies risk indicators. It does not provide a definitive fraud determination."
  );

  return lines.join("\n");
}
