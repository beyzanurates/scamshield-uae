import { GUIDANCE, SUMMARIES, type GuidanceTone } from "@/lib/scoring";
import type {
  AnalysisReport,
  Indicator,
  Provenance,
  RiskLevel,
  Severity,
  Verification,
} from "@/lib/types";
import { ORG_NOT_IN_REGISTRY_TEXT } from "@/lib/verify";

export type Locale = "en" | "ar";

/**
 * Every string below is a template chosen by the deterministic engine's own ids — nothing here
 * is translated at runtime by a model. Evidence quotes stay in the language of the screenshot.
 */
export const UI: Record<Locale, Record<string, string>> = {
  en: {
    locale_label: "EN",
    fallback_banner: "AI service unavailable — showing cached analysis",
    channel: "Channel",
    card_sender: "Sender",
    card_link: "Link",
    card_payment: "Payment",
    card_urgency: "Urgency",
    amount_requested: "requested",
    not_detected: "Not detected",
    chip_not_in_registry: "Not in registry",
    chip_unverified: "Unverified",
    chip_domain_mismatch: "Domain mismatch",
    chip_domain_verified: "Domain verified",
    chip_unverifiable: "Unverifiable",
    chip_payment_request: "Payment request",
    chip_credential_request: "Credential request",
    chip_pressure: "High-pressure language",
    chip_positive: "Positive",
    mismatch_title: "Domain mismatch",
    mismatch_observed: "Observed:",
    mismatch_official: "Verified official:",
    mismatch_result: "Result:",
    mismatch_result_value: "DOMAIN MISMATCH",
    indicators_title: "Why we flagged this",
    indicators_title_clean: "What we checked",
    indicators_empty: "No risk indicators were detected from the information available.",
    verify_title: "Verify safely",
    claimed_org: "Claimed organization:",
    official_source: "Verified official source:",
    open_official: "Open official source",
    actions_title: "What should I do?",
    ecrime: "Report to Dubai Police eCrime",
    scan_another: "Scan another message",
    copy_summary: "Copy report summary",
    copied: "Copied",
    disclaimer:
      "ScamShield identifies risk indicators. It does not provide a definitive fraud determination.",
    no_storage: "Screenshots are analyzed in memory and are not stored.",
    analyzed_live: "Analyzed live",
    cached_analysis: "Cached analysis (demo fixture)",
    seconds: "s",
    summary_title: "ScamShield UAE — risk report",
    summary_risk: "Risk",
    summary_claimed_org: "Claimed organization",
    summary_not_stated: "not stated",
    summary_registry: "Registry status",
    summary_links: "Links:",
    summary_indicators: "Risk indicators:",
    summary_positives: "Positive signals:",
  },
  ar: {
    locale_label: "العربية",
    fallback_banner: "خدمة الذكاء الاصطناعي غير متاحة — يتم عرض تحليل مُخزَّن",
    channel: "القناة",
    card_sender: "المُرسِل",
    card_link: "الرابط",
    card_payment: "الدفع",
    card_urgency: "الاستعجال",
    amount_requested: "مطلوبة",
    not_detected: "لم يُرصد",
    chip_not_in_registry: "غير مُدرجة في السجل",
    chip_unverified: "غير مُوثَّق",
    chip_domain_mismatch: "عدم تطابق النطاق",
    chip_domain_verified: "نطاق موثَّق",
    chip_unverifiable: "غير قابل للتحقق",
    chip_payment_request: "طلب دفع",
    chip_credential_request: "طلب بيانات دخول",
    chip_pressure: "لغة ضاغطة",
    chip_positive: "إشارة إيجابية",
    mismatch_title: "عدم تطابق النطاق",
    mismatch_observed: "الرابط الظاهر:",
    mismatch_official: "النطاق الرسمي الموثَّق:",
    mismatch_result: "النتيجة:",
    mismatch_result_value: "عدم تطابق النطاق",
    indicators_title: "أسباب التحذير",
    indicators_title_clean: "ما الذي فحصناه",
    indicators_empty: "لم يتم رصد أي مؤشرات خطر بناءً على المعلومات المتاحة.",
    verify_title: "تحقَّق بأمان",
    claimed_org: "الجهة المذكورة في الرسالة:",
    official_source: "المصدر الرسمي الموثَّق:",
    open_official: "فتح المصدر الرسمي",
    actions_title: "ماذا أفعل؟",
    ecrime: "الإبلاغ عبر منصة شرطة دبي للجرائم الإلكترونية",
    scan_another: "فحص رسالة أخرى",
    copy_summary: "نسخ ملخص التقرير",
    copied: "تم النسخ",
    disclaimer: "يرصد ScamShield مؤشرات الخطر ولا يقدّم حكمًا نهائيًا بوجود احتيال.",
    no_storage: "يتم تحليل لقطات الشاشة في الذاكرة ولا يتم تخزينها.",
    analyzed_live: "تحليل مباشر",
    cached_analysis: "تحليل مُخزَّن (نموذج تجريبي)",
    seconds: "ث",
    summary_title: "ScamShield UAE — تقرير المخاطر",
    summary_risk: "مستوى الخطر",
    summary_claimed_org: "الجهة المذكورة في الرسالة",
    summary_not_stated: "غير مذكورة",
    summary_registry: "حالة السجل",
    summary_links: "الروابط:",
    summary_indicators: "مؤشرات الخطر:",
    summary_positives: "إشارات إيجابية:",
  },
};

export const LEVEL_LABELS: Record<Locale, Record<RiskLevel, string>> = {
  en: { HIGH: "HIGH RISK", MEDIUM: "MEDIUM RISK", LOW: "LOW RISK" },
  ar: { HIGH: "خطورة مرتفعة", MEDIUM: "خطورة متوسطة", LOW: "خطورة منخفضة" },
};

export const SEVERITY_LABELS: Record<Locale, Record<Severity, string>> = {
  en: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" },
  ar: { HIGH: "مرتفع", MEDIUM: "متوسط", LOW: "منخفض" },
};

export const PROVENANCE_LABELS: Record<Locale, Record<Provenance, string>> = {
  en: { EXTRACTED: "Extracted", VERIFIED: "Verified", INTERPRETED: "AI interpretation" },
  ar: { EXTRACTED: "مُستخرج", VERIFIED: "مُوثَّق", INTERPRETED: "تفسير الذكاء الاصطناعي" },
};

export const CHANNEL_LABELS: Record<Locale, Record<string, string>> = {
  en: { whatsapp: "whatsapp", sms: "sms", email: "email", social: "social", unknown: "unknown" },
  ar: {
    whatsapp: "واتساب",
    sms: "رسالة نصية",
    email: "بريد إلكتروني",
    social: "شبكة اجتماعية",
    unknown: "غير معروفة",
  },
};

const RISK_SUMMARIES_AR: Record<RiskLevel, string> = {
  HIGH: "تحتوي هذه الرسالة على عدة مؤشرات ترتبط عادةً بانتحال الصفة أو الطلبات الاحتيالية.",
  MEDIUM: "تحتوي هذه الرسالة على بعض مؤشرات الخطر. تحقَّق قبل اتخاذ أي إجراء.",
  LOW: "لم يتم رصد مؤشرات خطر رئيسية بناءً على المعلومات المتاحة.",
};

const GUIDANCE_AR: Record<GuidanceTone, { headline: string; footnote: string; actions: string[] }> =
  {
    CAUTION: {
      headline: "لا تستخدم الرابط الوارد في الرسالة.",
      footnote:
        "انتقل مباشرةً إلى الموقع الرسمي للجهة أو تطبيقها بدلًا من استخدام الروابط الواردة في الرسائل المشبوهة.",
      actions: [
        "لا تضغط على الرابط",
        "لا ترسل أموالًا أو معلومات شخصية",
        "تحقَّق مباشرةً من خلال الجهة الرسمية",
      ],
    },
    CAUTION_NO_LINK: {
      headline: "تحقَّق من هذه الرسالة مباشرةً مع الجهة المعنية.",
      footnote:
        "انتقل مباشرةً إلى الموقع الرسمي للجهة أو تطبيقها بدلًا من الرد على رسالة لم تكن تتوقعها.",
      actions: [
        "لا ترد على هذه الرسالة",
        "لا ترسل أموالًا أو معلومات شخصية",
        "تحقَّق مباشرةً من خلال الجهة الرسمية",
      ],
    },
    LOW_VERIFIED: {
      headline:
        "يتطابق هذا الرابط مع النطاق الرسمي الموثَّق. وللمزيد من الأمان، انتقل إلى الموقع أو التطبيق مباشرةً بدلًا من الضغط على الرابط.",
      footnote: "تطابق النطاق يؤكد وجهة الرابط، لا هوية من أرسل الرسالة.",
      actions: [
        "لم يتم رصد مؤشرات رئيسية",
        "تحقَّق عبر التطبيق الرسمي إذا راودك الشك",
        "أبلغ إذا بقي لديك شعور بأن هناك خطأ ما",
      ],
    },
    LOW_NOTHING_TO_VERIFY: {
      headline: "لا يوجد في هذه الرسالة ما يمكن التحقق منه.",
      footnote: "تواصل مع الجهة عبر تطبيقها أو موقعها الرسمي إذا أردت تأكيد هذه الرسالة.",
      actions: [
        "لم يتم رصد مؤشرات رئيسية",
        "إذا راودك الشك، تواصل مع الجهة عبر تطبيقها أو موقعها الرسمي",
        "أبلغ إذا بقي لديك شعور بأن هناك خطأ ما",
      ],
    },
  };

const HEURISTIC_TEXT_AR: Record<string, string> = {
  url_shortener: "يستخدم الرابط خدمة اختصار تُخفي وجهته الحقيقية",
  raw_ip_host: "يشير الرابط إلى عنوان IP مباشر بدلًا من اسم نطاق",
  lookalike_domain: "يحاكي النطاق اسم جهة معروفة",
  non_ae_government_host:
    "الرابط ليس على نطاق إماراتي (\u200E.ae\u200E) رغم ادعائه الانتماء إلى جهة حكومية إماراتية",
};

/** Isolates a domain, URL or other LTR token inside an Arabic sentence so punctuation stays put. */
function ltr(value: string): string {
  return `\u200E${value}\u200E`;
}

/** Arabic counterparts of the explanations built in scoring.ts, keyed by the same indicator ids. */
const INDICATOR_TEXT_AR: Record<string, (indicator: Indicator) => string> = {
  domain_mismatch: (indicator) =>
    `لا يتطابق هذا الرابط مع النطاق الرسمي الموثَّق ${ltr(indicator.params?.official_domain ?? "")}.`,
  suspicious_link: (indicator) =>
    `يُظهر هذا الرابط نمطًا مريبًا: ${HEURISTIC_TEXT_AR[indicator.params?.heuristic ?? ""] ?? ""}.`,
  credentials_or_otp_request: () =>
    "تطلب الرسالة كلمة مرور لمرة واحدة أو بيانات تسجيل الدخول، وهي معلومات لا تطلبها الجهات الرسمية.",
  payment_request: () => "تطلب الرسالة دفعة عبر قناة تعذّر التحقق منها.",
  personal_info_request: () =>
    "تطلب الرسالة معلومات شخصية يمكن استخدامها لانتحال شخصيتك.",
  urgency: () => "تضغط الرسالة عليك للتصرف فورًا، وهو أسلوب يرتبط عادةً بالاحتيال.",
  threat: () => "تهدد الرسالة بعقوبة أو خسارة في حال عدم التصرف.",
  reward_bait: () => "تعرض الرسالة مكافأة لدفعك إلى التصرف بسرعة.",
  sender_channel_anomaly: (indicator) =>
    indicator.params?.sender_channel === "registry"
      ? "تصل رسائل الجهات المُدرجة في سجل الجهات الموثَّقة عادةً من معرّفات مرسل مسجّلة، لا من أرقام هواتف شخصية أو دولية."
      : "تصل رسائل الجهات الحكومية والبنوك في الإمارات عادةً من معرّفات مرسل مسجّلة، لا من أرقام هواتف شخصية أو دولية.",
  impersonation_unverifiable: () =>
    "تقدّم الرسالة نفسها على أنها من جهة معروفة، لكن لا شيء فيها أمكن التحقق منه لدى تلك الجهة.",
  domain_verified: () => "يتطابق هذا الرابط مع النطاق الرسمي الموثَّق للجهة المذكورة في الرسالة.",
};

export function riskSummary(locale: Locale, level: RiskLevel): string {
  return locale === "ar" ? RISK_SUMMARIES_AR[level] : SUMMARIES[level];
}

export function guidanceText(
  locale: Locale,
  tone: GuidanceTone
): { headline: string; footnote: string; actions: string[] } {
  return locale === "ar" ? GUIDANCE_AR[tone] : GUIDANCE[tone];
}

/** English explanations are already on the indicator; Arabic is rebuilt from the same id. */
export function indicatorText(locale: Locale, indicator: Indicator): string {
  if (locale === "en") return indicator.explanation;
  return INDICATOR_TEXT_AR[indicator.id]?.(indicator) ?? indicator.explanation;
}

export function registryStatusText(locale: Locale, verification: Verification): string {
  if (locale === "en") return verification.status_text;
  return verification.status === "VERIFIED_ORG_FOUND"
    ? `${ltr(verification.claimed_org ?? "")} مُدرجة في سجل الجهات الموثَّقة.`
    : "تعذّر التحقق من هذه الجهة من المصادر المتاحة.";
}

export function orgNotInRegistryText(locale: Locale): string {
  return locale === "ar"
    ? "تعذّر التحقق من هذه الجهة من المصادر المتاحة."
    : ORG_NOT_IN_REGISTRY_TEXT;
}

/** Where the analysis came from: the live model and its latency, or the cached demo fixture. */
export function provenanceLine(locale: Locale, report: AnalysisReport): string {
  const t = UI[locale];
  if (report.mode === "live" && report.analysis) {
    const seconds = (report.analysis.latency_ms / 1000).toFixed(1);
    return `${t.analyzed_live} · ${report.analysis.model} · ${seconds} ${t.seconds}`;
  }
  return t.cached_analysis;
}
