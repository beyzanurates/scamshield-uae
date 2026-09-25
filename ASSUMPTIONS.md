# Assumptions

Decisions taken during the build that were not fully specified in `SPEC.md`.

## M1

- `src/data/verified-orgs.json` did not exist in the repo, so it was authored from the 26 seed
  organizations listed in SPEC §5. Domains and aliases still need re-verification before the demo.
- `vitest@4.1.11` is used instead of the latest release: vitest 5 requires `@types/node` 22+ and the
  spec forbids changing installed versions. The repo's npm (10.8.3) crashed on every install
  (`Cannot read properties of null (reading 'edgesOut')`); npm was upgraded to 12.1.0 to work around
  it. Node comes from nvm (v24) and is not on the default `PATH`.
- Tests live in `src/lib/__tests__/engine.test.ts` and run with `npm test`.
- The score formula is used exactly as specified. With every indicator triggered (weight sum 220)
  the score is 99, so it never reaches 100; no extra clamping was added.
- Punycode decoding is implemented in `src/lib/punycode.ts` rather than via `node:url`, because the
  verification engine also runs in the browser for the demo path.
- `impersonation_unverifiable` triggers when the claimed organization is in the registry and no link
  in the message matched its official domains.
- `suspicious_link` uses the first triggered link heuristic for its evidence line; a link can
  trigger both `domain_mismatch` and `suspicious_link`, which is why the demo scenarios score
  slightly above the minimums in the spec.
- The report's evidence cards use the first link, the first amount (falling back to the first
  payment/credential request) and the first urgency or threat cue.
- Indicator categories include `REQUEST` in addition to SENDER / LINK / PAYMENT / URGENCY so that
  credential and personal-information requests have a home; the four evidence cards are unchanged.
- The home drop zone is present but inert in M1: uploading or dropping a file reveals the demo
  scenarios with a note. Real upload, paste and `/api/analyze` arrive in M2.
- Dark navy tokens are applied by overriding the existing shadcn CSS variables in
  `src/app/globals.css` (plus `--risk-high|medium|low` and `--surface-2`), so the installed
  components inherit the palette instead of being re-themed one by one.

## M2

- The 25 s budget is split ~15 s for the primary model (including its one invalid-JSON retry) and
  the remainder for `AI_FALLBACK_MODEL`. The client aborts at 26 s so the server budget always
  resolves first.
- The fixture cache keys on the SHA-256 of the uploaded bytes, committed as `image_sha256` in
  `src/data/demo/*.json`. `scripts/hash-demo-images.mjs` re-checks the hashes against the PNGs.
  An image copied through the clipboard is re-encoded, so its hash no longer matches the fixture.
- Missing `AI_API_KEY` returns `503 {"error":"ai_unavailable"}` as SPEC §3 requires; the cached
  fixture report of SPEC §6.2 is then produced client-side in `src/lib/analyze-client.ts`, which
  hashes the same bytes and runs the fixture extraction through `buildReport(..., "fallback")`.
- Provider errors and timeouts are handled server-side: the route returns the fallback report
  directly when the hash matches, else `502 {"error":"analysis_failed"}` and the UI shows
  Retry / Try demo.
- Every request logs one line `[analyze] mode=… model=… ms=… hash_match=… fallback_model_used=…`;
  `mode=unavailable` is used for the 503 path.
- Live extraction is not byte-identical to the fixtures (the model labels the police message's
  second cue `authority` rather than `threat`), so demo-1 scores 94 live and 95 cached. Both stay
  HIGH and inside the SPEC §7 bounds.

## M3

- Guidance copy is keyed on the outcome, not on a single constant. `GUIDANCE` in
  `src/lib/scoring.ts` has four states and `guidanceTone()` picks one: `CAUTION` (MEDIUM/HIGH with
  a link — the original copy), `CAUTION_NO_LINK` (MEDIUM/HIGH with no link at all), `LOW_VERIFIED`
  (LOW with a `domain_verified` positive) and `LOW_NOTHING_TO_VERIFY` (LOW with no verified
  domain). `CAUTION_NO_LINK` exists so that "Don't use the link in the message" / "Don't click the
  link" can never appear on a report that contains no link; it keeps the cautious tone and swaps
  the first action for "Don't reply to this message".
- Both the Verify Safely headline and `recommended_actions` come from the same `GUIDANCE` entry, so
  the panel, the action list and the copied summary cannot drift apart.
- `sender_channel_anomaly` is now `provenance: "INTERPRETED"` — it is a heuristic about the shape
  of the sender, not a registry lookup. Weight, category and severity are unchanged, so no score
  moves.
- `AnalysisReport.analysis` (`{ model, latency_ms }`) is optional and set only on the live path, by
  the route, from the same numbers it logs. `provenanceLine()` in `src/lib/summary.ts` renders it as
  `Analyzed live · <model> · <latency> s`, and anything without it (demo, fallback) as
  `Cached analysis (demo fixture)`. It is used by both the `/report` footer and the copied summary.
- The Sender card keeps the SPEC §6.3 "Unverified" label on a LOW report but drops the warning
  colour: an amber chip next to a green LOW score read as a contradiction.
- The 26 verified organizations are still the ones authored in M1 from SPEC §5, since the file the
  brief referred to was never in the repo.

## M4 — English/Arabic

- Translation is a lookup, never a model call. `src/lib/i18n.ts` holds both locales' templated
  strings keyed by the ids the engine already produces (indicator id, guidance tone, risk level,
  chip, section title), so the Arabic report is as deterministic as the English one.
- English explanations stay on the indicator itself, as built by `scoring.ts`; Arabic is rebuilt
  from the same id. Values interpolated into a sentence (the official domain, the link heuristic,
  which sender-channel wording applies) travel in a new optional `Indicator.params` so the Arabic
  sentence can be assembled from the same facts rather than parsed out of the English one.
- Evidence quotes are never translated — they are what the screenshot said.
- The locale lives in `useState` on `/report` and defaults to English; there is no persistence, no
  URL parameter and no `lang` negotiation. `dir="rtl"` is set on the report container only.
  Domains, the score denominator and the provenance line are forced LTR, and indicator evidence
  uses `dir="auto"` so a phone number reads left-to-right while an Arabic quote stays RTL.
- `sender_channel_anomaly` now fires for any organization in the registry, not only government and
  bank entries — Emirates Post is typed `postal`, and the demo-4 message is exactly the case the
  indicator exists for. Government and bank reports keep the M3 wording; other registry
  organizations get a "verified registry" variant of the same sentence. Weight is unchanged.
- The registry already carried the ten Arabic aliases requested in M4 (they were authored in M1),
  and `foldText()` in `verify.ts` already strips harakat and normalizes أ/إ/آ and ة, so Arabic
  matching is diacritics-insensitive without further changes.
- Severity labels, registry status values (`MISMATCH`) and indicator ids stay English in the copied
  summary: they are identifiers someone pastes into a report or a ticket, not prose.
