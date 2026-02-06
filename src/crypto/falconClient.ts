import { createFalconWorkerClient, type FalconLevel } from "./falconInterface";

let client: ReturnType<typeof createFalconWorkerClient> | null = null;

export function getFalconClient() {
  if (!client) {
    client = createFalconWorkerClient();
    // optional: warm it up
    client.init().catch(() => {
      // ignore; next call will re-try
    });
  }
  return client;
}

export function destroyFalconClient() {
  client?.terminate();
  client = null;
}

export type { FalconLevel };
