export type Channel = "whatsapp" | "sms" | "email" | "social" | "unknown";
export type Language = "en" | "ar" | "mixed" | "other";

export type RequestType =
  | "payment"
  | "credentials_otp"
  | "personal_info"
  | "click_link"
  | "call_number"
  | "other";

export type PressureCueType = "urgency" | "threat" | "reward" | "authority";

export interface Amount {
  value: number;
  currency: string;
  quote: string;
}

export interface MessageRequest {
  type: RequestType;
  quote: string;
}

export interface PressureCue {
  type: PressureCueType;
  quote: string;
}

export interface Extraction {
  channel: Channel;
  language: Language;
  message_text: string;
  claimed_sender: string | null;
  sender_handle: string | null;
  urls: string[];
  phone_numbers: string[];
  amounts: Amount[];
  requests: MessageRequest[];
  pressure_cues: PressureCue[];
  extraction_confidence: number;
}

export type OrgType = "government" | "bank" | "telecom" | "postal" | "airline" | "commerce" | "other";

export interface VerifiedOrg {
  id: string;
  name: string;
  aliases: string[];
  type: OrgType;
  official_domains: string[];
  official_app?: string;
  report_url?: string;
  sources: string[];
}

export type DomainResult = "MATCH" | "MISMATCH" | "UNVERIFIABLE";

export interface DomainCheck {
  raw: string;
  normalized: string;
  result: DomainResult;
  reasons: LinkHeuristic[];
}

export type LinkHeuristic =
  | "url_shortener"
  | "raw_ip_host"
  | "lookalike_domain"
  | "non_ae_government_host";

export type VerificationStatus = "VERIFIED_ORG_FOUND" | "ORG_NOT_IN_REGISTRY";

export interface ReportChannel {
  label: string;
  url: string;
}

export interface Verification {
  claimed_org: string | null;
  org_id: string | null;
  org_type: OrgType | null;
  official_app: string | null;
  status: VerificationStatus;
  status_text: string;
  official_domains: string[];
  report_channels: ReportChannel[];
  domain_checks: DomainCheck[];
  sender_channel_anomaly: boolean;
}

export type Provenance = "EXTRACTED" | "VERIFIED" | "INTERPRETED";
export type Severity = "LOW" | "MEDIUM" | "HIGH";
export type IndicatorCategory = "SENDER" | "LINK" | "PAYMENT" | "URGENCY" | "REQUEST";

export interface Indicator {
  id: string;
  category: IndicatorCategory;
  severity: Severity;
  evidence: string;
  explanation: string;
  provenance: Provenance;
  /** Values interpolated into the explanation, so other locales can rebuild the same sentence. */
  params?: { official_domain?: string; heuristic?: string; sender_channel?: string };
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Risk {
  score: number;
  level: RiskLevel;
  summary: string;
}

export type AnalysisMode = "live" | "demo" | "fallback";

/** Provenance of a live analysis, shown on the report so the demo audience can see it was real. */
export interface AnalysisMeta {
  model: string;
  latency_ms: number;
}

export interface AnalysisReport {
  id: string;
  created_at: string;
  mode: AnalysisMode;
  analysis?: AnalysisMeta;
  extraction: Extraction;
  verification: Verification;
  risk: Risk;
  indicators: Indicator[];
  positives: Indicator[];
  recommended_actions: string[];
}
