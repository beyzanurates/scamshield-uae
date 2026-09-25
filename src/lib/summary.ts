import {
  guidanceText,
  indicatorText,
  provenanceLine,
  registryStatusText,
  riskSummary,
  UI,
  type Locale,
} from "@/lib/i18n";
import { guidanceTone } from "@/lib/scoring";
import { ECRIME } from "@/lib/verify";
import type { AnalysisReport } from "@/lib/types";

/** Plain-text version of the report, used by "Copy report summary". */
export function buildReportSummary(report: AnalysisReport, locale: Locale = "en"): string {
  const t = UI[locale];
  const lines = [
    t.summary_title,
    `${t.summary_risk}: ${report.risk.level} (${report.risk.score}/100)`,
    riskSummary(locale, report.risk.level),
    "",
    `${t.summary_claimed_org}: ${report.verification.claimed_org ?? t.summary_not_stated}`,
    `${t.summary_registry}: ${registryStatusText(locale, report.verification)}`,
  ];

  if (report.verification.domain_checks.length > 0) {
    lines.push("", t.summary_links);
    for (const check of report.verification.domain_checks) {
      lines.push(`- ${check.normalized} — ${check.result}`);
    }
  }

  if (report.indicators.length > 0) {
    lines.push("", t.summary_indicators);
    for (const indicator of report.indicators) {
      lines.push(`- [${indicator.severity}] ${indicator.id}: ${indicatorText(locale, indicator)}`);
    }
  }

  if (report.positives.length > 0) {
    lines.push("", t.summary_positives);
    for (const positive of report.positives) {
      lines.push(`- ${positive.id}: ${indicatorText(locale, positive)}`);
    }
  }

  lines.push(
    "",
    t.actions_title,
    ...guidanceText(locale, guidanceTone(report)).actions.map(
      (action, index) => `${index + 1}. ${action}`
    ),
    "",
    `${t.ecrime}: ${ECRIME.url}`,
    provenanceLine(locale, report),
    t.disclaimer
  );

  return lines.join("\n");
}
