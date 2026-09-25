import { describe, expect, it } from "vitest";
import { demoFixtures } from "@/data/demo";
import { buildReport } from "@/lib/report";
import { level, score } from "@/lib/scoring";
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
