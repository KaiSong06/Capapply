"use client";

import type { ChangeEvent } from "react";
import type { ArtifactKind, CreationSession } from "@/lib/domain/types";

type RequiredAssetKind = Extract<
  ArtifactKind,
  "resume" | "voice_sample"
>;

type AssetStepProps = {
  session: CreationSession;
  busyKind: RequiredAssetKind | null;
  onUpload: (kind: RequiredAssetKind, file: File) => Promise<void>;
};

const fields: Array<{
  kind: RequiredAssetKind;
  label: string;
  accept: string;
  description: string;
}> = [
  {
    kind: "resume",
    label: "Resume",
    accept: ".pdf,.doc,.docx,.txt",
    description: "PDF, DOCX, or text",
  },
  {
    kind: "voice_sample",
    label: "Voice sample",
    accept: "audio/*",
    description: "Short spoken clip",
  },
];

export function AssetStep({ session, busyKind, onUpload }: AssetStepProps) {
  function getArtifact(kind: RequiredAssetKind) {
    return session.artifacts.find((artifact) => artifact.kind === kind) ?? null;
  }

  function handleFile(kind: RequiredAssetKind) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;

      void onUpload(kind, file);
      event.currentTarget.value = "";
    };
  }

  return (
    <section aria-labelledby="assets-heading" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Inputs
        </p>
        <h2 id="assets-heading" className="mt-2 text-2xl font-semibold text-stone-950">
          Upload source assets
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {fields.map((field) => {
          const artifact = getArtifact(field.kind);
          const isBusy = busyKind === field.kind;

          return (
            <label
              key={field.kind}
              className="group flex min-h-52 cursor-pointer flex-col justify-between rounded-md border border-stone-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-500 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-200"
            >
              <span>
                <span className="block text-lg font-semibold text-stone-950">
                  {field.label}
                </span>
                <span className="mt-2 block text-sm text-stone-600">
                  {field.description}
                </span>
              </span>

              <span className="mt-8 block">
                <input
                  aria-label={field.label}
                  className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-md file:border-0 file:bg-stone-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                  type="file"
                  accept={field.accept}
                  disabled={isBusy}
                  onChange={handleFile(field.kind)}
                />
              </span>

              <span className="mt-4 min-h-6 text-sm font-medium text-stone-700">
                {isBusy
                  ? "Uploading..."
                  : artifact
                    ? `Uploaded: ${artifact.filename}`
                    : "Waiting for file"}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}
