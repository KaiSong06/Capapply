import { readEnv } from "../config/env";
import type { GenerationProviders } from "./contracts";
import { createMockProviders } from "./mock-providers";

export function createGenerationProviders(): GenerationProviders {
  const env = readEnv();

  if (env.MEDIA_PROVIDER_MODE === "mock") {
    return createMockProviders();
  }

  throw new Error(
    "MEDIA_PROVIDER_MODE=real requires Task 12 provider adapters before use",
  );
}
