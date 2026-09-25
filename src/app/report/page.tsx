"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Chip, LevelChip, ProvenanceChip } from "@/components/chips";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import {
  CHANNEL_LABELS,
  guidanceText,
  indicatorText,
  orgNotInRegistryText,
  provenanceLine,
  riskSummary,
  SEVERITY_LABELS,
  UI,
  type Locale,
} from "@/lib/i18n";
import { guidanceTone } from "@/lib/scoring";
import { buildReportSummary } from "@/lib/summary";
import type { Indicator } from "@/lib/types";
import { ECRIME } from "@/lib/verify";
import {
  getReportSnapshot,
  getServerReportSnapshot,
  subscribeToReport,
} from "@/lib/storage";

const noopSubscribe = () => () => {};
const alwaysTrue = () => true;
const alwaysFalse = () => false;

function EvidenceCard({
  title,
  value,
  chip,
  locale,
  ltr,
}: {
  title: string;
  value: string | null;
  chip: React.ReactNode;
  locale: Locale;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      {value ? (
        <>
          <p
            className="mt-3 break-words text-sm font-medium"
            dir={ltr ? "ltr" : undefined}
            style={ltr && locale === "ar" ? { textAlign: "right" } : undefined}
          >
            {value}
          </p>
          <div className="mt-3">{chip}</div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{UI[locale].not_detected}</p>
      )}
    </div>
  );
}

function IndicatorRow({
  indicator,
  positive,
  locale,
}: {
  indicator: Indicator;
  positive?: boolean;
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p
          className={`break-words text-sm font-medium ${positive ? "text-risk-low" : "text-foreground"}`}
        >
          “{indicator.evidence}”
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{indicatorText(locale, indicator)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {positive ? (
          <Chip tone="success">{UI[locale].chip_positive}</Chip>
        ) : (
          <Chip
            tone={
              indicator.severity === "HIGH"
                ? "danger"
                : indicator.severity === "MEDIUM"
                  ? "warning"
                  : "neutral"
            }
          >
            {SEVERITY_LABELS[locale][indicator.severity]}
          </Chip>
        )}
        <ProvenanceChip provenance={indicator.provenance} locale={locale} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [locale, setLocale] = useState<Locale>("en");
  const mounted = useSyncExternalStore(noopSubscribe, alwaysTrue, alwaysFalse);
  const report = useSyncExternalStore(
    subscribeToReport,
    getReportSnapshot,
    getServerReportSnapshot
  );

  if (!mounted) return null;

  if (!report) {
    return (
      <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 py-16">
        <p className="text-sm text-muted-foreground">
          No analysis to show. Start from the home page.
        </p>
        <Button className="mt-6 h-11 px-5" onClick={() => router.push("/")}>
          Scan a message
        </Button>
      </main>
    );
  }

  const { extraction, verification, risk } = report;
  const orgFound = verification.status === "VERIFIED_ORG_FOUND";
  const mismatch = verification.domain_checks.find((check) => check.result === "MISMATCH");
  const firstLink = verification.domain_checks[0] ?? null;
  const payment = extraction.amounts[0] ?? null;
  const paymentRequest = extraction.requests.find(
    (request) => request.type === "payment" || request.type === "credentials_otp"
  );
  const urgency = extraction.pressure_cues.find(
    (cue) => cue.type === "urgency" || cue.type === "threat"
  );
  const officialDomain = verification.official_domains[0] ?? null;
  const guidance = guidanceText(locale, guidanceTone(report));
  const t = UI[locale];
  const rtl = locale === "ar";

  async function copySummary() {
    if (!report) return;
    await navigator.clipboard.writeText(buildReportSummary(report, locale));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-[1040px] flex-1 space-y-8 px-6 py-16"
    >
      <div className="flex justify-end">
        <div className="inline-flex overflow-hidden rounded-full border border-border" dir="ltr">
          {(["en", "ar"] as Locale[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={locale === option}
              onClick={() => setLocale(option)}
              className={`px-4 py-1.5 text-xs font-medium ${
                locale === option
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {UI[option].locale_label}
            </button>
          ))}
        </div>
      </div>
      {report.mode === "fallback" && (
        <p className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground">
          {t.fallback_banner}
        </p>
      )}
      <header className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <ScoreRing score={risk.score} level={risk.level} />
        <div className="space-y-3">
          <LevelChip level={risk.level} locale={locale} />
          <p className="text-lg font-semibold">{riskSummary(locale, risk.level)}</p>
          <p className="text-sm text-muted-foreground">
            {t.channel}: {CHANNEL_LABELS[locale][extraction.channel] ?? extraction.channel}
          </p>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <EvidenceCard
          locale={locale}
          title={t.card_sender}
          value={extraction.claimed_sender}
          chip={
            !orgFound ? (
              <Chip>{t.chip_not_in_registry}</Chip>
            ) : risk.level === "LOW" ? (
              <Chip>{t.chip_unverified}</Chip>
            ) : (
              <Chip tone="warning">{t.chip_unverified}</Chip>
            )
          }
        />
        <EvidenceCard
          locale={locale}
          ltr
          title={t.card_link}
          value={firstLink?.normalized ?? null}
          chip={
            firstLink?.result === "MISMATCH" ? (
              <Chip tone="danger">{t.chip_domain_mismatch}</Chip>
            ) : firstLink?.result === "MATCH" ? (
              <Chip tone="success">{t.chip_domain_verified}</Chip>
            ) : (
              <Chip>{t.chip_unverifiable}</Chip>
            )
          }
        />
        <EvidenceCard
          locale={locale}
          title={t.card_payment}
          value={
            payment
              ? `${payment.currency} ${payment.value} ${t.amount_requested}`
              : paymentRequest
                ? paymentRequest.quote
                : null
          }
          chip={
            <Chip tone="warning">
              {paymentRequest?.type === "credentials_otp"
                ? t.chip_credential_request
                : t.chip_payment_request}
            </Chip>
          }
        />
        <EvidenceCard
          locale={locale}
          title={t.card_urgency}
          value={urgency?.quote ?? null}
          chip={<Chip tone="warning">{t.chip_pressure}</Chip>}
        />
      </section>

      {mismatch && officialDomain && (
        <section className="rounded-2xl border border-risk-high/40 bg-risk-high/5 p-6">
          <p className="text-[11px] uppercase tracking-wide text-risk-high">{t.mismatch_title}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">{t.mismatch_observed}</dt>
              <dd className="font-medium" dir="ltr">
                {mismatch.normalized}
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">{t.mismatch_official}</dt>
              <dd className="font-medium" dir="ltr">
                {officialDomain}
              </dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">{t.mismatch_result}</dt>
              <dd className="font-medium text-risk-high">{t.mismatch_result_value}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">
          {report.indicators.length === 0 ? t.indicators_title_clean : t.indicators_title}
        </h2>
        <div className="mt-2">
          {report.indicators.length === 0 && report.positives.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t.indicators_empty}</p>
          ) : (
            <>
              {report.indicators.map((indicator) => (
                <IndicatorRow key={indicator.id} indicator={indicator} locale={locale} />
              ))}
              {report.positives.map((positive) => (
                <IndicatorRow key={positive.id} indicator={positive} positive locale={locale} />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t.verify_title}
        </h2>
        <p className="mt-3 text-lg font-semibold">{guidance.headline}</p>
        {orgFound && officialDomain ? (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted-foreground">{t.claimed_org}</dt>
                <dd className="font-medium">{verification.claimed_org}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted-foreground">{t.official_source}</dt>
                <dd className="font-medium" dir="ltr">
                  {officialDomain}
                </dd>
              </div>
            </dl>
            <Button
              nativeButton={false}
              render={
                <a
                  href={`https://${officialDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
              className="mt-5 h-11 px-5"
            >
              {t.open_official}
              <ExternalLink className="size-4" />
            </Button>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{orgNotInRegistryText(locale)}</p>
        )}
        <p className="mt-5 text-sm text-muted-foreground">{guidance.footnote}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {t.actions_title}
        </h2>
        <ol className="mt-4 space-y-2 text-sm">
          {guidance.actions.map((action, index) => (
            <li key={action} className="flex gap-3">
              <span className="text-muted-foreground">{index + 1}.</span>
              {action}
            </li>
          ))}
        </ol>
        <a
          className="mt-5 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          href={ECRIME.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.ecrime}
          <ExternalLink className="size-4" />
        </a>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/" />} className="h-11 px-5">
            {t.scan_another}
          </Button>
          <Button variant="outline" className="h-11 px-5" onClick={copySummary}>
            {copied ? t.copied : t.copy_summary}
          </Button>
        </div>
      </section>

      <footer className="space-y-2 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>{t.disclaimer}</p>
        <p>{t.no_storage}</p>
        <p className="text-xs" dir="ltr" style={rtl ? { textAlign: "right" } : undefined}>
          {provenanceLine(locale, report)}
        </p>
      </footer>
    </main>
  );
}
