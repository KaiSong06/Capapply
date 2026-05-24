"use client";

import { demoOutputPublicPath } from "@/lib/demo/demo-content";
import type { CreationSession } from "@/lib/domain/types";

type ExportStepProps = {
  session: CreationSession;
};

export function ExportStep({ session }: ExportStepProps) {
  const downloadUrl = `/api/sessions/${session.id}/download`;

  return (
    <section aria-labelledby="export-heading" className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Export
          </p>
          <h2 id="export-heading" className="mt-2 text-2xl font-semibold text-stone-950">
            Final video
          </h2>
        </div>
        {session.finalVideo ? (
          <a
            href={downloadUrl}
            className="inline-flex h-12 items-center justify-center rounded-md bg-stone-950 px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Download MP4
          </a>
        ) : null}
      </div>

      {session.finalVideo ? (
        <video
          autoPlay
          controls
          muted
          playsInline
          className="aspect-video w-full rounded-md border border-stone-300 bg-stone-950"
          src={demoOutputPublicPath}
        />
      ) : (
        <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">
          The export will appear here after rendering.
        </div>
      )}
    </section>
  );
}
