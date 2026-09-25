"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnalyzingOverlay, MIN_ANALYZING_MS } from "@/components/analyzing-overlay";
import { Button } from "@/components/ui/button";
import { demoFixtures } from "@/data/demo";
import { buildReport } from "@/lib/report";
import { storeReport } from "@/lib/storage";

export default function Home() {
  const router = useRouter();
  const [showDemos, setShowDemos] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function runDemo(id: string) {
    const fixture = demoFixtures.find((item) => item.id === id);
    if (!fixture) return;
    setNotice(null);
    setAnalyzing(true);
    const report = buildReport(fixture.extraction, "demo");
    await new Promise((resolve) => setTimeout(resolve, MIN_ANALYZING_MS));
    storeReport(report);
    router.push("/report");
  }

  function handleUpload() {
    setShowDemos(true);
    setNotice(
      "Live screenshot analysis is not enabled yet. Run one of the demo scenarios below."
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1040px] flex-1 px-6 py-16">
      {analyzing && <AnalyzingOverlay />}

      <div className="relative overflow-x-clip">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-120px] h-[320px] w-[620px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative text-center">
          <h1 className="text-3xl font-semibold tracking-[0.18em]">SCAMSHIELD UAE</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Before you click, know what you&apos;re looking at.
          </p>
        </div>
      </div>

      <section className="mt-12">
        <button
          type="button"
          onClick={handleUpload}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleUpload();
          }}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-20 text-center transition-colors hover:border-primary/60"
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-lg font-semibold">Drop a screenshot here</span>
          <span className="text-sm text-primary">or upload screenshot</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            WhatsApp · SMS · Email · Social
          </span>
        </button>

        {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}

        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            className="h-11 px-5"
            onClick={() => setShowDemos((value) => !value)}
          >
            Try demo
          </Button>
        </div>

        {showDemos && (
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {demoFixtures.map((fixture) => (
              <button
                key={fixture.id}
                type="button"
                onClick={() => runDemo(fixture.id)}
                className="overflow-hidden rounded-2xl border border-border bg-card text-left transition-colors hover:border-primary/60"
              >
                <div className="relative h-44 w-full overflow-hidden bg-surface-2">
                  <Image
                    src={fixture.image}
                    alt={fixture.title}
                    fill
                    sizes="320px"
                    className="object-cover object-top"
                  />
                </div>
                <div className="p-6">
                  <p className="font-semibold">{fixture.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{fixture.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer className="mt-16 space-y-2 border-t border-border pt-8 text-sm text-muted-foreground">
        <p>
          ScamShield identifies risk indicators. It does not provide a definitive fraud
          determination.
        </p>
        <p>Screenshots are analyzed in memory and are not stored.</p>
      </footer>
    </main>
  );
}
