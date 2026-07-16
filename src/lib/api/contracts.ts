import { z } from "zod";

export const broadcastSchema = z
  .object({
    platform: z.string(),
    video_id: z.string(),
    embed_url: z.string(),
    chat_embed_url: z.string(),
    watch_url: z.string(),
    chat: z.object({
      provider: z.string(),
      mode: z.string(),
      video_id: z.string(),
      synchronized_with_video: z.boolean(),
      mobile_web_embed: z.boolean(),
    }),
    mobile_chat: z.object({
      current_mode: z.string(),
      custom_api_available: z.boolean(),
      requires_viewer_google_oauth: z.boolean(),
      read_api: z.string(),
      write_api: z.string(),
      youtube_source: z.string(),
      youtube_write_enabled: z.boolean(),
      youtube_read_enabled: z.boolean(),
    }),
    capabilities: z.object({
      video_embed: z.boolean(),
      chat_embed: z.boolean(),
      chat_embed_mobile_web: z.boolean(),
      site_checkout: z.boolean(),
      first_party_chat: z.boolean(),
      combined_chat_feed: z.boolean(),
    }),
  })
  .superRefine((value, context) => {
    if (
      value.chat.synchronized_with_video &&
      value.chat.video_id !== value.video_id
    ) {
      context.addIssue({
        code: "custom",
        message: "영상과 채팅의 YouTube 영상 ID가 일치하지 않습니다.",
      });
    }
  });
export type BroadcastData = z.infer<typeof broadcastSchema>;

export const chatSessionSchema = z.object({
  session_id: z.string().regex(/^[a-f0-9]{32}$/),
  session_token: z.string().min(32),
  nickname: z.string(),
  expires_at: z.string(),
});
export type ChatSession = z.infer<typeof chatSessionSchema>;

export const chatMessageSchema = z.object({
  message_id: z.string(),
  source: z.enum(["first_party", "youtube"]),
  author_name: z.string(),
  message: z.string(),
  created_at: z.string(),
  can_report: z.boolean(),
});
export const chatFeedSchema = z.object({
  messages: z.array(chatMessageSchema),
  next_cursor: z.string(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatFeed = z.infer<typeof chatFeedSchema>;

export const waitingTicketSchema = z.object({
  enabled: z.boolean(),
  status: z.enum(["waiting", "ready"]),
  ticket_id: z.string(),
  ticket_token: z.string(),
  position: z.number().int().nonnegative(),
  retry_after_seconds: z.number().nonnegative(),
});
export type WaitingTicket = z.infer<typeof waitingTicketSchema>;

export const waitingStatusSchema = z.object({
  enabled: z.boolean(),
  status: z.enum(["waiting", "ready", "processing", "expired"]),
  position: z.number().int().nonnegative(),
  retry_after_seconds: z.number().nonnegative(),
});
export type WaitingStatus = z.infer<typeof waitingStatusSchema>;

export const productSchema = z.object({
  product_id: z.string().min(1),
  product_name: z.string(),
  unit_price: z.number().int().positive(),
  stock_limit: z.number().int().nonnegative(),
  reserved_quantity: z.number().int().nonnegative(),
  available_quantity: z.number().int().nonnegative(),
  active: z.boolean(),
  display_order: z.number().int().min(0).max(1_000_000),
  purchase_method: z.enum(["fixed_price", "auction", "reverse_auction", "blind_auction"]),
  reserve_price: z.number().int().nonnegative(),
  bid_increment: z.number().int().nonnegative(),
  sale_starts_at: z.string(),
  sale_ends_at: z.string(),
  purchase_flow: z.enum(["checkout", "offer"]),
  sku: z.string(),
  category_major: z.string(),
  category_minor: z.string(),
  category_detail: z.string(),
  expected_arrival_date: z.string(),
  arrival_date: z.string(),
  inventory_status: z.enum(["unscheduled", "scheduled", "arrived"]),
  catalog: z.object({
    catalog_item_id: z.string(),
    brand_name: z.string(),
    manufacturer: z.string(),
    model_number: z.string(),
    product_type: z.string(),
    description: z.string(),
    detail_category_id: z.string(),
    parent_sku: z.string(),
    barcode: z.string(),
    option_values: z.record(z.string(), z.string()),
    attributes: z.record(z.string(), z.string()),
    image_urls: z.array(z.string().url()),
  }).nullable(),
  listing: z.object({
    listing_id: z.string(),
    seller_id: z.string(),
    variant_sku: z.string(),
    marketplace_code: z.string(),
    currency: z.string(),
    condition_type: z.enum(["new", "used_like_new", "used_good", "used_acceptable"]),
    status: z.string(),
  }).nullable(),
  inventory: z.array(z.object({
    location_code: z.string(),
    on_hand_quantity: z.number().int().nonnegative(),
    reserved_quantity: z.number().int().nonnegative(),
    available_quantity: z.number().int().nonnegative(),
    inbound_quantity: z.number().int().nonnegative(),
    expected_arrival_date: z.string(),
    arrival_date: z.string(),
  })),
});
export type Product = z.infer<typeof productSchema>;
export const productsSchema = z.object({ products: z.array(productSchema) });

export const orderItemSchema = z.object({
  product_id: z.string().min(1),
  quantity: z.number().int().positive(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;
export const stockPolicySchema = z.enum(["partial", "all_or_nothing"]);
export type StockPolicy = z.infer<typeof stockPolicySchema>;

export const quoteSchema = z.object({
  subtotal: z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  promotion_id: z.string(),
  payment_amount: z.number().nonnegative(),
  quote_token: z.string().min(1),
  expires_at: z.string().min(1),
  lines: z.array(
    z.object({
      product_id: z.string().min(1),
      product_name: z.string(),
      quantity: z.number().int().positive(),
      unit_price: z.number().nonnegative(),
      line_amount: z.number().nonnegative(),
      available_quantity: z.number().int().nonnegative(),
      accepted: z.boolean(),
    }),
  ),
});
export type QuoteData = z.infer<typeof quoteSchema>;

export const orderCreatedSchema = z.object({
  order_reference: z.string(),
  order_token: z.string(),
  payment_amount: z.number().nonnegative(),
  accepted_count: z.number().int().nonnegative(),
  cancelled_count: z.number().int().nonnegative(),
});
export type OrderCreatedData = z.infer<typeof orderCreatedSchema>;

export const paymentMethodsSchema = z.object({
  methods: z.array(
    z.object({
      provider: z.string(),
      enabled: z.boolean(),
      flow: z.string(),
    }),
  ),
});
export const paymentAttemptSchema = z
  .object({
    provider: z.string(),
    flow: z.string(),
    payment_attempt_id: z.string(),
    merchant_order_id: z.string(),
    amount: z.number().nonnegative(),
    expires_at: z.string(),
  })
  .loose();

export const offerCreatedSchema = z.object({
  offer_reference: z.string(),
  offer_token: z.string(),
  product_id: z.string().min(1),
  product_name: z.string(),
  purchase_method: z.enum(["auction", "reverse_auction", "blind_auction"]),
  amount: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  status: z.literal("accepted"),
  sale_ends_at: z.string(),
});
export const offerStatusSchema = z.object({
  amount: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
  result: z.enum(["pending", "won", "lost"]),
});

export const depositorResultSchema = z.object({
  status_code: z.string().min(1),
  status: z.string(),
  expected_amount: z.number(),
  paid_amount: z.number(),
  difference: z.number(),
});
export type DepositorResultData = z.infer<typeof depositorResultSchema>;

const courierSchema = z.object({
  provider: z.string(),
  display_name: z.string(),
  tracking_url: z
    .string()
    .refine(
      (value) => value === "" || /^https:\/\/[^\s#@]+$/i.test(value),
      "HTTPS 배송조회 URL 또는 빈 문자열이어야 합니다.",
    ),
});

export const orderStatusSchema = z.object({
  order_reference: z.string(),
  status_code: z.string().min(1),
  status: z.string(),
  created_at: z.string(),
  buyer_name: z.string(),
  phone: z.string(),
  address: z.string(),
  expected_amount: z.number(),
  paid_amount: z.number(),
  difference: z.number(),
  courier: courierSchema,
  items: z.array(
    z.object({
      product_id: z.string().min(1),
      product_name: z.string(),
      quantity: z.number().int(),
      price: z.number(),
      status_code: z.string().min(1),
      status: z.string(),
      cancellation_reason: z.string(),
      tracking_number: z.string(),
    }),
  ),
});
export type OrderStatusData = z.infer<typeof orderStatusSchema>;

export type TicketCredentials = {
  enabled: boolean;
  ticketId: string;
  ticketToken: string;
};
export type AdminProductInput = {
  product_id: string;
  product_name: string;
  unit_price: number;
  stock_limit: number;
  active: boolean;
  display_order: number;
  purchase_method: Product["purchase_method"];
  reserve_price: number;
  bid_increment: number;
  sale_starts_at: string;
  sale_ends_at: string;
  sku: string;
  category_major: string;
  category_minor: string;
  category_detail: string;
  expected_arrival_date: string;
  arrival_date: string;
  catalog_item_id: string;
  seller_id: string;
  brand_name: string;
  manufacturer: string;
  model_number: string;
  product_type: string;
  description: string;
  condition_type: "new" | "used_like_new" | "used_good" | "used_acceptable";
  parent_sku: string;
  barcode: string;
  option_values: Record<string, string>;
  attributes: Record<string, string>;
  image_urls: string[];
  warehouse_code: string;
  inbound_quantity: number;
};
