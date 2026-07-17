import { apiRequest } from "./client";
import {
  broadcastChatHistorySchema,
  broadcastHistorySchema,
  broadcastRecordSchema,
  broadcastSchema,
} from "./contracts";

export const getBroadcast = (signal?: AbortSignal) =>
  apiRequest("/api/broadcast", broadcastSchema, { signal });

export const getBroadcastHistory = async (limit = 50, signal?: AbortSignal) =>
  (
    await apiRequest(
      `/api/broadcasts?limit=${limit}`,
      broadcastHistorySchema,
      { signal },
    )
  ).broadcasts;

export const getBroadcastDetail = (broadcastId: string, signal?: AbortSignal) =>
  apiRequest(
    `/api/broadcasts/${encodeURIComponent(broadcastId)}`,
    broadcastRecordSchema,
    { signal },
  );

export const getBroadcastChatHistory = (
  broadcastId: string,
  after = "",
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams({ limit: "100" });
  if (after) query.set("after", after);
  return apiRequest(
    `/api/broadcasts/${encodeURIComponent(broadcastId)}/chat/messages?${query}`,
    broadcastChatHistorySchema,
    { signal },
  );
};

export const broadcastWatchUrl = (videoId: string) =>
  `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
