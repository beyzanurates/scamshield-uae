// Prints the SHA-256 of each demo PNG and whether it matches the `image_sha256` in its fixture.
// Run after replacing any file in public/demo/ and copy the new hash into the fixture JSON.
//   node scripts/hash-demo-images.mjs

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

let mismatches = 0;

for (const id of ["demo-1", "demo-2", "demo-3"]) {
  const fixture = JSON.parse(readFileSync(`src/data/demo/${id}.json`, "utf8"));
  const actual = createHash("sha256")
    .update(readFileSync(`public${fixture.image}`))
    .digest("hex");
  const ok = actual === fixture.image_sha256;
  if (!ok) mismatches += 1;
  console.log(`${ok ? "ok  " : "STALE"} ${id} ${actual}`);
}

if (mismatches > 0) {
  console.error(`\n${mismatches} fixture(s) have a stale image_sha256 — update the JSON.`);
  process.exit(1);
}
