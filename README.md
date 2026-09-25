# ScamShield UAE

Paste a screenshot of a suspicious WhatsApp, SMS, email or social message. ScamShield extracts the
observable facts with a vision model, checks the claimed organization and any links against a
verified UAE registry, and shows deterministic, explainable risk indicators plus a safe way to
verify. It never claims a message *is* fraud — it shows what it can and cannot confirm.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts: `npm test` (vitest), `npm run lint`, `npm run build`.

## The AI key

Live analysis calls [OpenRouter](https://openrouter.ai) server-side. Put the key in
`.env.local` at the repo root — it is read only in the Node route and never reaches the browser:

```bash
AI_API_KEY=sk-or-...            # required for live mode
AI_MODEL=anthropic/claude-sonnet-5   # optional, this is the default
AI_FALLBACK_MODEL=               # optional, tried once if the primary model fails
```

## The three modes

| Mode | When | What you see |
| --- | --- | --- |
| **live** | A screenshot is uploaded, pasted or dropped and `AI_API_KEY` is set | Real extraction from the model. Footer: `Analyzed live · <model> · <latency> s` |
| **demo** | "Try demo" on the home page | A committed extraction for one of the three demo screenshots |
| **fallback** | The provider fails/times out, or `AI_API_KEY` is missing, *and* the uploaded image is one of the demo screenshots | The same cached extraction, plus the banner "AI service unavailable — showing cached analysis" |

All three run through the *same* `buildReport()` → `verify()` → `analyze()` pipeline: only the
source of the extraction changes, never the scoring. Any other failure shows Retry / Try demo.

Fallback matching is by SHA-256 of the uploaded bytes (`image_sha256` in `src/data/demo/*.json`,
re-checkable with `node scripts/hash-demo-images.mjs`). Note that copying an image through the
clipboard re-encodes it, so a pasted demo screenshot will not hash-match.

Every request logs one line to the server console, which is worth watching during a demo:

```
[analyze] mode=live model=anthropic/claude-sonnet-5 ms=5297 hash_match=true fallback_model_used=false
```

## The registry

Verified organizations live in [`src/data/verified-orgs.json`](src/data/verified-orgs.json) — the
only source of truth for "official". To add one, append an entry:

```json
{
  "id": "adnoc-distribution",
  "name": "ADNOC Distribution",
  "aliases": ["ADNOC", "أدنوك"],
  "type": "company",
  "official_domains": ["adnocdistribution.ae"],
  "official_app": "ADNOC Distribution app",
  "report_url": "https://ecrime.ae",
  "sources": ["https://www.adnocdistribution.ae"]
}
```

- `aliases` are matched case- and diacritics-insensitively, so add the Arabic name and the common
  short forms the message text is likely to use.
- `official_domains` drive the MATCH / MISMATCH decision, including subdomains
  (`pay.adnocdistribution.ae` matches). An organization with no entry here is reported as
  UNVERIFIABLE, never as a mismatch.

Nothing else needs to change: verification, scoring and the UI read the registry at runtime.

## How it works

```
screenshot ──▶ extract.ts (AI: observable facts only)
                    │
                    ▼
               verify.ts (registry + domain normalization/punycode/heuristics)
                    │
                    ▼
              scoring.ts (weighted indicators, saturating score, LOW/MEDIUM/HIGH)
                    │
                    ▼
                /report
```

The model is never asked for a score or a verdict — only for what is visible in the screenshot.
Every indicator on the report carries a provenance chip saying whether it came from the registry
(VERIFIED), from a rule (HEURISTIC) or from the model's reading of the text (AI INTERPRETATION).

Screenshots are held in memory for the duration of the request and are never written to disk or
stored. There is no database and no account.

See [SPEC.md](SPEC.md) for the full product spec, [ASSUMPTIONS.md](ASSUMPTIONS.md) for the
decisions taken while building, and [DEMO_SCRIPT.md](DEMO_SCRIPT.md) for the 90-second demo.
