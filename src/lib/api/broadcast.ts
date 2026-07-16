import { apiRequest } from "./client";
import { broadcastSchema } from "./contracts";

export const getBroadcast = (signal?: AbortSignal) =>
  apiRequest("/api/broadcast", broadcastSchema, { signal });
