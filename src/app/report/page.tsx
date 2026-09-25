"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Chip, LevelChip, ProvenanceChip } from "@/components/chips";
import { ScoreRing } from "@/components/score-ring";
import { Button } from "@/components/ui/button";
import { buildReportSummary } from "@/lib/summary";
import type { Indicator } from "@/lib/types";
import { ECRIME, ORG_NOT_IN_REGISTRY_TEXT } from "@/lib/verify";
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
}: {
  title: string;
  value: string | null;
  chip: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      {value ? (
        <>
          <p className="mt-3 break-words text-sm font-medium">{value}</p>
          <div className="mt-3">{chip}</div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Not detected</p>
      )}
    </div>
  );
}

function IndicatorRow({ indicator, positive }: { indicator: Indicator; positive?: boolean }) {
  return (
    <div className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p
          className={`break-words text-sm font-medium ${positive ? "text-risk-low" : "text-foreground"}`}
        >
          “{indicator.evidence}”
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{indicator.explanation}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {positive ? (
          <Chip tone="success">Positive</Chip>
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
            {indicator.severity}
          </Chip>
        )}
        <ProvenanceChip provenance={indicator.provenance} />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
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

  async function copySummary() {
    if (!report) return;
    await navigator.clipboard.writeText(buildReportSummary(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 space-y-8 px-6 py-16">
      <header className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center">
        <ScoreRing score={risk.score} level={risk.level} />
        <div className="space-y-3">
          <LevelChip level={risk.level} />
          <p className="text-lg font-semibold">{risk.summary}</p>
          <p className="text-sm text-muted-foreground">
            Analysis mode: {report.mode} · Channel: {extraction.channel}
          </p>
        </div>
      </header>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <EvidenceCard
          title="Sender"
          value={extraction.claimed_sender}
          chip={orgFound ? <Chip tone="warning">Unverified</Chip> : <Chip>Not in registry</Chip>}
        />
        <EvidenceCard
          title="Link"
          value={firstLink?.normalized ?? null}
          chip={
            firstLink?.result === "MISMATCH" ? (
              <Chip tone="danger">Domain mismatch</Chip>
            ) : firstLink?.result === "MATCH" ? (
              <Chip tone="success">Domain verified</Chip>
            ) : (
              <Chip>Unverifiable</Chip>
            )
          }
        />
        <EvidenceCard
          title="Payment"
          value={
            payment
              ? `${payment.currency} ${payment.value} requested`
              : paymentRequest
                ? paymentRequest.quote
                : null
          }
          chip={
            <Chip tone="warning">
              {paymentRequest?.type === "credentials_otp" ? "Credential request" : "Payment request"}
            </Chip>
          }
        />
        <EvidenceCard
          title="Urgency"
          value={urgency?.quote ?? null}
          chip={<Chip tone="warning">High-pressure language</Chip>}
        />
      </section>

      {mismatch && officialDomain && (
        <section className="rounded-2xl border border-risk-high/40 bg-risk-high/5 p-6">
          <p className="text-[11px] uppercase tracking-wide text-risk-high">Domain mismatch</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Observed:</dt>
              <dd className="font-medium">{mismatch.normalized}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Verified official:</dt>
              <dd className="font-medium">{officialDomain}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-muted-foreground">Result:</dt>
              <dd className="font-medium text-risk-high">DOMAIN MISMATCH</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Why we flagged this</h2>
        <div className="mt-2">
          {report.indicators.length === 0 && report.positives.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No risk indicators were detected from the information available.
            </p>
          ) : (
            <>
              {report.indicators.map((indicator) => (
                <IndicatorRow key={indicator.id} indicator={indicator} />
              ))}
              {report.positives.map((positive) => (
                <IndicatorRow key={positive.id} indicator={positive} positive />
              ))}
            </>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground">Verify safely</h2>
        <p className="mt-3 text-lg font-semibold">Don&apos;t use the link in the message.</p>
        {orgFound && officialDomain ? (
          <>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted-foreground">Claimed organization:</dt>
                <dd className="font-medium">{verification.claimed_org}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-muted-foreground">Verified official source:</dt>
                <dd className="font-medium">{officialDomain}</dd>
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
              Open official source
              <ExternalLink className="size-4" />
            </Button>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{ORG_NOT_IN_REGISTRY_TEXT}</p>
        )}
        <p className="mt-5 text-sm text-muted-foreground">
          Navigate directly to the organization&apos;s official website or app instead of using
          links contained in suspicious messages.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-[11px] uppercase tracking-wide text-muted-foreground">
          What should I do?
        </h2>
        <ol className="mt-4 space-y-2 text-sm">
          {report.recommended_actions.map((action, index) => (
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
          {ECRIME.label}
          <ExternalLink className="size-4" />
        </a>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/" />} className="h-11 px-5">
            Scan another message
          </Button>
          <Button variant="outline" className="h-11 px-5" onClick={copySummary}>
            {copied ? "Copied" : "Copy report summary"}
          </Button>
        </div>
      </section>

      <footer className="space-y-2 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>
          ScamShield identifies risk indicators. It does not provide a definitive fraud
          determination.
        </p>
        <p>Screenshots are analyzed in memory and are not stored.</p>
      </footer>
    </main>
  );
}
