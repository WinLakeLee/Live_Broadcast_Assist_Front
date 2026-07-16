import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, ticketHeaders } from "@/lib/api/client";
import {
  broadcastSchema,
  chatFeedSchema,
  chatMessageSchema,
  chatSessionSchema,
  depositorResultSchema,
  offerCreatedSchema,
  offerStatusSchema,
  orderCreatedSchema,
  orderItemSchema,
  orderStatusSchema,
  paymentAttemptSchema,
  paymentMethodsSchema,
  productSchema,
  productsSchema,
  quoteSchema,
  stockPolicySchema,
  waitingStatusSchema,
  waitingTicketSchema,
} from "@/lib/api/contracts";
import { ApiError, parseRetryAfter, safeApiError } from "@/lib/api/errors";
import {
  clearOrder,
  clearPurchaseDraft,
  clearReview,
  clearWaitingTicket,
  loadOrder,
  loadPurchaseDraft,
  loadReview,
  loadWaitingTicket,
  saveOrder,
  savePurchaseDraft,
  saveReview,
  saveWaitingTicket,
} from "@/lib/secure-session";
import { buyerSchema } from "@/lib/validation";
import { broadcastData, makeOrderStatus, makeProduct, makeQuote } from "../fixtures/contracts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("P0 계약 스키마 회귀", () => {
  it("공개 성공 자료형 전체가 계약 fixture를 통과한다", () => {
    expect(broadcastSchema.parse(broadcastData).video_id).toBe("video-id");
    expect(chatSessionSchema.parse({ session_id: "a".repeat(32), session_token: "x".repeat(32), nickname: "닉", expires_at: "2099-01-01" })).toBeTruthy();
    const message = { message_id: "m1", source: "first_party", author_name: "닉", message: "안녕", created_at: "2026-01-01", can_report: true };
    expect(chatMessageSchema.parse(message).source).toBe("first_party");
    expect(chatFeedSchema.parse({ messages: [message], next_cursor: "cursor" }).messages).toHaveLength(1);
    expect(waitingTicketSchema.parse({ enabled: false, status: "ready", ticket_id: "", ticket_token: "", position: 0, retry_after_seconds: 0 })).toBeTruthy();
    expect(waitingStatusSchema.parse({ enabled: true, status: "processing", position: 0, retry_after_seconds: 0 })).toBeTruthy();
    expect(productSchema.parse(makeProduct()).sku).toBe("SKU-TEST");
    expect(productsSchema.parse({ products: [makeProduct()] }).products).toHaveLength(1);
    expect(orderItemSchema.parse({ product_id: "prd-product", quantity: 1 })).toBeTruthy();
    expect(stockPolicySchema.parse("all_or_nothing")).toBe("all_or_nothing");
    expect(quoteSchema.parse(makeQuote()).quote_token).toBe("quote-token");
    expect(orderCreatedSchema.parse({ order_reference: "R", order_token: "T", payment_amount: 1, accepted_count: 1, cancelled_count: 0 })).toBeTruthy();
    expect(paymentMethodsSchema.parse({ methods: [{ provider: "bank_transfer", enabled: true, flow: "manual_transfer" }] })).toBeTruthy();
    expect(paymentAttemptSchema.parse({ provider: "bank_transfer", flow: "manual_transfer", payment_attempt_id: "A", merchant_order_id: "M", amount: 1, expires_at: "2099", next_action: {} })).toHaveProperty("next_action");
    expect(offerCreatedSchema.parse({ offer_reference: "R", offer_token: "T", product_id: "prd-product", product_name: "상품", purchase_method: "auction", amount: 1, quantity: 1, status: "accepted", sale_ends_at: "2099" })).toBeTruthy();
    expect(offerStatusSchema.parse({ amount: 1, quantity: 1, result: "won" }).result).toBe("won");
    expect(depositorResultSchema.parse({ status_code: "payment_pending", status: "결제대기", expected_amount: 1, paid_amount: 0, difference: 1 })).toBeTruthy();
    expect(orderStatusSchema.parse(makeOrderStatus()).order_reference).toBe("ORDER-REF");
  });

  it("금액·수량·열거형·배송 URL의 위험한 경계값을 거부한다", () => {
    expect(() => productSchema.parse(makeProduct({ unit_price: 0 }))).toThrow();
    expect(() => orderItemSchema.parse({ product_id: "prd-product", quantity: 0 })).toThrow();
    expect(() => stockPolicySchema.parse("best_effort")).toThrow();
    expect(() => orderStatusSchema.parse(makeOrderStatus({ courier: { provider: "x", display_name: "x", tracking_url: "http://unsafe.example" } }))).toThrow();
    expect(() => waitingStatusSchema.parse({ enabled: true, status: "ready", position: -1, retry_after_seconds: 0 })).toThrow();
  });
});

describe("P0 API 오류·전송 보안 회귀", () => {
  it("대기표 헤더는 활성화된 경우에만 생성한다", () => {
    expect(ticketHeaders()).toEqual({});
    expect(ticketHeaders({ enabled: false, ticketId: "I", ticketToken: "T" })).toEqual({});
    expect(ticketHeaders({ enabled: true, ticketId: "I", ticketToken: "T" })).toEqual({
      "X-Waiting-Room-Ticket": "I",
      "X-Waiting-Room-Token": "T",
    });
  });

  it("404는 서버 비밀 메시지를 숨기고 정상 오류만 보존한다", () => {
    expect(safeApiError(404, { status: "error", code: "SECRET", message: "token mismatch" }).message).not.toContain("token");
    expect(safeApiError(409, { status: "error", code: "CONFLICT", message: "다시 확인" })).toMatchObject({ code: "CONFLICT", message: "다시 확인" });
    expect(safeApiError(500, { invalid: true })).toMatchObject({ code: "UNEXPECTED_RESPONSE" });
  });

  it("Retry-After 숫자·날짜·오류값을 안전하게 해석한다", () => {
    expect(parseRetryAfter("3")).toBe(3);
    expect(parseRetryAfter("Thu, 01 Jan 1970 00:00:05 GMT", 0)).toBe(5);
    expect(parseRetryAfter("invalid")).toBeUndefined();
    expect(parseRetryAfter("-1")).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it("잘못된 JSON과 성공 schema 불일치를 구분한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("{", { headers: { "Content-Type": "application/json" } })));
    await expect(apiRequest("/broken", z.object({}))).rejects.toMatchObject({ code: "INVALID_JSON" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ status: "success", code: "OK", message: "ok", data: { value: "wrong" } }), { headers: { "Content-Type": "application/json" } })));
    await expect(apiRequest("/schema", z.object({ value: z.number() }))).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("ApiError는 HTTP 상태와 재시도 시간을 유지한다", () => {
    expect(new ApiError(429, "RATE", "잠시 후", 5)).toMatchObject({ httpStatus: 429, code: "RATE", retryAfter: 5, name: "ApiError" });
  });
});

describe("P0 민감 sessionStorage 회귀", () => {
  const draft = { items: [{ product_id: "prd-product", quantity: 1 }], buyerName: "홍길동", phone: "010", address: "서울 주소", stockPolicy: "partial" as const, couponCode: "" };

  it("모든 저장·조회·삭제 함수가 sessionStorage만 사용한다", () => {
    const waiting = { enabled: true, status: "ready" as const, ticket_id: "I", ticket_token: "T", position: 0, retry_after_seconds: 0 };
    const order = { order_reference: "R", order_token: "T", payment_amount: 1, accepted_count: 1, cancelled_count: 0 };
    saveWaitingTicket(waiting); saveOrder(order); savePurchaseDraft(draft); saveReview({ quote: makeQuote(), draft });
    expect(loadWaitingTicket()).toEqual(waiting);
    expect(loadOrder()).toEqual(order);
    expect(loadPurchaseDraft()).toEqual(draft);
    expect(loadReview()?.quote.quote_token).toBe("quote-token");
    expect(localStorage.length).toBe(0);
    clearWaitingTicket(); clearOrder(); clearPurchaseDraft(); clearReview();
    expect(sessionStorage.length).toBe(0);
  });

  it("손상된 저장값은 예외 대신 null로 복구한다", () => {
    for (const key of ["live-purchase:waiting", "live-purchase:order", "live-purchase:review", "live-purchase:draft"]) sessionStorage.setItem(key, "{");
    expect(loadWaitingTicket()).toBeNull();
    expect(loadOrder()).toBeNull();
    expect(loadReview()).toBeNull();
    expect(loadPurchaseDraft()).toBeNull();
  });
});

describe("P0 구매자 입력 검증", () => {
  it("정상 입력을 trim하고 동의·쿠폰 형식을 강제한다", () => {
    const parsed = buyerSchema.parse({ buyer_name: " 홍길동 ", phone: "010-1234-5678", address: " 서울특별시 테스트 ", stock_policy: "partial", coupon_code: "WELCOME_10", privacy_agreed: true, policy_agreed: true });
    expect(parsed.buyer_name).toBe("홍길동");
    expect(buyerSchema.safeParse({ ...parsed, coupon_code: "bad coupon" }).success).toBe(false);
    expect(buyerSchema.safeParse({ ...parsed, privacy_agreed: false }).success).toBe(false);
  });
});
