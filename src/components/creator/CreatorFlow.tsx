"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetStep } from "./AssetStep";
import { ExportStep } from "./ExportStep";
import { JobStep } from "./JobStep";
import { ProgressStep } from "./ProgressStep";
import { SongStep } from "./SongStep";
import {
  ApiError,
  createSession,
  getCompanies,
  getJobs,
  selectJob,
  selectSong,
  startGeneration,
  uploadAsset,
} from "@/lib/client/api";
import type {
  ArtifactKind,
  CompanyConfig,
  CreationSession,
  NormalizedJob,
  NormalizedTrack,
} from "@/lib/domain/types";

type RequiredAssetKind = Extract<
  ArtifactKind,
  "resume" | "voice_sample" | "face_media"
>;

type FlowStep = "assets" | "jobs" | "songs" | "generate" | "export";

const requiredAssets: RequiredAssetKind[] = [
  "resume",
  "voice_sample",
  "face_media",
];

const stepLabels: Array<{ id: FlowStep; label: string }> = [
  { id: "assets", label: "Assets" },
  { id: "jobs", label: "Job" },
  { id: "songs", label: "Song" },
  { id: "generate", label: "Render" },
  { id: "export", label: "Export" },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function useAssetCompletion(session: CreationSession | null) {
  return useMemo(() => {
    const uploaded = new Set(session?.artifacts.map((artifact) => artifact.kind));
    return requiredAssets.every((kind) => uploaded.has(kind));
  }, [session]);
}

function getActiveStep(
  session: CreationSession | null,
  assetsComplete: boolean,
  isGenerating: boolean,
): FlowStep {
  if (!session) return "assets";
  if (session.status === "ready") return "export";
  if (isGenerating || session.status === "generating" || session.selectedSong) {
    return "generate";
  }
  if (session.selectedJob) return "songs";
  if (assetsComplete) return "jobs";
  return "assets";
}

async function loadFreshSession() {
  const [nextSession, nextCompanies] = await Promise.all([
    createSession(),
    getCompanies(),
  ]);

  return { nextSession, nextCompanies };
}

export function CreatorFlow() {
  const [session, setSession] = useState<CreationSession | null>(null);
  const [companies, setCompanies] = useState<CompanyConfig[]>([]);
  const [activeCompany, setActiveCompany] = useState<string | null>(null);
  const [jobs, setJobs] = useState<NormalizedJob[]>([]);
  const [booting, setBooting] = useState(true);
  const [busyAsset, setBusyAsset] = useState<RequiredAssetKind | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const assetsComplete = useAssetCompletion(session);
  const activeStep = getActiveStep(session, assetsComplete, isGenerating);

  const startNewSession = useCallback(async () => {
    setBooting(true);
    setGlobalError(null);
    setJobs([]);
    setJobsError(null);

    try {
      const { nextSession, nextCompanies } = await loadFreshSession();
      setSession(nextSession);
      setCompanies(nextCompanies);
      setActiveCompany(nextCompanies[0]?.boardToken ?? null);
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadFreshSession()
      .then(({ nextSession, nextCompanies }) => {
        if (cancelled) return;
        setSession(nextSession);
        setCompanies(nextCompanies);
        setActiveCompany(nextCompanies[0]?.boardToken ?? null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setGlobalError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const companyToken = activeCompany;

    if (!companyToken || !assetsComplete) {
      return;
    }

    let cancelled = false;

    async function loadJobs(boardToken: string) {
      await Promise.resolve();
      if (cancelled) return;

      setJobsLoading(true);
      setJobsError(null);

      try {
        const nextJobs = await getJobs(boardToken);
        if (!cancelled) setJobs(nextJobs);
      } catch (error) {
        if (!cancelled) {
          setJobs([]);
          setJobsError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setJobsLoading(false);
      }
    }

    void loadJobs(companyToken);

    return () => {
      cancelled = true;
    };
  }, [activeCompany, assetsComplete]);

  async function handleAssetUpload(kind: RequiredAssetKind, file: File) {
    if (!session) return;

    setBusyAsset(kind);
    setGlobalError(null);
    try {
      setSession(await uploadAsset(session.id, kind, file));
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    } finally {
      setBusyAsset(null);
    }
  }

  async function handleSelectJob(job: NormalizedJob) {
    if (!session) return;

    setGlobalError(null);
    try {
      setSession(await selectJob(session.id, job));
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    }
  }

  async function handleSelectTrack(track: NormalizedTrack) {
    if (!session) return;

    setGlobalError(null);
    try {
      setSession(await selectSong(session.id, track));
    } catch (error) {
      setGlobalError(getErrorMessage(error));
    }
  }

  async function handleGenerate() {
    if (!session) return;

    setIsGenerating(true);
    setGlobalError(null);
    setSession({
      ...session,
      status: "generating",
      generationStep: "parsing_resume",
      error: null,
    });

    try {
      setSession(await startGeneration(session.id));
    } catch (error) {
      if (error instanceof ApiError && error.session) {
        setSession(error.session);
      }
      setGlobalError(getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  }

  const stepReadiness = {
    assets: assetsComplete,
    jobs: Boolean(session?.selectedJob),
    songs: Boolean(session?.selectedSong),
    generate: session?.status === "ready" || session?.status === "generating",
    export: session?.status === "ready",
  } satisfies Record<FlowStep, boolean>;

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-stone-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-stone-300 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">
              Capapply
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal text-stone-950 sm:text-5xl">
              Create your application parody video
            </h1>
          </div>
          <button
            type="button"
            onClick={() => void startNewSession()}
            className="h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:border-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            New session
          </button>
        </header>

        <div className="grid flex-1 gap-6 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-md border border-stone-300 bg-white p-4 shadow-sm lg:sticky lg:top-6 lg:h-fit">
            <div className="mb-4 text-sm font-semibold text-stone-700">
              Session status
            </div>
            <ol className="space-y-2">
              {stepLabels.map((step, index) => {
                const isActive = activeStep === step.id;
                const isReady = stepReadiness[step.id];

                return (
                  <li key={step.id}>
                    <div
                      className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm transition ${
                        isActive
                          ? "bg-stone-950 text-white"
                          : isReady
                            ? "bg-emerald-50 text-emerald-900"
                            : "bg-stone-50 text-stone-600"
                      }`}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isActive
                            ? "bg-white text-stone-950"
                            : isReady
                              ? "bg-emerald-700 text-white"
                              : "bg-stone-200 text-stone-700"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="font-semibold">{step.label}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </aside>

          <section className="min-w-0 rounded-md border border-stone-300 bg-[#fbfaf7] p-5 shadow-sm sm:p-7">
            {booting ? (
              <div className="rounded-md border border-stone-200 bg-white p-6 text-sm font-medium text-stone-600">
                Starting session...
              </div>
            ) : null}

            {globalError ? (
              <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                {globalError}
              </p>
            ) : null}

            {session ? (
              <>
                {activeStep === "assets" ? (
                  <AssetStep
                    session={session}
                    busyKind={busyAsset}
                    onUpload={handleAssetUpload}
                  />
                ) : null}

                {activeStep === "jobs" ? (
                  <JobStep
                    companies={companies}
                    jobs={jobs}
                    activeCompany={activeCompany}
                    selectedJob={session.selectedJob}
                    disabled={!assetsComplete}
                    isLoading={jobsLoading}
                    error={jobsError}
                    onSelectCompany={setActiveCompany}
                    onSelectJob={handleSelectJob}
                  />
                ) : null}

                {activeStep === "songs" ? (
                  <SongStep
                    session={session}
                    onSelectTrack={handleSelectTrack}
                  />
                ) : null}

                {activeStep === "generate" ? (
                  <ProgressStep
                    session={session}
                    isGenerating={isGenerating}
                    onGenerate={handleGenerate}
                  />
                ) : null}

                {activeStep === "export" ? <ExportStep session={session} /> : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
