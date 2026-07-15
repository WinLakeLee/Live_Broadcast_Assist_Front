import { z } from "zod";

export const waitingTicketSchema = z.object({
  enabled: z.boolean(), status: z.enum(["waiting", "ready"]), ticket_id: z.string(),
  ticket_token: z.string(), position: z.number().int().nonnegative(), retry_after_seconds: z.number().positive(),
});
export type WaitingTicket = z.infer<typeof waitingTicketSchema>;

export const waitingStatusSchema = z.object({
  enabled: z.boolean(), status: z.enum(["waiting", "ready", "processing", "expired"]),
  position: z.number().int().nonnegative(), retry_after_seconds: z.number().positive(),
});
export type WaitingStatus = z.infer<typeof waitingStatusSchema>;

export const productSchema = z.object({
  product_name: z.string(), unit_price: z.number().nonnegative(), stock_limit: z.number().int().nonnegative(),
  reserved_quantity: z.number().int().nonnegative(), available_quantity: z.number().int().nonnegative(),
  active: z.boolean(), display_order: z.number().int(),
});
export type Product = z.infer<typeof productSchema>;
export const productsSchema = z.array(productSchema);

export const orderItemSchema = z.object({ product_name: z.string(), quantity: z.number().int().positive() });
export type OrderItem = z.infer<typeof orderItemSchema>;
export const stockPolicySchema = z.enum(["partial", "all_or_nothing"]);
export type StockPolicy = z.infer<typeof stockPolicySchema>;

export const quoteSchema = z.object({
  payment_amount: z.number().nonnegative(), quote_token: z.string().min(1), expires_at: z.string().min(1), lines: z.array(z.object({
    product_name: z.string(), quantity: z.number().int().positive(), unit_price: z.number().nonnegative(),
    line_amount: z.number().nonnegative(), available_quantity: z.number().int().nonnegative(), accepted: z.boolean(),
  })),
});
export type QuoteData = z.infer<typeof quoteSchema>;

export const orderCreatedSchema = z.object({
  order_reference: z.string(), order_token: z.string(), payment_amount: z.number().nonnegative(),
  accepted_count: z.number().int().nonnegative(), cancelled_count: z.number().int().nonnegative(),
});
export type OrderCreatedData = z.infer<typeof orderCreatedSchema>;

export const paymentMatchSchema = z.object({
  status: z.string(), expected_amount: z.number(), paid_amount: z.number(), difference: z.number(),
  courier: z.object({ provider: z.string(), display_name: z.string(), tracking_url: z.string() }),
});
export type PaymentMatchData = z.infer<typeof paymentMatchSchema>;

export const orderStatusSchema = z.object({
  order_reference: z.string(), status: z.string(), created_at: z.string(), buyer_name: z.string(), phone: z.string(),
  address: z.string(), expected_amount: z.number(), paid_amount: z.number(), difference: z.number(),
  courier: z.object({ provider: z.string(), display_name: z.string(), tracking_url: z.string() }),
  items: z.array(z.object({ product_name: z.string(), quantity: z.number().int(), price: z.number(), status: z.string(),
    cancellation_reason: z.string(), tracking_number: z.string() })),
});
export type OrderStatusData = z.infer<typeof orderStatusSchema>;

export type TicketCredentials = { enabled: boolean; ticketId: string; ticketToken: string };
export type AdminProductInput = Pick<Product, "product_name" | "unit_price" | "stock_limit" | "active" | "display_order">;
