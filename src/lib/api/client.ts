import type { ZodType } from "zod";
import { getPublicEnv } from "@/lib/env";
import { ApiError, parseRetryAfter, safeApiError } from "./errors";

const envelope = <T>(schema: ZodType<T>) => ({
  parse: (value: unknown): T => {
    if (
      !value ||
      typeof value !== "object" ||
      !("data" in value) ||
      !("status" in value) ||
      value.status !== "success" ||
      !("code" in value) ||
      typeof value.code !== "string" ||
      !("message" in value) ||
      typeof value.message !== "string"
    )
      throw new Error("invalid envelope");
    return schema.parse((value as { data: unknown }).data);
  },
});

export async function apiRequest<T>(
  path: string,
  schema: ZodType<T>,
  init: RequestInit = {},
  timeoutMs = 12_000,
): Promise<T> {
  const controller = new AbortController();
  const outerSignal = init.signal;
  const onAbort = () => controller.abort(outerSignal?.reason);
  outerSignal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new DOMException("Request timeout", "TimeoutError")),
    timeoutMs,
  );
  try {
    const response = await fetch(`${getPublicEnv().apiBaseUrl}${path}`, {
      ...init,
      credentials: "omit",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const retryAfter = parseRetryAfter(response.headers.get("Retry-After"));
    const contentType = response.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().includes("application/json"))
      throw new ApiError(
        response.status,
        "NON_JSON_RESPONSE",
        "서버 응답 형식이 올바르지 않습니다.",
        retryAfter,
      );
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_JSON",
        "서버 응답을 확인할 수 없습니다.",
        retryAfter,
      );
    }
    if (!response.ok) throw safeApiError(response.status, body, retryAfter);
    try {
      return envelope(schema).parse(body);
    } catch {
      throw new ApiError(
        response.status,
        "INVALID_RESPONSE",
        "서버 응답 형식이 올바르지 않습니다.",
      );
    }
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onAbort);
  }
}

export function ticketHeaders(ticket?: {
  enabled: boolean;
  ticketId: string;
  ticketToken: string;
}): HeadersInit {
  return ticket?.enabled
    ? {
        "X-Waiting-Room-Ticket": ticket.ticketId,
        "X-Waiting-Room-Token": ticket.ticketToken,
      }
    : {};
}
