import { describe, expect, it } from "vitest";
import { demoFixtures } from "@/data/demo";
import { buildReport } from "@/lib/report";
import { GUIDANCE, guidanceTone, level, score } from "@/lib/scoring";
import { provenanceLine } from "@/lib/summary";
import { domainMatches, normalizeDomain } from "@/lib/verify";

describe("normalizeDomain", () => {
  it("strips scheme, www, port, path, query and trailing dot", () => {
    expect(normalizeDomain("HTTPS://WWW.Dubaipolice.gov.ae:443/pay?id=1#top.")).toBe(
      "dubaipolice.gov.ae"
    );
    expect(normalizeDomain("dubaipolice.gov.ae.")).toBe("dubaipolice.gov.ae");
  });

  it("decodes punycode labels", () => {
    expect(normalizeDomain("https://xn--80ak6aa92e.com/login")).toBe("аррӏе.com");
  });
});

describe("domainMatches", () => {
  it("matches the domain itself and its subdomains", () => {
    expect(domainMatches("pay.dubaipolice.gov.ae", "dubaipolice.gov.ae")).toBe(true);
    expect(domainMatches("https://www.dewa.gov.ae", "dewa.gov.ae")).toBe(true);
  });

  it("rejects suffix lookalikes and hyphenated imitations", () => {
    expect(domainMatches("dubaipolice.gov.ae.pay-now.com", "dubaipolice.gov.ae")).toBe(false);
    expect(domainMatches("dubai-police-fine-payment.com", "dubaipolice.gov.ae")).toBe(false);
  });
});

describe("score", () => {
  it("saturates below 100 and maps to levels", () => {
    expect(score(0)).toBe(0);
    expect(score(50)).toBe(63);
    expect(score(220)).toBe(99);
    expect(level(score(0))).toBe("LOW");
    expect(level(score(25))).toBe("MEDIUM");
    expect(level(score(100))).toBe("HIGH");
  });
});

describe("demo scenarios", () => {
  for (const fixture of demoFixtures) {
    it(`${fixture.id} meets its expected risk`, () => {
      const report = buildReport(fixture.extraction, "demo");
      expect(report.risk.level).toBe(fixture.expected.level);
      if (fixture.expected.min_score !== undefined) {
        expect(report.risk.score).toBeGreaterThanOrEqual(fixture.expected.min_score);
      }
      if (fixture.expected.max_score !== undefined) {
        expect(report.risk.score).toBeLessThanOrEqual(fixture.expected.max_score);
      }
    });
  }

  it("demo-1 flags a domain mismatch and a sender channel anomaly", () => {
    const report = buildReport(demoFixtures[0].extraction, "demo");
    const ids = report.indicators.map((indicator) => indicator.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "domain_mismatch",
        "payment_request",
        "urgency",
        "threat",
        "sender_channel_anomaly",
        "impersonation_unverifiable",
      ])
    );
  });

  it("demo-3 records the verified domain as a positive and raises no indicators", () => {
    const report = buildReport(demoFixtures[2].extraction, "demo");
    expect(report.indicators).toHaveLength(0);
    expect(report.positives.map((positive) => positive.id)).toEqual(["domain_verified"]);
  });

  it("treats the sender channel anomaly as an interpretation, not a registry fact", () => {
    const report = buildReport(demoFixtures[0].extraction, "demo");
    const anomaly = report.indicators.find(
      (indicator) => indicator.id === "sender_channel_anomaly"
    );
    expect(anomaly?.provenance).toBe("INTERPRETED");
    expect(anomaly?.explanation).toBe(
      "Official UAE government and bank messages usually come from registered sender IDs, not personal or international mobile numbers."
    );
  });

  it("labels links as unverifiable when the organization is not in the registry", () => {
    const report = buildReport(
      {
        ...demoFixtures[0].extraction,
        claimed_sender: "Global Prize Office",
      },
      "demo"
    );
    expect(report.verification.status).toBe("ORG_NOT_IN_REGISTRY");
    expect(report.verification.domain_checks[0].result).toBe("UNVERIFIABLE");
    expect(report.indicators.map((indicator) => indicator.id)).not.toContain("domain_mismatch");
  });
});

describe("guidance", () => {
  it("keeps the cautionary actions for HIGH reports with a link", () => {
    const report = buildReport(demoFixtures[0].extraction, "demo");
    expect(guidanceTone(report)).toBe("CAUTION");
    expect(report.recommended_actions).toEqual(GUIDANCE.CAUTION.actions);
    expect(GUIDANCE.CAUTION.headline).toContain("link");
  });

  it("never tells the reader not to click a link when the message has none", () => {
    const report = buildReport(
      { ...demoFixtures[0].extraction, urls: [] },
      "demo"
    );
    expect(report.risk.level).not.toBe("LOW");
    expect(guidanceTone(report)).toBe("CAUTION_NO_LINK");
    expect(GUIDANCE.CAUTION_NO_LINK.headline).not.toContain("link");
    expect(report.recommended_actions.join(" ")).not.toContain("link");
  });

  it("uses the verified-domain copy for a LOW report with a matching domain", () => {
    const report = buildReport(demoFixtures[2].extraction, "demo");
    expect(guidanceTone(report)).toBe("LOW_VERIFIED");
    expect(report.recommended_actions).toEqual([
      "No major indicators detected",
      "Verify through the official app if in doubt",
      "Report if something still feels wrong",
    ]);
  });

  it("uses neutral copy for a LOW report with nothing to verify", () => {
    const report = buildReport(
      { ...demoFixtures[2].extraction, urls: [] },
      "demo"
    );
    expect(report.risk.level).toBe("LOW");
    expect(guidanceTone(report)).toBe("LOW_NOTHING_TO_VERIFY");
    expect(report.recommended_actions).toEqual([
      "No major indicators detected",
      "If in doubt, contact the organization through its official app or website",
      "Report if something still feels wrong",
    ]);
    const copy = [...report.recommended_actions, GUIDANCE.LOW_NOTHING_TO_VERIFY.headline].join(" ");
    expect(copy).not.toContain("link");
  });
});

describe("analysis provenance", () => {
  it("carries the live model and latency, and falls back to the cached line", () => {
    const live = buildReport(demoFixtures[2].extraction, "live", {
      model: "anthropic/claude-sonnet-5",
      latency_ms: 5297,
    });
    expect(provenanceLine(live)).toBe("Analyzed live · anthropic/claude-sonnet-5 · 5.3 s");
    expect(provenanceLine(buildReport(demoFixtures[2].extraction, "demo"))).toBe(
      "Cached analysis (demo fixture)"
    );
  });
});
