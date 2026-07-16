import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminProducts, saveAdminProduct } from "@/lib/api/admin";
import { getBroadcast } from "@/lib/api/broadcast";
import {
  createChatSession,
  getChatMessages,
  postChatMessage,
  reportChatMessage,
} from "@/lib/api/chat";
import {
  createOrder,
  getOrderStatus,
  getPaymentMethods,
  getQuote,
  registerDepositor,
  startPayment,
  updatePushToken,
} from "@/lib/api/orders";
import { createOffer, getOfferStatus, getProducts } from "@/lib/api/products";
import { checkTicket, issueTicket } from "@/lib/api/waiting-room";
import type { AdminProductInput, WaitingTicket } from "@/lib/api/contracts";
import { broadcastData, makeOrderStatus, makeProduct, makeQuote, ok } from "../fixtures/contracts";

const fetchMock = vi.fn();
const ticket = { enabled: true, ticketId: "ticket-id", ticketToken: "ticket-token" };
const waitingTicket: WaitingTicket = {
  enabled: true,
  status: "waiting",
  ticket_id: "ticket-id",
  ticket_token: "ticket-token",
  position: 2,
  retry_after_seconds: 1,
};

function respond(data: unknown) {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(ok(data)), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

function request(index = -1) {
  const calls = fetchMock.mock.calls;
  return calls[index < 0 ? calls.length + index : index] as [string, RequestInit];
}

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("P1 API 모듈 회귀", () => {
  it("대기표 발급과 상태 조회에 고정 헤더를 적용한다", async () => {
    respond(waitingTicket);
    await issueTicket();
    expect(request()[0]).toBe("http://localhost:8000/waiting-room/tickets");
    expect(request()[1].method).toBe("POST");

    respond({ enabled: true, status: "ready", position: 0, retry_after_seconds: 0 });
    await checkTicket(waitingTicket);
    expect(request()[0]).toContain("/waiting-room/tickets/ticket-id");
    expect(new Headers(request()[1].headers).get("X-Waiting-Room-Token")).toBe("ticket-token");
  });

  it("상품 조회·경매 제안·결과 조회의 URL과 비밀 헤더를 보존한다", async () => {
    respond({ products: [makeProduct()] });
    await expect(getProducts(ticket)).resolves.toHaveLength(1);
    expect(new Headers(request()[1].headers).get("X-Waiting-Room-Ticket")).toBe("ticket-id");

    respond({
      offer_reference: "OFFER-REF",
      offer_token: "offer-token",
      product_id: "prd-test-product",
      product_name: "테스트 상품",
      purchase_method: "auction",
      amount: 15_000,
      quantity: 1,
      status: "accepted",
      sale_ends_at: "2099-01-01T00:00:00Z",
    });
    await createOffer("prd/test-product", { amount: 15_000, quantity: 1 }, ticket);
    expect(request()[0]).toContain("/api/products/by-id/prd%2Ftest-product/offers");
    expect(JSON.parse(String(request()[1].body))).toEqual({ amount: 15_000, quantity: 1 });

    respond({ amount: 15_000, quantity: 1, result: "pending" });
    await getOfferStatus("OFFER/REF", "offer-token");
    expect(request()[0]).toContain("OFFER%2FREF");
    expect(new Headers(request()[1].headers).get("X-Purchase-Offer-Token")).toBe("offer-token");
  });

  it("견적과 주문 생성은 서버 금액·토큰·대기표를 그대로 전송한다", async () => {
    respond(makeQuote());
    await getQuote(
      { stock_policy: "partial", coupon_code: "WELCOME", items: [{ product_id: "prd-product", quantity: 1 }] },
      ticket,
    );
    expect(request()[1].method).toBe("POST");

    respond({
      order_reference: "ORDER-REF",
      order_token: "order-token",
      payment_amount: 12_000,
      accepted_count: 1,
      cancelled_count: 0,
    });
    await createOrder(
      {
        buyer_name: "홍길동",
        phone: "010-0000-0000",
        address: "서울특별시 테스트 주소",
        push_token: "",
        stock_policy: "partial",
        quoted_amount: 12_000,
        quoted_subtotal: 12_000,
        coupon_code: "",
        quote_token: "quote-token",
        captcha_token: "captcha",
        items: [{ product_id: "prd-product", quantity: 1 }],
      },
      ticket,
    );
    const body = JSON.parse(String(request()[1].body));
    expect(body).toMatchObject({ quoted_amount: 12_000, quote_token: "quote-token", push_token: "" });
    expect(body.items).toEqual([{ product_id: "prd-product", quantity: 1 }]);
    expect(body.items[0]).not.toHaveProperty("product_name");
  });

  it("입금·조회·결제·푸시 endpoint에 주문 토큰을 적용한다", async () => {
    respond({ status_code: "payment_pending", status: "결제대기", expected_amount: 12_000, paid_amount: 0, difference: 12_000 });
    await registerDepositor("ORDER/REF", "order-token", { depositor_name: "홍길동", bank_name: "국민은행" });
    expect(request()[0]).toContain("ORDER%2FREF/depositor");

    respond(makeOrderStatus());
    await getOrderStatus("ORDER-REF", "order-token");

    respond({ methods: [{ provider: "bank_transfer", enabled: true, flow: "manual_transfer" }] });
    await getPaymentMethods();

    respond({
      provider: "bank_transfer",
      flow: "manual_transfer",
      payment_attempt_id: "attempt-id",
      merchant_order_id: "merchant-id",
      amount: 12_000,
      expires_at: "2099-01-01T00:00:00Z",
      next_action: { type: "show_bank_account" },
    });
    const payment = await startPayment("ORDER-REF", "order-token", "bank_transfer");
    expect(payment).toHaveProperty("next_action");

    respond({});
    await updatePushToken("ORDER-REF", "order-token", "device-token-long-enough");
    expect(JSON.parse(String(request()[1].body))).toEqual({ push_token: "device-token-long-enough" });
    expect(new Headers(request()[1].headers).get("X-Order-Token")).toBe("order-token");
  });

  it("방송과 채팅의 공개·인증 요청을 계약 경로로 보낸다", async () => {
    respond(broadcastData);
    await getBroadcast();

    respond({ session_id: "0123456789abcdef0123456789abcdef", session_token: "x".repeat(32), nickname: "닉네임", expires_at: "2099-01-01T00:00:00Z" });
    await createChatSession("닉네임");

    respond({ messages: [], next_cursor: "next cursor" });
    await getChatMessages("cursor/value");
    expect(request()[0]).toContain("after=cursor%2Fvalue");

    respond({ message_id: "own-1", source: "first_party", author_name: "닉네임", message: "안녕", created_at: "2026-01-01T00:00:00Z", can_report: true });
    await postChatMessage("session-id", "session-token", "안녕");
    expect(new Headers(request()[1].headers).get("X-Chat-Session-Token")).toBe("session-token");

    respond({});
    await reportChatMessage("message/id");
    expect(request()[0]).toContain("message%2Fid/reports");
  });

  it("관리자 조회와 저장은 키를 헤더에만 넣고 빈 날짜를 문자열로 유지한다", async () => {
    respond({ products: [makeProduct()] });
    await getAdminProducts("admin-key");
    expect(request()[0]).not.toContain("admin-key");
    expect(new Headers(request()[1].headers).get("X-Admin-API-Key")).toBe("admin-key");

    const input: AdminProductInput = {
      product_id: "",
      product_name: "상품", unit_price: 1, stock_limit: 0, active: true, display_order: 0,
      purchase_method: "fixed_price", reserve_price: 0, bid_increment: 0, sale_starts_at: "", sale_ends_at: "",
      sku: "SKU", category_major: "", category_minor: "", category_detail: "", expected_arrival_date: "", arrival_date: "",
      catalog_item_id: "", seller_id: "direct", brand_name: "", manufacturer: "", model_number: "", product_type: "GENERAL",
      description: "", condition_type: "new", parent_sku: "", barcode: "", option_values: {}, attributes: {}, image_urls: [],
      warehouse_code: "MAIN", inbound_quantity: 0,
    };
    respond(makeProduct());
    await saveAdminProduct("admin-key", input);
    expect(JSON.parse(String(request()[1].body))).toMatchObject({ sale_starts_at: "", expected_arrival_date: "" });
  });
});
