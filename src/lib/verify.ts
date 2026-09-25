import registry from "@/data/verified-orgs.json";
import { punycodeToUnicode } from "@/lib/punycode";
import type {
  DomainCheck,
  DomainResult,
  Extraction,
  LinkHeuristic,
  ReportChannel,
  Verification,
  VerifiedOrg,
} from "@/lib/types";

export const ORG_NOT_IN_REGISTRY_TEXT =
  "Unable to verify this organization from available sources.";

export const ECRIME: ReportChannel = {
  label: "Report to Dubai Police eCrime",
  url: "https://ecrime.ae",
};

const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "cutt.ly", "rb.gy", "is.gd"];

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

export const verifiedOrgs = registry as VerifiedOrg[];

/** Lowercase, strip diacritics and non-alphanumerics, so "e& (Etisalat)" ~ "etisalat". */
function foldText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u0652\u0670]/g, "")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0629/g, "\u0647")
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return foldText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}

/** Lowercase host without scheme, credentials, `www.`, port, path, query, fragment or trailing dot. */
export function normalizeDomain(raw: string): string {
  let host = raw.trim().toLowerCase();
  host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  host = host.split(/[/?#]/)[0];
  host = host.split("@").pop() ?? host;
  host = host.replace(/:\d+$/, "");
  host = host.replace(/\.+$/, "");
  host = host.replace(/^www\./, "");
  return punycodeToUnicode(host);
}

/** True when the host is the official domain itself or a subdomain of it. */
export function domainMatches(host: string, officialDomain: string): boolean {
  const normalizedHost = normalizeDomain(host);
  const official = normalizeDomain(officialDomain);
  return normalizedHost === official || normalizedHost.endsWith(`.${official}`);
}

export function findOrg(claimedSender: string | null): VerifiedOrg | null {
  if (!claimedSender) return null;
  const senderTokens = tokenize(claimedSender);
  if (senderTokens.length === 0) return null;
  const senderText = ` ${senderTokens.join(" ")} `;

  let best: { org: VerifiedOrg; weight: number } | null = null;
  for (const org of verifiedOrgs) {
    for (const candidate of [org.name, ...org.aliases]) {
      const candidateTokens = tokenize(candidate);
      if (candidateTokens.length === 0) continue;
      const candidateText = candidateTokens.join(" ");
      if (
        senderText.includes(` ${candidateText} `) ||
        ` ${candidateText} `.includes(senderText)
      ) {
        const weight = candidateTokens.length;
        if (!best || weight > best.weight) best = { org, weight };
      }
    }
  }
  return best?.org ?? null;
}

function linkHeuristics(normalized: string, org: VerifiedOrg | null): LinkHeuristic[] {
  const reasons: LinkHeuristic[] = [];
  if (SHORTENERS.includes(normalized)) reasons.push("url_shortener");
  if (IPV4.test(normalized)) reasons.push("raw_ip_host");

  const hostTokens = normalized.split(/[.\-_]/).filter(Boolean);
  const hyphenCount = (normalized.match(/-/g) ?? []).length;
  const registryTokens = new Set(
    verifiedOrgs.flatMap((entry) =>
      entry.official_domains.map((domain) => domain.split(".")[0])
    )
  );
  const containsOrgToken = hostTokens.some(
    (token) => token.length > 2 && registryTokens.has(token)
  );
  const looksLikeOrgName =
    org !== null &&
    tokenize(org.name).some((token) => token.length > 2 && normalized.includes(token));
  if ((containsOrgToken || looksLikeOrgName) && hyphenCount > 0) {
    reasons.push("lookalike_domain");
  }

  if (org?.type === "government" && !normalized.endsWith(".ae")) {
    reasons.push("non_ae_government_host");
  }
  return reasons;
}

/** A personal UAE mobile, or a foreign number, used by an org that only messages from short codes. */
export function isPersonalOrForeignNumber(handle: string | null): boolean {
  if (!handle) return false;
  const compact = handle.replace(/[\s()\-.]/g, "");
  if (!/^\+?\d{7,}$/.test(compact)) return false;
  if (/^(\+971|00971)5\d/.test(compact)) return true;
  if (/^05\d/.test(compact)) return true;
  if (/^(\+|00)/.test(compact) && !/^(\+971|00971)/.test(compact)) return true;
  return false;
}

export function verify(extraction: Extraction): Verification {
  const org = findOrg(extraction.claimed_sender);
  const officialDomains = org?.official_domains ?? [];

  const domainChecks: DomainCheck[] = extraction.urls.map((raw) => {
    const normalized = normalizeDomain(raw);
    const reasons = linkHeuristics(normalized, org);
    let result: DomainResult = "UNVERIFIABLE";
    if (org) {
      result = officialDomains.some((domain) => domainMatches(normalized, domain))
        ? "MATCH"
        : "MISMATCH";
    }
    return { raw, normalized, result, reasons };
  });

  const senderChannelAnomaly =
    (org?.type === "government" || org?.type === "bank") &&
    isPersonalOrForeignNumber(extraction.sender_handle);

  const reportChannels: ReportChannel[] = [ECRIME];
  if (org?.report_url && org.report_url !== ECRIME.url) {
    reportChannels.unshift({ label: `${org.name} reporting channel`, url: org.report_url });
  }

  return {
    claimed_org: extraction.claimed_sender,
    org_id: org?.id ?? null,
    org_type: org?.type ?? null,
    official_app: org?.official_app ?? null,
    status: org ? "VERIFIED_ORG_FOUND" : "ORG_NOT_IN_REGISTRY",
    status_text: org
      ? `${org.name} is listed in the verified organization registry.`
      : ORG_NOT_IN_REGISTRY_TEXT,
    official_domains: officialDomains,
    report_channels: reportChannels,
    domain_checks: domainChecks,
    sender_channel_anomaly: Boolean(senderChannelAnomaly),
  };
}
