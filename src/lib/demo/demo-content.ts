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
  id: "top-tier",
  title: "Top Tier",
  artist: "Capapply",
  durationMs: 180_000,
  artworkUrl: null,
  sourceUrl: "https://example.com/demo/top-tier",
  processability: {
    processable: true,
    reason: "direct_audio_url",
    audioUrl: "https://example.com/demo/top-tier.mp3",
  },
};

export const demoSongOptions: NormalizedTrack[] = [
  demoSong,
  {
    id: "midnight-invoice",
    title: "Midnight Invoice",
    artist: "Ledger Line",
    durationMs: 196_000,
    artworkUrl: null,
    sourceUrl: "https://example.com/demo/midnight-invoice",
    processability: {
      processable: true,
      reason: "direct_audio_url",
      audioUrl: "https://example.com/demo/midnight-invoice.mp3",
    },
  },
  {
    id: "promotion-season",
    title: "Promotion Season",
    artist: "Offer Stack",
    durationMs: 212_000,
    artworkUrl: null,
    sourceUrl: "https://example.com/demo/promotion-season",
    processability: {
      processable: true,
      reason: "direct_audio_url",
      audioUrl: "https://example.com/demo/promotion-season.mp3",
    },
  },
  {
    id: "final-round",
    title: "Final Round",
    artist: "Callback Club",
    durationMs: 188_000,
    artworkUrl: null,
    sourceUrl: "https://example.com/demo/final-round",
    processability: {
      processable: true,
      reason: "direct_audio_url",
      audioUrl: "https://example.com/demo/final-round.mp3",
    },
  },
  {
    id: "equity-wave",
    title: "Equity Wave",
    artist: "Term Sheet",
    durationMs: 204_000,
    artworkUrl: null,
    sourceUrl: "https://example.com/demo/equity-wave",
    processability: {
      processable: true,
      reason: "direct_audio_url",
      audioUrl: "https://example.com/demo/equity-wave.mp3",
    },
  },
  {
    id: "offer-letter",
    title: "Offer Letter",
    artist: "Hiring Loop",
    durationMs: 176_000,
    artworkUrl: null,
    sourceUrl: "https://example.com/demo/offer-letter",
    processability: {
      processable: true,
      reason: "direct_audio_url",
      audioUrl: "https://example.com/demo/offer-letter.mp3",
    },
  },
];

export const demoOutputFilename = "top-tier.mp3";
export const demoOutputPublicPath = `/${demoOutputFilename}`;
