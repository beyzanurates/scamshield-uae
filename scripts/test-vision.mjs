// test-vision.mjs — checks that your API key + model ID accept an image and can read a screenshot.
// Usage:
//   AI_API_KEY=... node scripts/test-vision.mjs openrouter anthropic/claude-sonnet-5 public/demo/demo-1.png
//   AI_API_KEY=... node scripts/test-vision.mjs anthropic  claude-sonnet-5           public/demo/demo-1.png
//   AI_API_KEY=... node scripts/test-vision.mjs openai     <model-id>                public/demo/demo-1.png
//   AI_API_KEY=... node scripts/test-vision.mjs gemini     gemini-3.5-flash          public/demo/demo-1.png
// Needs Node 18+ (built-in fetch). No dependencies.

import { readFileSync } from "node:fs";

const [provider, model, file] = process.argv.slice(2);
const key = process.env.AI_API_KEY;

if (!provider || !model || !file || !key) {
  console.error("Usage: AI_API_KEY=... node scripts/test-vision.mjs <openrouter|anthropic|openai|gemini> <model-id> <image.png|jpg|webp>");
  process.exit(1);
}

const data = readFileSync(file).toString("base64");
const mime = /\.jpe?g$/i.test(file) ? "image/jpeg" : /\.webp$/i.test(file) ? "image/webp" : "image/png";
const prompt =
  'Read this screenshot of a message. Return ONLY JSON with this shape: ' +
  '{"claimed_sender": string|null, "message_text": string, "urls": string[], "phone_numbers": string[], "amounts": string[]}';

const openaiStyleBody = {
  model,
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${mime};base64,${data}` } },
      ],
    },
  ],
};
const openaiStyleText = (j) => j.choices?.[0]?.message?.content;

const requests = {
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json", "X-Title": "ScamShield UAE" },
    body: openaiStyleBody,
    text: openaiStyleText,
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: openaiStyleBody,
    text: openaiStyleText,
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: {
      model,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime, data } },
            { type: "text", text: prompt },
          ],
        },
      ],
    },
    text: (j) => j.content?.map((c) => c.text ?? "").join(""),
  },
  gemini: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data } }] }] },
    text: (j) => j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join(""),
  },
}[provider];

if (!requests) {
  console.error("provider must be one of: openrouter | anthropic | openai | gemini");
  process.exit(1);
}

const started = Date.now();
const res = await fetch(requests.url, {
  method: "POST",
  headers: requests.headers,
  body: JSON.stringify(requests.body),
});
const json = await res.json();
const ms = Date.now() - started;

if (!res.ok) {
  console.error(`FAILED — HTTP ${res.status} after ${ms} ms\n`, JSON.stringify(json, null, 2));
  console.error("\nHints: 401/403 = wrong key · 404/400 'model not found' = wrong model ID · 402/429 = no credits or rate limit");
  process.exit(1);
}

console.log(`OK — HTTP ${res.status} in ${ms} ms — provider=${provider} model=${model}\n`);
console.log(requests.text(json) ?? JSON.stringify(json, null, 2));
