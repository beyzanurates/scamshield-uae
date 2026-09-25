"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "cn";

export const ANALYZING_STEPS = [
  "Reading message",
  "Identifying sender",
  "Extracting links",
  "Checking risk signals",
  "Verifying claimed organization",
];

export const MIN_ANALYZING_MS = 3500;

export function AnalyzingOverlay() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = MIN_ANALYZING_MS / ANALYZING_STEPS.length;
    const timers = ANALYZING_STEPS.map((_, index) =>
      setTimeout(() => setActiveStep(index + 1), interval * (index + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Analyzing your message…</h2>
        <ul className="mt-6 space-y-3">
          {ANALYZING_STEPS.map((step, index) => {
            const done = index < activeStep;
            const current = index === activeStep;
            return (
              <li
                key={step}
                className={cn(
                  "flex items-center gap-3 text-sm",
                  done || current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="flex size-5 items-center justify-center">
                  {done ? (
                    <Check className="size-4 text-risk-low" />
                  ) : current ? (
                    <Loader2 className="size-4 animate-spin text-primary" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </span>
                {step}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
