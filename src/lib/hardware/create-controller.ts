import type { AppEnv } from "../config/env";
import type { HardwareController } from "./contracts";
import { createMockHardwareController } from "./mock-controller";
import { createRaspberryHttpController } from "./raspberry-http-controller";

export function createHardwareController(env: AppEnv): HardwareController {
  if (env.HARDWARE_MODE === "mock") {
    return createMockHardwareController();
  }

  if (!env.RASPBERRY_PI_URL) {
    throw new Error(
      "RASPBERRY_PI_URL is required when HARDWARE_MODE is raspberry",
    );
  }

  return createRaspberryHttpController({
    baseUrl: env.RASPBERRY_PI_URL,
    motorMoveMs: env.MOTOR_MOVE_MS,
  });
}
