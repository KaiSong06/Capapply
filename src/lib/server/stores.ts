import { readEnv } from "@/lib/config/env";
import { createArtifactStore } from "@/lib/storage/artifacts";
import { createSessionStore } from "@/lib/storage/sessions";

export function getStores() {
  const env = readEnv();

  return {
    sessions: createSessionStore(env.ARTIFACT_ROOT),
    artifacts: createArtifactStore(env.ARTIFACT_ROOT),
  };
}
