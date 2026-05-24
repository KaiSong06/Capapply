import type { NormalizedJob, NormalizedTrack } from "../domain/types";

export const demoCompany = { company: "Stripe", boardToken: "stripe" } as const;

export const demoStripeInternshipJobs: NormalizedJob[] = [
  {
    id: "stripe-software-engineer-intern",
    title: "Software Engineer Intern",
    company: "Stripe",
    boardToken: "stripe",
    location: "San Francisco, CA",
    content:
      "Build payment infrastructure, developer tools, and user-facing product workflows with Stripe engineering teams.",
    absoluteUrl: "https://boards.greenhouse.io/stripe/jobs/demo-software-engineer-intern",
    updatedAt: null,
  },
  {
    id: "stripe-product-manager-intern",
    title: "Product Manager Intern",
    company: "Stripe",
    boardToken: "stripe",
    location: "New York, NY",
    content:
      "Shape internship-scale product bets across payments, onboarding, risk, and merchant growth workflows.",
    absoluteUrl: "https://boards.greenhouse.io/stripe/jobs/demo-product-manager-intern",
    updatedAt: null,
  },
  {
    id: "stripe-data-science-intern",
    title: "Data Science Intern",
    company: "Stripe",
    boardToken: "stripe",
    location: "Seattle, WA",
    content:
      "Use product analytics and experimentation to improve activation, payments reliability, and business insights.",
    absoluteUrl: "https://boards.greenhouse.io/stripe/jobs/demo-data-science-intern",
    updatedAt: null,
  },
  {
    id: "stripe-product-design-intern",
    title: "Product Design Intern",
    company: "Stripe",
    boardToken: "stripe",
    location: "Remote",
    content:
      "Design polished workflows for developers, operators, and businesses using Stripe products.",
    absoluteUrl: "https://boards.greenhouse.io/stripe/jobs/demo-product-design-intern",
    updatedAt: null,
  },
];

export const demoSong: NormalizedTrack = {
  id: "hotline-bling-drake",
  title: "Hotline Bling",
  artist: "Drake",
  durationMs: 267_000,
  artworkUrl: null,
  sourceUrl: "https://soundcloud.com/demo/hotline-bling",
  processability: {
    processable: true,
    reason: "direct_audio_url",
    audioUrl: "https://example.com/demo/hotline-bling.mp3",
  },
};

export const demoOutputFilename = "demo-output.mp4";
export const demoOutputPublicPath = `/${demoOutputFilename}`;
