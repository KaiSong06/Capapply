"use client";

import { demoSong } from "@/lib/demo/demo-content";
import type { CreationSession, NormalizedTrack } from "@/lib/domain/types";

type SongStepProps = {
  session: CreationSession;
  onSelectTrack: (track: NormalizedTrack) => Promise<void>;
};

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "Duration unknown";

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function SongStep({
  session,
  onSelectTrack,
}: SongStepProps) {
  const isSelected =
    session.selectedSong?.type === "soundcloud" &&
    session.selectedSong.track.id === demoSong.id;

  return (
    <section aria-labelledby="songs-heading" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Demo song
        </p>
        <h2 id="songs-heading" className="mt-2 text-2xl font-semibold text-stone-950">
          Choose the song
        </h2>
      </div>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onSelectTrack(demoSong)}
          className={`rounded-md border bg-white p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
            isSelected
              ? "border-emerald-700 ring-2 ring-emerald-100"
              : "border-stone-200 hover:-translate-y-0.5 hover:border-stone-500"
          }`}
        >
          <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold text-stone-950">
                {demoSong.title}
              </span>
              <span className="mt-1 block text-sm text-stone-600">
                {demoSong.artist} · {formatDuration(demoSong.durationMs)}
              </span>
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              {isSelected ? "Selected" : "Demo track"}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
