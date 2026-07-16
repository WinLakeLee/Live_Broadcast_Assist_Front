import { apiRequest } from "./client";
import { z } from "zod";
import { chatFeedSchema, chatMessageSchema, chatSessionSchema } from "./contracts";

export const createChatSession = (nickname: string, signal?: AbortSignal) =>
  apiRequest("/api/chat/sessions", chatSessionSchema, {
    method: "POST",
    body: JSON.stringify({ nickname }),
    signal,
  });

export const getChatMessages = (signal?: AbortSignal) =>
  apiRequest("/api/chat/messages?limit=100", chatFeedSchema, { signal });

export const postChatMessage = (
  sessionId: string,
  sessionToken: string,
  message: string,
  signal?: AbortSignal,
) =>
  apiRequest("/api/chat/messages", chatMessageSchema, {
    method: "POST",
    headers: { "X-Chat-Session-Token": sessionToken },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal,
  });

export const reportChatMessage = (messageId: string, signal?: AbortSignal) =>
  apiRequest(`/api/chat/messages/${encodeURIComponent(messageId)}/reports`, z.object({}), {
    method: "POST",
    body: JSON.stringify({ reason: "사용자 신고" }),
    signal,
  });
