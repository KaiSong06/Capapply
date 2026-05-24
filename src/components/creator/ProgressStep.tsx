"use client";

import type { CreationSession, GenerationStep } from "@/lib/domain/types";

type ProgressStepProps = {
  session: CreationSession;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
};

const generationSteps: Array<{ id: GenerationStep; label: string }> = [
  { id: "parsing_resume", label: "Resume parsed" },
  { id: "writing_lyrics", label: "Lyrics written" },
  { id: "separating_instrumental", label: "Instrumental isolated" },
  { id: "creating_guide_vocal", label: "Guide vocal created" },
  { id: "converting_voice", label: "Voice converted" },
  { id: "creating_lipsync_video", label: "Face video created" },
  { id: "rendering_final_video", label: "Final render" },
];

function stepIndex(step: GenerationStep): number {
  if (step === "complete") return generationSteps.length;
  return generationSteps.findIndex((item) => item.id === step);
}

export function ProgressStep({
  session,
  isGenerating,
  onGenerate,
}: ProgressStepProps) {
  const currentIndex = stepIndex(session.generationStep);
  const hasStarted = isGenerating || session.status === "generating" || currentIndex >= 0;

  return (
    <section aria-labelledby="generation-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Render
          </p>
          <h2
            id="generation-heading"
            className="mt-2 text-2xl font-semibold text-stone-950"
          >
            Generate the video
          </h2>
        </div>
        <button
          type="button"
          disabled={isGenerating || session.status !== "song_selected"}
          onClick={() => void onGenerate()}
          className="h-12 rounded-md bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>

      {session.error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {session.error.message}
        </p>
      ) : null}

      <div className="grid gap-3">
        {generationSteps.map((step, index) => {
          const isDone = currentIndex > index || session.generationStep === "complete";
          const isCurrent =
            hasStarted && !isDone && session.generationStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-center justify-between rounded-md border bg-white px-4 py-3 text-sm shadow-sm ${
                isDone
                  ? "border-emerald-200 text-emerald-900"
                  : isCurrent
                    ? "border-amber-300 text-amber-950"
                    : "border-stone-200 text-stone-600"
              }`}
            >
              <span className="font-medium">{step.label}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                {isDone ? "Done" : isCurrent ? "Running" : "Queued"}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
