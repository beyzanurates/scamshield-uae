import { cn } from "cn";
import { LEVEL_LABELS, PROVENANCE_LABELS, type Locale } from "@/lib/i18n";
import type { Provenance, RiskLevel } from "@/lib/types";

const chipBase =
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide";

export const LEVEL_STYLES: Record<RiskLevel, string> = {
  HIGH: "border-risk-high/40 bg-risk-high/10 text-risk-high",
  MEDIUM: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
  LOW: "border-risk-low/40 bg-risk-low/10 text-risk-low",
};

export const LEVEL_STROKE: Record<RiskLevel, string> = {
  HIGH: "var(--risk-high)",
  MEDIUM: "var(--risk-medium)",
  LOW: "var(--risk-low)",
};

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success";
  className?: string;
}) {
  const tones = {
    neutral: "border-border bg-surface-2 text-muted-foreground",
    danger: "border-risk-high/40 bg-risk-high/10 text-risk-high",
    warning: "border-risk-medium/40 bg-risk-medium/10 text-risk-medium",
    success: "border-risk-low/40 bg-risk-low/10 text-risk-low",
  };
  return <span className={cn(chipBase, tones[tone], className)}>{children}</span>;
}

export function LevelChip({ level, locale = "en" }: { level: RiskLevel; locale?: Locale }) {
  return (
    <span className={cn(chipBase, "px-3", LEVEL_STYLES[level])}>{LEVEL_LABELS[locale][level]}</span>
  );
}

export function ProvenanceChip({
  provenance,
  locale = "en",
}: {
  provenance: Provenance;
  locale?: Locale;
}) {
  return (
    <span className={cn(chipBase, "border-border bg-surface-2 text-muted-foreground")}>
      {PROVENANCE_LABELS[locale][provenance]}
    </span>
  );
}
