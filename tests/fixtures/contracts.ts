import type { Product, QuoteData, OrderStatusData } from "@/lib/api/contracts";

export const ok = (data: unknown) => ({
  status: "success",
  code: "TEST_OK",
  message: "ok",
  data,
});

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  product_id: "prd-test-product",
  product_name: "테스트 상품",
  unit_price: 12_000,
  stock_limit: 10,
  reserved_quantity: 1,
  available_quantity: 9,
  active: true,
  display_order: 1,
  purchase_method: "fixed_price",
  reserve_price: 0,
  bid_increment: 0,
  sale_starts_at: "",
  sale_ends_at: "",
  purchase_flow: "checkout",
  sku: "SKU-TEST",
  category_major: "식품",
  category_minor: "간편식",
  category_detail: "테스트",
  expected_arrival_date: "",
  arrival_date: "",
  inventory_status: "unscheduled",
  catalog: null,
  listing: null,
  inventory: [],
  ...overrides,
});

export const makeQuote = (overrides: Partial<QuoteData> = {}): QuoteData => ({
  subtotal: 12_000,
  discount_amount: 0,
  promotion_id: "",
  payment_amount: 12_000,
  quote_token: "quote-token",
  expires_at: "2099-01-01T00:00:00Z",
  lines: [
    {
      product_id: "prd-test-product",
      product_name: "테스트 상품",
      quantity: 1,
      unit_price: 12_000,
      line_amount: 12_000,
      available_quantity: 9,
      accepted: true,
    },
  ],
  ...overrides,
});

export const makeOrderStatus = (
  overrides: Partial<OrderStatusData> = {},
): OrderStatusData => ({
  order_reference: "ORDER-REF",
  status_code: "payment_pending",
  status: "결제대기",
  created_at: "2026-07-16T10:00:00Z",
  buyer_name: "홍**",
  phone: "********5678",
  address: "서울특별시 ***",
  expected_amount: 12_000,
  paid_amount: 0,
  difference: 12_000,
  courier: {
    provider: "cu_lotte",
    display_name: "CU(롯데택배)",
    tracking_url: "https://www.lotteglogis.com/track",
  },
  items: [],
  ...overrides,
});

export const broadcastData = {
  platform: "youtube",
  video_id: "video-id",
  embed_url: "https://www.youtube-nocookie.com/embed/video-id",
  chat_embed_url:
    "https://www.youtube.com/live_chat?v=video-id&embed_domain=shop.example.com",
  watch_url: "https://www.youtube.com/watch?v=video-id",
  chat: {
    provider: "youtube",
    mode: "embedded_live_chat",
    video_id: "video-id",
    synchronized_with_video: true,
    mobile_web_embed: false,
  },
  mobile_chat: {
    current_mode: "dual_first_party_write_youtube_read",
    custom_api_available: true,
    requires_viewer_google_oauth: false,
    read_api: "/api/chat/messages",
    write_api: "/api/chat/messages",
    youtube_source: "liveChatMessages.list",
    youtube_write_enabled: false,
    youtube_read_enabled: true,
  },
  capabilities: {
    video_embed: true,
    chat_embed: true,
    chat_embed_mobile_web: false,
    site_checkout: true,
    first_party_chat: true,
    combined_chat_feed: true,
  },
};
