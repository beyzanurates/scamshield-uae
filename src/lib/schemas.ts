import { z } from "zod";

export const amountSchema = z.object({
  value: z.number(),
  currency: z.string(),
  quote: z.string(),
});

export const requestSchema = z.object({
  type: z.enum([
    "payment",
    "credentials_otp",
    "personal_info",
    "click_link",
    "call_number",
    "other",
  ]),
  quote: z.string(),
});

export const pressureCueSchema = z.object({
  type: z.enum(["urgency", "threat", "reward", "authority"]),
  quote: z.string(),
});

export const extractionSchema = z.object({
  channel: z.enum(["whatsapp", "sms", "email", "social", "unknown"]),
  language: z.enum(["en", "ar", "mixed", "other"]),
  message_text: z.string(),
  claimed_sender: z.string().nullable(),
  sender_handle: z.string().nullable(),
  urls: z.array(z.string()),
  phone_numbers: z.array(z.string()),
  amounts: z.array(amountSchema),
  requests: z.array(requestSchema),
  pressure_cues: z.array(pressureCueSchema),
  extraction_confidence: z.number().min(0).max(1),
});

export const demoFixtureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  image: z.string(),
  /** SHA-256 of the PNG in `public`, used to serve a cached analysis when the AI call fails. */
  image_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  extraction: extractionSchema,
  expected: z.object({
    level: z.enum(["LOW", "MEDIUM", "HIGH"]),
    min_score: z.number().optional(),
    max_score: z.number().optional(),
  }),
});

export type DemoFixture = z.infer<typeof demoFixtureSchema>;
