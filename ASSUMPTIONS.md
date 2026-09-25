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
