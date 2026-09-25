import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { demoFixtures } from "@/data/demo";
import { ExtractionError, extract, parseExtraction, stripCodeFences } from "@/lib/extract";

const validExtraction = {
  channel: "sms",
  language: "en",
  message_text: "Pay AED 420 now",
  claimed_sender: "Dubai Police",
  sender_handle: "+44 7700 900123",
  urls: [],
  phone_numbers: [],
  amounts: [{ value: 420, currency: "AED", quote: "Pay AED 420" }],
  requests: [{ type: "payment", quote: "Pay AED 420" }],
  pressure_cues: [{ type: "urgency", quote: "now" }],
  extraction_confidence: 0.9,
};

function completion(content: string, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stripCodeFences", () => {
  it("removes json fences and leaves bare json untouched", () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(stripCodeFences("```\n{}\n```")).toBe("{}");
    expect(stripCodeFences(' {"a":1} ')).toBe('{"a":1}');
  });
});

describe("parseExtraction", () => {
  it("validates against the extraction schema", () => {
    expect(parseExtraction(JSON.stringify(validExtraction)).claimed_sender).toBe("Dubai Police");
    expect(() => parseExtraction('{"channel":"sms"}')).toThrow();
  });
});

describe("extract", () => {
  const image = new Uint8Array([1, 2, 3]);

  it("retries once when the model returns unparseable JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(completion("here you go: not json"))
      .mockResolvedValueOnce(completion(JSON.stringify(validExtraction)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await extract(image, "image/png", { apiKey: "k", model: "primary" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.model).toBe("primary");
    expect(result.usedFallbackModel).toBe(false);
    expect(result.extraction.message_text).toBe("Pay AED 420 now");
  });

  it("falls back to AI_FALLBACK_MODEL after the primary model fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "boom" }), { status: 500 }))
      .mockResolvedValueOnce(completion(JSON.stringify(validExtraction)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await extract(image, "image/png", {
      apiKey: "k",
      model: "primary",
      fallbackModel: "backup",
    });

    expect(result.model).toBe("backup");
    expect(result.usedFallbackModel).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).model).toBe("backup");
  });

  it("throws when both models fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 500 }))
    );

    await expect(
      extract(image, "image/png", { apiKey: "k", fallbackModel: "backup" })
    ).rejects.toBeInstanceOf(ExtractionError);
  });

  it("sends temperature 0, max_tokens and the image as a data url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion(JSON.stringify(validExtraction)));
    vi.stubGlobal("fetch", fetchMock);

    await extract(image, "image/webp", { apiKey: "k", model: "primary" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(1500);
    expect(body.messages[1].content[1].image_url.url).toBe("data:image/webp;base64,AQID");
  });

  it("gives up once the total budget is spent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
          })
      )
    );

    const started = Date.now();
    await expect(
      extract(image, "image/png", { apiKey: "k", totalBudgetMs: 150 })
    ).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("fixture image hashes", () => {
  it("match the PNGs served from public/", () => {
    for (const fixture of demoFixtures) {
      const bytes = readFileSync(`public${fixture.image}`);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(fixture.image_sha256);
    }
  });
});
