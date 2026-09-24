# ScamShield UAE — Hackathon MVP Spec (Security & Governance track, ~4h build)

## 0. How to work (read first)
- Repo: https://github.com/beyzanurates/scamshield-uae. It is already scaffolded (Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui; `npm run dev` works). If the repo turns out to be empty, scaffold it with `npx create-next-app@latest` (TypeScript, Tailwind, ESLint, App Router, `src/` dir, npm) and `npx shadcn@latest init`, then continue.
- Save this message verbatim as `SPEC.md` in the repo root and commit it before anything else (if it already exists, keep it as is).
- Work on branch `devin/mvp`. Commit after each milestone (`M1: ...`), push, open ONE pull request after M1 and keep pushing to it.
- This is a time-boxed hackathon build. Deliver milestones in order (M1 → M2 → M3 → M4). Each milestone must leave the app in a demoable state.
- Do not ask me questions about minor decisions. Make a sensible choice, log it in `ASSUMPTIONS.md`, continue. Only stop if you are truly blocked.
- If any install/tool/dependency fails for more than ~10 minutes, switch to the simplest alternative (e.g., plain Tailwind components instead of shadcn) and move on.
- Do not add features not listed here. Do not refactor working code. Do not change framework versions.
- AI key: read `AI_API_KEY` from env (stored in Devin secrets). Never print or commit it. Commit `.env.example` only.
- Definition of done for EVERY milestone: `npm run lint` and `npm run build` pass; `npm run dev` runs; you open the app in your browser at 1440px, walk the full flow, and attach a screenshot of each screen to your report; the demo scenarios in section 7 produce the expected results.

## 1. Product (one paragraph)
ScamShield UAE is a web app: a user uploads a screenshot of a suspicious WhatsApp/SMS/email/social message; the app extracts what the message says and claims, checks the claimed organization and any links against a small verified UAE registry, computes an explainable risk score, and shows a safe way to verify through the organization's official channel. It identifies risk indicators; it never claims to definitively know whether a message is fraudulent.

## 2. Non-goals (do NOT build)
Auth, accounts, database, admin panel, payments, browser extension, WhatsApp integration, mobile app, i18n framework, analytics, deployment pipeline, tests beyond the unit tests in 4.3.

## 3. Stack & constraints
- Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui. Already installed shadcn components: Button, Card, Badge, Progress, Separator, Tooltip. lucide-react icons. Inter via `next/font`.
- Tailwind is v4: define design tokens in `src/app/globals.css` with `@theme`; there is no tailwind.config file — do not create one.
- shadcn Tooltip requires wrapping the app in `TooltipProvider` in `src/app/layout.tsx`.
- One API route: `POST /api/analyze` (Node runtime), `multipart/form-data` with `image` (png/jpg/webp, ≤ 8 MB). Returns `AnalysisReport` JSON. Image bytes are processed in memory only — never written to disk.
- No global state library. React state + `sessionStorage` for the last report so `/report` survives a refresh.
- AI provider: OpenRouter — OpenAI-compatible Chat Completions at https://openrouter.ai/api/v1/chat/completions (Authorization: Bearer AI_API_KEY; image sent as image_url data URL). Env vars: `AI_API_KEY`, `AI_MODEL` (default `anthropic/claude-sonnet-5`), optional `AI_FALLBACK_MODEL` (if set and the primary model call fails, retry once with it before using demo fixtures). If `AI_API_KEY` is missing, `/api/analyze` returns HTTP 503 `{ "error": "ai_unavailable" }` and the UI falls back as described in 6.2.
- Single run command: `npm run dev`.

## 4. Architecture — "AI extracts, code decides"
Three stages, strictly separated in code.

### 4.1 Extraction — `src/lib/extract.ts` (the only AI step)
A verified, working example of calling the vision API with an image is in `scripts/test-vision.mjs` — reuse its request shape. Send the screenshot to the vision model with a system prompt that returns ONLY observable facts as strict JSON (temperature 0). Strip markdown code fences (```json ... ```) from the model output before parsing. Validate with zod (`src/lib/schemas.ts`); on invalid JSON retry once, then throw.
{
  "channel": "whatsapp|sms|email|social|unknown",
  "language": "en|ar|mixed|other",
  "message_text": "verbatim text in the original language",
  "claimed_sender": "string|null",
  "sender_handle": "string|null",
  "urls": ["..."],
  "phone_numbers": ["..."],
  "amounts": [{"value": 420, "currency": "AED", "quote": "Pay AED 420"}],
  "requests": [{"type": "payment|credentials_otp|personal_info|click_link|call_number|other", "quote": "..."}],
  "pressure_cues": [{"type": "urgency|threat|reward|authority", "quote": "..."}],
  "extraction_confidence": 0.0
}
`claimed_sender` = the name/organization the message presents itself as. `sender_handle` = phone number, short code, alphanumeric sender ID, email or username as shown. The model must NOT output a risk score, verdict or opinion. Quotes must be verbatim substrings of `message_text`.

### 4.2 Verification — `src/lib/verify.ts` (deterministic, no AI)
- Load `src/data/verified-orgs.json`. Match `claimed_sender` against `name` and `aliases` (case-insensitive, diacritics-insensitive, Arabic aliases included, simple token containment). Result: `VERIFIED_ORG_FOUND` or `ORG_NOT_IN_REGISTRY`.
- Normalize every URL: lowercase; strip scheme, `www.`, path, query, fragment, port, trailing dot; decode punycode. Keep raw and normalized.
- Domain check per URL, only when an org was found: MATCH if the normalized host equals an `official_domains` entry OR ends with `.` + that entry. (`pay.dubaipolice.gov.ae` → MATCH; `dubaipolice.gov.ae.pay-now.com` → MISMATCH; `dubai-police-fine-payment.com` → MISMATCH.)
- Independent link heuristics (apply regardless of org): URL shorteners (bit.ly, tinyurl.com, t.co, cutt.ly, rb.gy, is.gd), raw IP hosts, lookalikes (host contains a registry org token plus extra hyphens/words), non-`.ae` host while claiming to be a UAE government body.
- Sender-channel heuristic: if the matched org is `government` or `bank` and `sender_handle` looks like a personal mobile (`+971 5x`, `05x`) or a non-+971 international number → `sender_channel_anomaly`.
- If org is not in the registry: status text is exactly "Unable to verify this organization from available sources." Never call a domain fake in that case; label the link "Unverifiable".

### 4.3 Scoring — `src/lib/scoring.ts` (deterministic, one config object)
Weights: `domain_mismatch` 50 · `credentials_or_otp_request` 35 · `payment_request` 25 · `suspicious_link` 20 · `personal_info_request` 20 · `impersonation_unverifiable` 15 (claims an org that IS in the registry but no link/sender could be verified) · `urgency` 15 · `threat` 15 · `sender_channel_anomaly` 15 · `reward_bait` 10.
S = sum of triggered weights. `score = round(100 * (1 - exp(-S / 50)))` — saturating, never reaches 100 because we never claim certainty. Levels: LOW 0–29, MEDIUM 30–69, HIGH 70–100.
Positive signals are recorded with weight 0 and shown in green: `domain_verified` when a link matches the official domain.
Each indicator: `{ id, category, severity: LOW|MEDIUM|HIGH, evidence (verbatim quote or domain), explanation (one plain sentence), provenance: EXTRACTED|VERIFIED|INTERPRETED }`. EXTRACTED = read from the screenshot; VERIFIED = compared against the registry; INTERPRETED = AI/heuristic judgment about language or intent.
Write 6–8 vitest unit tests for `normalizeDomain`, `domainMatches` and `score`, including the three demo scenarios, and make them pass.

### 4.4 `AnalysisReport` — `src/lib/types.ts`
`{ id, created_at, mode: "live"|"demo"|"fallback", extraction, verification: { claimed_org, status, official_domains, report_channels, domain_checks: [{ raw, normalized, result: "MATCH"|"MISMATCH"|"UNVERIFIABLE" }] }, risk: { score, level, summary }, indicators: [...], positives: [...], recommended_actions: [...] }`

## 5. Verified registry — `src/data/verified-orgs.json`
Entry shape:
{ "id": "dubai-police", "name": "Dubai Police", "aliases": ["شرطة دبي", "Dubai Police Force", "DubaiPolice"], "type": "government", "official_domains": ["dubaipolice.gov.ae"], "official_app": "Dubai Police app", "report_url": "https://ecrime.ae", "sources": ["https://www.dubaipolice.gov.ae"] }
Seed entries (I will re-verify each domain before the demo; keep the file easy to extend):
Dubai Police — dubaipolice.gov.ae · Abu Dhabi Police — adpolice.gov.ae · RTA Dubai — rta.ae · Salik — salik.ae · DEWA — dewa.gov.ae · Emirates Post — emiratespost.ae · e& (Etisalat) — etisalat.ae, eand.com · du — du.ae · Federal Tax Authority — tax.gov.ae · ICP — icp.gov.ae · MOHRE — mohre.gov.ae · UAE PASS — uaepass.ae · UAE Government portal — u.ae · TDRA — tdra.gov.ae · Central Bank of the UAE — centralbank.ae · Emirates NBD — emiratesnbd.com · FAB — bankfab.com · ADCB — adcb.com · Mashreq — mashreq.com · Dubai Islamic Bank — dib.ae · RAKBANK — rakbank.ae · Emirates — emirates.com · Etihad — etihad.com · Aramex — aramex.com · noon — noon.com · Careem — careem.com
Global report channel shown on every report: Dubai Police eCrime (https://ecrime.ae). Add per-org `report_url` only where I provide it.

## 6. Screens (use the exact copy given)

### 6.1 `/` HOME
- Wordmark "SCAMSHIELD UAE"; subtitle "Before you click, know what you're looking at."
- Large drop zone: "Drop a screenshot here" / "or upload screenshot" / "WhatsApp · SMS · Email · Social". Supports drag-and-drop, click, and paste from clipboard (Cmd/Ctrl+V) — paste matters for the live demo.
- Secondary button "Try demo" → reveals three demo cards (thumbnail + one-line description). Clicking a card runs that scenario (section 7).
- Footer: "ScamShield identifies risk indicators. It does not provide a definitive fraud determination." and "Screenshots are analyzed in memory and are not stored."

### 6.2 ANALYZING (overlay or `/analyzing`)
- "Analyzing your message…" with steps: ✓ Reading message · ✓ Identifying sender · ✓ Extracting links · ✓ Checking risk signals · → Verifying claimed organization.
- The step animation runs for a minimum of 3.5 s regardless of API speed; the API call runs in parallel; the report opens when both are done.
- Timeout 25 s. On timeout / error / 503: if the uploaded image's SHA-256 matches a demo fixture image, use that fixture's extraction JSON and show a small banner "AI service unavailable — showing cached analysis"; otherwise show a friendly error with "Retry" and "Try demo".
- Every path (live / demo / fallback) runs through the SAME verify + score code. Demo mode replaces only the extraction step.

### 6.3 `/report` RISK REPORT
- Header: level chip (HIGH / MEDIUM / LOW), circular score ring e.g. "94 / 100", and the summary line:
  HIGH: "This message contains multiple indicators commonly associated with impersonation or fraudulent requests."
  MEDIUM: "This message contains some risk indicators. Verify before acting."
  LOW: "No major risk indicators detected from the information available."
- Four evidence cards in a row — SENDER / LINK / PAYMENT / URGENCY. Example: SENDER "Dubai Police" + chip "Unverified"; LINK "dubai-police-fine-payment.com" + chip "Domain mismatch" (red) | "Domain verified" (green) | "Unverifiable" (gray); PAYMENT "AED 420 requested" + "Payment request"; URGENCY "Pay immediately" + "High-pressure language". Show a "Not detected" state when a card has nothing.
- Domain mismatch block, visually prominent, only when applicable: "Observed: dubai-police-fine-payment.com · Verified official: dubaipolice.gov.ae · Result: DOMAIN MISMATCH".
- "Why we flagged this": one row per indicator with the verbatim quote, the one-sentence explanation, severity, and a provenance chip (EXTRACTED / VERIFIED / AI INTERPRETATION). Positives listed last, in green.
- "VERIFY SAFELY" panel: "Don't use the link in the message." · CLAIMED ORGANIZATION: Dubai Police · VERIFIED OFFICIAL SOURCE: dubaipolice.gov.ae · button "Open official source" (opens the registry domain in a new tab — never a URL from the message) · "Navigate directly to the organization's official website or app instead of using links contained in suspicious messages." If the org is not in the registry: show "Unable to verify this organization from available sources." and no button.
- "WHAT SHOULD I DO?": 1. Don't click the link · 2. Don't send money or personal information · 3. Verify directly through the official organization. Link: "Report to Dubai Police eCrime" (https://ecrime.ae). Buttons: "Scan another message", "Copy report summary" (plain text to clipboard).

## 7. Demo scenarios — `src/data/demo/*.json` + `public/demo/*.png`
Each fixture = `{ id, title, image, extraction (exact JSON the extractor would return), expected: { level, min_score | max_score } }`. The real verify/score engine computes the result — it must satisfy `expected`.
- demo-1 "Fake Dubai Police fine" (SMS, EN): claimed_sender "Dubai Police"; text "Your traffic fine is pending. Pay AED 420 immediately to avoid additional penalties. dubai-police-fine-payment.com"; sender_handle an international mobile number. Expected HIGH, score ≥ 88. Indicators: domain_mismatch, payment_request, urgency, threat, sender_channel_anomaly, impersonation_unverifiable.
- demo-2 "Bank OTP request" (WhatsApp, EN): claimed_sender "Emirates NBD"; asks to "verify your account within 24 hours" and "enter the OTP we sent you"; link enbd-secure-verify.com. Expected HIGH, score ≥ 80. Indicators: credentials_or_otp_request, domain_mismatch, urgency.
- demo-3 "DEWA service notice" (SMS, EN): claimed_sender "DEWA"; informational notice about scheduled maintenance; no payment or credential request; link https://www.dewa.gov.ae. Expected LOW, score ≤ 10. Positive: domain_verified.
- demo-4 (M4 only) "Parcel fee, Arabic" (SMS, AR): Emirates Post impersonation asking for a small delivery fee via a non-official link. Expected HIGH.
The PNGs are in `public/demo/`; each fixture's `extraction` JSON must transcribe its PNG exactly (run `scripts/test-vision.mjs` on each PNG to get the text, then correct by hand if needed). If any is missing, generate a simple placeholder (phone-style card rendering the message text) with a small Node script so the demo still works; I will replace them.

## 8. Language rules (hard requirements)
- Never use "scam", "fraudulent" or "fake" as a verdict. Use "risk indicators", "commonly associated with", "could not be verified", "does not match the verified official domain".
- Never say "100% safe" or "this is legitimate". LOW copy is exactly: "No major risk indicators detected from the information available."
- Never assert an organization sent the message because its name or logo appears.
- Never label a domain as mismatch unless the claimed org is in the registry and the comparison was actually performed.
- Every claim on the report page carries a provenance chip.

## 9. Design spec
- Look: premium, minimal, trustworthy security product — a dashboard, not a landing page. Dark navy only.
- Tokens: bg #0B1220 · surface #111B2E · surface-2 #16213A · border #1F2B47 · text #E6EDF7 · muted #8B9BB4 · accent #3B82F6 · high #EF4444 · medium #F59E0B · low #22C55E. Red appears only on the HIGH chip, the score ring and the domain-mismatch block.
- Cards radius 16px, 1px border, no drop shadows; buttons radius 12px; page max-width 1040px; section spacing 32px; card padding 24px; Inter, headings weight 600, body 15–16px; chips uppercase 11px tracking-wide.
- Score ring: SVG circular progress, 120px, stroke colored by level, animated once on mount.
- Desktop first (1440px); must remain usable at 375px (cards stack).
- No emojis, no stock illustrations, no gradients except one subtle radial glow behind the home hero.

## 10. Milestones
M1 (~60 min) — Skeleton + engine + demo: types, schemas, registry, verify, scoring + unit tests, demo fixtures, Home → Analyzing → Report with "Try demo" working end to end with NO AI. Push, open PR, report with screenshots.
M2 (~45 min) — Live AI: `/api/analyze`, `extract.ts` with the vision prompt, upload + paste, zod validation, timeout/fallback, SHA-256 fixture cache, "cached analysis" banner. Test by uploading the demo PNGs through the real UI and one screenshot I attach; include the raw extraction JSON for each in your report.
M3 (~45 min) — Verify Safely + What should I do + eCrime link + Copy summary, "Not detected"/empty states, 375px pass, README (how to run, where the key goes, how demo and fallback modes work, where the registry lives and how to add an org), ASSUMPTIONS.md, DEMO_SCRIPT.md (a 90-second click path). Record a screen recording of the full flow with the three demo scenarios and attach it.
M4 (only if everything above is done) — EN/AR toggle on the report that switches the templated explanation strings (kept in `src/lib/i18n.ts`, deterministic, not AI-generated; evidence quotes stay in the original language); demo-4 fixture.

## 11. Report format (every milestone)
1) What was built + file list. 2) Screenshot of each screen at 1440px. 3) Results of the demo scenarios (level, score, indicator ids). 4) Exact commands to run. 5) Known issues and assumptions. Keep it short.
