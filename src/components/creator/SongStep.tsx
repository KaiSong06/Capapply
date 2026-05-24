"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { CreationSession, NormalizedTrack } from "@/lib/domain/types";

type SongStepProps = {
  session: CreationSession;
  query: string;
  tracks: NormalizedTrack[];
  isSearching: boolean;
  isUploading: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onSearch: () => Promise<void>;
  onSelectTrack: (track: NormalizedTrack) => Promise<void>;
  onUploadTrack: (file: File) => Promise<void>;
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
  query,
  tracks,
  isSearching,
  isUploading,
  error,
  onQueryChange,
  onSearch,
  onSelectTrack,
  onUploadTrack,
}: SongStepProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSearch();
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    void onUploadTrack(file);
    event.currentTarget.value = "";
  }

  return (
    <section aria-labelledby="songs-heading" className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          SoundCloud
        </p>
        <h2 id="songs-heading" className="mt-2 text-2xl font-semibold text-stone-950">
          Choose a song
        </h2>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search SoundCloud</span>
          <input
            aria-label="Search SoundCloud"
            value={query}
            onChange={(event) => onQueryChange(event.currentTarget.value)}
            placeholder="Search SoundCloud"
            className="h-12 w-full rounded-md border border-stone-300 bg-white px-4 text-base text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-200"
          />
        </label>
        <button
          type="submit"
          disabled={isSearching || !query.trim()}
          className="h-12 rounded-md bg-stone-950 px-6 text-sm font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? "Searching..." : "Search"}
        </button>
      </form>

      {error ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {tracks.map((track) => {
          const isSelected =
            session.selectedSong?.type === "soundcloud" &&
            session.selectedSong.track.id === track.id;
          const isProcessable = track.processability.processable;

          return (
            <button
              key={track.id}
              type="button"
              disabled={!isProcessable}
              onClick={() => onSelectTrack(track)}
              className={`rounded-md border bg-white p-4 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:opacity-65 ${
                isSelected
                  ? "border-emerald-700 ring-2 ring-emerald-100"
                  : "border-stone-200 hover:-translate-y-0.5 hover:border-stone-500"
              }`}
            >
              <span className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold text-stone-950">
                    {track.title}
                  </span>
                  <span className="mt-1 block text-sm text-stone-600">
                    {track.artist} · {formatDuration(track.durationMs)}
                  </span>
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isProcessable
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {isProcessable
                    ? isSelected
                      ? "Selected"
                      : "Processable"
                    : "Not processable"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <label className="flex cursor-pointer flex-col gap-3 rounded-md border border-dashed border-stone-400 bg-stone-50 p-5 transition hover:border-stone-700 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-200">
        <span className="text-base font-semibold text-stone-950">
          Upload song file
        </span>
        <span className="text-sm text-stone-600">
          Use this when search results are unavailable or no listed track is processable.
        </span>
        <input
          aria-label="Upload song file"
          type="file"
          accept="audio/*"
          disabled={isUploading}
          onChange={handleUpload}
          className="block w-full text-sm text-stone-700 file:mr-4 file:rounded-md file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-stone-950 hover:file:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
        />
        {session.selectedSong?.type === "upload" ? (
          <span className="text-sm font-medium text-emerald-800">
            Uploaded: {session.selectedSong.title}
          </span>
        ) : null}
      </label>
    </section>
  );
}
