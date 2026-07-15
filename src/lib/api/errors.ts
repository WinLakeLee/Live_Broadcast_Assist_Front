import { z } from "zod";

const errorEnvelope = z.object({
  status: z.literal("error"),
  code: z.string().catch("UNKNOWN"),
  message: z.string().catch("요청을 처리하지 못했습니다."),
  data: z.unknown().optional(),
});

export class ApiError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = Date.parse(value);
  return Number.isNaN(date)
    ? undefined
    : Math.max(0, Math.ceil((date - now) / 1000));
}

export function safeApiError(
  status: number,
  body: unknown,
  retryAfter?: number,
): ApiError {
  const parsed = errorEnvelope.safeParse(body);
  const message =
    status === 404
      ? "주문 정보를 확인할 수 없습니다. 주문번호와 조회키를 다시 확인해 주세요."
      : parsed.success
        ? parsed.data.message
        : "서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  return new ApiError(
    status,
    parsed.success ? parsed.data.code : "UNEXPECTED_RESPONSE",
    message,
    retryAfter,
  );
}
