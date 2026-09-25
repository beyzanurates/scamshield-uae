# Demo script — ~90 seconds

**Before you start:** `npm run dev`, browser on `http://localhost:3000`, server console visible on
a second screen if you can (it prints one line per analysis). Have a real suspicious screenshot in
your clipboard for part 3.

Order: **police (HIGH) → DEWA (LOW) → live paste.** Bank is the backup if the live paste fails.

---

## 0 · Opening — 10s

> "People in the UAE get fake police fines and bank messages every week. The honest problem isn't
> spotting the obvious ones — it's that nobody can check *quickly* whether a message is real.
> ScamShield takes a screenshot and shows you what can and can't be verified."

## 1 · Police fine — HIGH — 25s

Click **Try demo → "Fake Dubai Police fine"**.

While the analysis overlay runs:

> "It's reading the screenshot for observable facts only — sender, links, amounts, what's being
> asked. The AI never decides the risk."

On the report, point at, in this order:

- The score ring — **HIGH 95**.
- The **domain mismatch** block: `dubai-police-fine-payment.com` versus the verified
  `dubaipolice.gov.ae`. *"That comparison is a registry lookup, not an opinion."*
- **Why we flagged this** — every row has a provenance chip: registry-verified, heuristic, or the
  model's reading of the text. *"You can always see where a claim came from."*
- **What should I do** — don't click, don't pay, verify directly, and the eCrime reporting link.

## 2 · DEWA service notice — LOW — 20s

**Scan another message → Try demo → "DEWA service notice".**

> "Same pipeline, opposite answer."

- **LOW 0**, and the green positive row: the link matches DEWA's verified official domain.
- The guidance changes with the outcome: *"This link matches the verified official domain…"* — no
  false alarm, no "don't click" on a legitimate message.

> "That's the part most scam detectors get wrong: clearing a real message matters as much as
> flagging a fake one."

## 3 · Live paste — 25s

**Scan another message**, then `Ctrl/Cmd+V` your real screenshot.

> "This one isn't a fixture — it's going to the model right now."

- Show the footer line: **Analyzed live · anthropic/claude-sonnet-5 · ~5 s**.
- If the server console is visible, point at the `[analyze] mode=live …` line.
- Read the resulting level and one indicator off the screen (do not quote a number from memory).

## 4 · Close — 10s

> "No account, no database, the screenshot is never stored. And it never says 'this is fraud' — it
> says what it verified, what it couldn't, and how to check safely."

---

## Backup — bank OTP

If the live paste fails (no key, provider down, bad network), say *"let me show you the third
scenario instead"* and run **Try demo → "Bank OTP request"**: HIGH 96, a credential/OTP request
plus a mismatched domain.

If the provider is down while uploading one of the three demo screenshots as a file, the app shows
"AI service unavailable — showing cached analysis" and still produces the full report — that
banner is a feature, not a failure. Say so.
