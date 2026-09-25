"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyzingOverlay, MIN_ANALYZING_MS } from "@/components/analyzing-overlay";
import { Button } from "@/components/ui/button";
import { demoFixtures } from "@/data/demo";
import { analyzeImage, ACCEPTED_TYPES, fileError } from "@/lib/analyze-client";
import { buildReport } from "@/lib/report";
import { storeReport } from "@/lib/storage";
import type { AnalysisReport } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDemos, setShowDemos] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  /** The overlay's minimum run time and the analysis happen in parallel; both must finish. */
  const open = useCallback(
    async (work: Promise<AnalysisReport>) => {
      const [report] = await Promise.all([
        work,
        new Promise((resolve) => setTimeout(resolve, MIN_ANALYZING_MS)),
      ]);
      storeReport(report);
      router.push("/report");
    },
    [router]
  );

  async function runDemo(id: string) {
    const fixture = demoFixtures.find((item) => item.id === id);
    if (!fixture) return;
    setNotice(null);
    setFailed(false);
    setAnalyzing(true);
    await open(Promise.resolve(buildReport(fixture.extraction, "demo")));
  }

  const analyzeFile = useCallback(
    async (file: File) => {
      const problem = fileError(file);
      if (problem) {
        setNotice(problem);
        return;
      }
      setNotice(null);
      setFailed(false);
      setAnalyzing(true);
      try {
        await open(analyzeImage(file));
      } catch {
        setAnalyzing(false);
        setFailed(true);
      }
    },
    [open]
  );

  // Paste matters for the live demo: Cmd/Ctrl+V anywhere on the page.
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = Array.from(event.clipboardData?.files ?? [])[0];
      if (file) {
        event.preventDefault();
        void analyzeFile(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [analyzeFile]);

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
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void analyzeFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void analyzeFile(file);
          }}
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-20 text-center transition-colors hover:border-primary/60 ${
            dragging ? "border-primary" : "border-border"
          }`}
        >
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-lg font-semibold">Drop a screenshot here</span>
          <span className="text-sm text-primary">or upload screenshot</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            WhatsApp · SMS · Email · Social
          </span>
          <span className="text-xs text-muted-foreground">You can also paste with Ctrl/Cmd+V.</span>
        </button>

        {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}

        {failed && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm">
              We couldn&apos;t analyze that screenshot. Check your connection and try again.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button className="h-11 px-5" onClick={() => inputRef.current?.click()}>
                Retry
              </Button>
              <Button
                variant="outline"
                className="h-11 px-5"
                onClick={() => {
                  setFailed(false);
                  setShowDemos(true);
                }}
              >
                Try demo
              </Button>
            </div>
          </div>
        )}

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
