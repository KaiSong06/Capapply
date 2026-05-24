"use client";

import type { CompanyConfig, NormalizedJob } from "@/lib/domain/types";

type JobStepProps = {
  companies: CompanyConfig[];
  jobs: NormalizedJob[];
  activeCompany: string | null;
  selectedJob: NormalizedJob | null;
  disabled: boolean;
  isLoading: boolean;
  error: string | null;
  onSelectCompany: (boardToken: string) => void;
  onSelectJob: (job: NormalizedJob) => Promise<void>;
};

export function JobStep({
  companies,
  jobs,
  activeCompany,
  selectedJob,
  disabled,
  isLoading,
  error,
  onSelectCompany,
  onSelectJob,
}: JobStepProps) {
  return (
    <section aria-labelledby="jobs-heading" className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Greenhouse
          </p>
          <h2 id="jobs-heading" className="mt-2 text-2xl font-semibold text-stone-950">
            Choose a job
          </h2>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Curated companies">
          {companies.map((company) => {
            const isActive = activeCompany === company.boardToken;

            return (
              <button
                key={company.boardToken}
                type="button"
                aria-pressed={isActive}
                disabled={disabled}
                onClick={() => onSelectCompany(company.boardToken)}
                className={`rounded-md border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isActive
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                }`}
              >
                {company.company}
              </button>
            );
          })}
        </div>
      </div>

      {disabled ? (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          Upload all source assets before choosing a job.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {isLoading ? (
          <div className="rounded-md border border-stone-200 bg-white p-5 text-sm font-medium text-stone-600">
            Loading jobs...
          </div>
        ) : null}

        {!isLoading && jobs.length === 0 ? (
          <div className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">
            Select a company to load current openings.
          </div>
        ) : null}

        {jobs.map((job) => {
          const isSelected = selectedJob?.id === job.id;

          return (
            <button
              key={job.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectJob(job)}
              className={`group rounded-md border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSelected
                  ? "border-emerald-700 ring-2 ring-emerald-100"
                  : "border-stone-200 hover:border-stone-500"
              }`}
            >
              <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span>
                  <span className="block text-base font-semibold text-stone-950">
                    {job.title}
                  </span>
                  <span className="mt-1 block text-sm text-stone-600">
                    {job.company} · {job.location}
                  </span>
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {isSelected ? "Selected" : "Select"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
