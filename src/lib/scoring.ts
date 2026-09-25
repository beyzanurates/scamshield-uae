import type {
  AnalysisReport,
  Extraction,
  Indicator,
  IndicatorCategory,
  Provenance,
  RiskLevel,
  Severity,
  Verification,
} from "@/lib/types";

export const INDICATOR_CONFIG: Record<
  string,
  { weight: number; category: IndicatorCategory; severity: Severity; provenance: Provenance }
> = {
  domain_mismatch: { weight: 50, category: "LINK", severity: "HIGH", provenance: "VERIFIED" },
  credentials_or_otp_request: {
    weight: 35,
    category: "REQUEST",
    severity: "HIGH",
    provenance: "EXTRACTED",
  },
  payment_request: { weight: 25, category: "PAYMENT", severity: "MEDIUM", provenance: "EXTRACTED" },
  suspicious_link: { weight: 20, category: "LINK", severity: "MEDIUM", provenance: "INTERPRETED" },
  personal_info_request: {
    weight: 20,
    category: "REQUEST",
    severity: "MEDIUM",
    provenance: "EXTRACTED",
  },
  impersonation_unverifiable: {
    weight: 15,
    category: "SENDER",
    severity: "MEDIUM",
    provenance: "VERIFIED",
  },
  urgency: { weight: 15, category: "URGENCY", severity: "MEDIUM", provenance: "INTERPRETED" },
  threat: { weight: 15, category: "URGENCY", severity: "MEDIUM", provenance: "INTERPRETED" },
  sender_channel_anomaly: {
    weight: 15,
    category: "SENDER",
    severity: "MEDIUM",
    provenance: "INTERPRETED",
  },
  reward_bait: { weight: 10, category: "URGENCY", severity: "LOW", provenance: "INTERPRETED" },
};

export const SUMMARIES: Record<RiskLevel, string> = {
  HIGH: "This message contains multiple indicators commonly associated with impersonation or fraudulent requests.",
  MEDIUM: "This message contains some risk indicators. Verify before acting.",
  LOW: "No major risk indicators detected from the information available.",
};

/**
 * Guidance depends on the outcome: telling someone not to click a link they were never sent
 * reads as a false alarm.
 */
export type GuidanceTone =
  | "CAUTION"
  | "CAUTION_NO_LINK"
  | "LOW_VERIFIED"
  | "LOW_NOTHING_TO_VERIFY";

export const GUIDANCE: Record<
  GuidanceTone,
  { headline: string; footnote: string; actions: string[] }
> = {
  CAUTION: {
    headline: "Don't use the link in the message.",
    footnote:
      "Navigate directly to the organization's official website or app instead of using links contained in suspicious messages.",
    actions: [
      "Don't click the link",
      "Don't send money or personal information",
      "Verify directly through the official organization",
    ],
  },
  CAUTION_NO_LINK: {
    headline: "Verify this message directly with the organization.",
    footnote:
      "Navigate directly to the organization's official website or app instead of replying to a message you did not expect.",
    actions: [
      "Don't reply to this message",
      "Don't send money or personal information",
      "Verify directly through the official organization",
    ],
  },
  LOW_VERIFIED: {
    headline:
      "This link matches the verified official domain. To be safe, navigate to the site or app directly rather than tapping the link.",
    footnote:
      "A matching domain confirms where the link points, not who sent the message.",
    actions: [
      "No major indicators detected",
      "Verify through the official app if in doubt",
      "Report if something still feels wrong",
    ],
  },
  LOW_NOTHING_TO_VERIFY: {
    headline: "Nothing to verify in this message.",
    footnote:
      "Contact the organization through its official app or website if you want to confirm this message.",
    actions: [
      "No major indicators detected",
      "If in doubt, contact the organization through its official app or website",
      "Report if something still feels wrong",
    ],
  },
};

export function guidanceTone(report: {
  risk: { level: RiskLevel };
  verification: Pick<Verification, "domain_checks">;
  positives: Indicator[];
}): GuidanceTone {
  const hasLink = report.verification.domain_checks.length > 0;
  if (report.risk.level !== "LOW") return hasLink ? "CAUTION" : "CAUTION_NO_LINK";
  return report.positives.some((positive) => positive.id === "domain_verified")
    ? "LOW_VERIFIED"
    : "LOW_NOTHING_TO_VERIFY";
}

const HEURISTIC_TEXT: Record<string, string> = {
  url_shortener: "the link uses a URL shortener that hides its real destination",
  raw_ip_host: "the link points to a raw IP address instead of a domain name",
  lookalike_domain: "the domain imitates the name of a known organization",
  non_ae_government_host: "the link is not on a .ae domain while claiming to be a UAE government body",
};

/** Saturating score: never reaches 100 because we never claim certainty. */
export function score(totalWeight: number): number {
  return Math.round(100 * (1 - Math.exp(-totalWeight / 50)));
}

export function level(value: number): RiskLevel {
  if (value >= 70) return "HIGH";
  if (value >= 30) return "MEDIUM";
  return "LOW";
}

function indicator(
  id: string,
  evidence: string,
  explanation: string,
  params?: Indicator["params"]
): Indicator {
  const config = INDICATOR_CONFIG[id];
  return {
    id,
    category: config.category,
    severity: config.severity,
    evidence,
    explanation,
    provenance: config.provenance,
    ...(params ? { params } : {}),
  };
}

export function buildIndicators(
  extraction: Extraction,
  verification: Verification
): { indicators: Indicator[]; positives: Indicator[] } {
  const indicators: Indicator[] = [];
  const positives: Indicator[] = [];

  const mismatches = verification.domain_checks.filter((check) => check.result === "MISMATCH");
  const matches = verification.domain_checks.filter((check) => check.result === "MATCH");

  if (mismatches.length > 0) {
    const official = verification.official_domains[0] ?? "the official domain";
    indicators.push(
      indicator(
        "domain_mismatch",
        mismatches[0].normalized,
        `This link does not match the verified official domain ${official}.`,
        { official_domain: official }
      )
    );
  }

  const suspicious = verification.domain_checks.find((check) => check.reasons.length > 0);
  if (suspicious) {
    indicators.push(
      indicator(
        "suspicious_link",
        suspicious.normalized,
        `This link shows a risky pattern: ${HEURISTIC_TEXT[suspicious.reasons[0]]}.`,
        { heuristic: suspicious.reasons[0] }
      )
    );
  }

  const requestExplanations: Record<string, { id: string; explanation: string }> = {
    credentials_otp: {
      id: "credentials_or_otp_request",
      explanation:
        "The message asks for a one-time password or login credentials, which organizations do not request.",
    },
    payment: {
      id: "payment_request",
      explanation: "The message asks for a payment through a channel that could not be verified.",
    },
    personal_info: {
      id: "personal_info_request",
      explanation: "The message asks for personal information that could be used to impersonate you.",
    },
  };

  for (const [type, meta] of Object.entries(requestExplanations)) {
    const request = extraction.requests.find((item) => item.type === type);
    if (request) indicators.push(indicator(meta.id, request.quote, meta.explanation));
  }

  const cueExplanations: Record<string, { id: string; explanation: string }> = {
    urgency: {
      id: "urgency",
      explanation: "The message pressures you to act immediately, a tactic commonly associated with fraud.",
    },
    threat: {
      id: "threat",
      explanation: "The message threatens a penalty or loss if you do not act.",
    },
    reward: {
      id: "reward_bait",
      explanation: "The message offers a reward to encourage you to act quickly.",
    },
  };

  for (const [type, meta] of Object.entries(cueExplanations)) {
    const cue = extraction.pressure_cues.find((item) => item.type === type);
    if (cue) indicators.push(indicator(meta.id, cue.quote, meta.explanation));
  }

  if (verification.sender_channel_anomaly && extraction.sender_handle) {
    const officialChannel =
      verification.org_type === "government" || verification.org_type === "bank";
    indicators.push(
      indicator(
        "sender_channel_anomaly",
        extraction.sender_handle,
        officialChannel
          ? "Official UAE government and bank messages usually come from registered sender IDs, not personal or international mobile numbers."
          : "Messages from organizations in the verified registry usually come from registered sender IDs, not personal or international mobile numbers.",
        { sender_channel: officialChannel ? "official" : "registry" }
      )
    );
  }

  if (verification.status === "VERIFIED_ORG_FOUND" && matches.length === 0) {
    indicators.push(
      indicator(
        "impersonation_unverifiable",
        verification.claimed_org ?? "",
        "The message presents itself as a known organization, but nothing in it could be verified against that organization."
      )
    );
  }

  if (matches.length > 0) {
    positives.push({
      id: "domain_verified",
      category: "LINK",
      severity: "LOW",
      evidence: matches[0].normalized,
      explanation: "This link matches the verified official domain of the claimed organization.",
      provenance: "VERIFIED",
    });
  }

  const order = Object.keys(INDICATOR_CONFIG);
  indicators.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return { indicators, positives };
}

export function analyze(
  extraction: Extraction,
  verification: Verification,
  mode: AnalysisReport["mode"],
  id: string,
  createdAt: string
): AnalysisReport {
  const { indicators, positives } = buildIndicators(extraction, verification);
  const totalWeight = indicators.reduce(
    (sum, item) => sum + (INDICATOR_CONFIG[item.id]?.weight ?? 0),
    0
  );
  const value = score(totalWeight);
  const riskLevel = level(value);
  const risk = { score: value, level: riskLevel, summary: SUMMARIES[riskLevel] };

  return {
    id,
    created_at: createdAt,
    mode,
    extraction,
    verification,
    risk,
    indicators,
    positives,
    recommended_actions: GUIDANCE[guidanceTone({ risk, verification, positives })].actions,
  };
}
