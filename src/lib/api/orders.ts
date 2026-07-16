import { apiRequest, ticketHeaders } from "./client";
import { z } from "zod";
import {
  depositorResultSchema,
  orderCreatedSchema,
  orderStatusSchema,
  paymentAttemptSchema,
  paymentMethodsSchema,
  quoteSchema,
  type OrderItem,
  type StockPolicy,
  type TicketCredentials,
} from "./contracts";

export const getQuote = (
  input: { stock_policy: StockPolicy; coupon_code: string; items: OrderItem[] },
  ticket: TicketCredentials,
  signal?: AbortSignal,
) =>
  apiRequest("/orders/quote", quoteSchema, {
    method: "POST",
    headers: ticketHeaders(ticket),
    body: JSON.stringify(input),
    signal,
  });
export const createOrder = (
  input: {
    buyer_name: string;
    phone: string;
    address: string;
    push_token: string;
    stock_policy: StockPolicy;
    quoted_amount: number;
    quoted_subtotal: number;
    coupon_code: string;
    quote_token: string;
    captcha_token: string;
    items: OrderItem[];
  },
  ticket: TicketCredentials,
  signal?: AbortSignal,
) =>
  apiRequest(
    "/orders",
    orderCreatedSchema,
    {
      method: "POST",
      headers: ticketHeaders(ticket),
      body: JSON.stringify(input),
      signal,
    },
    20_000,
  );
export const registerDepositor = (
  reference: string,
  token: string,
  input: { depositor_name: string; bank_name: string },
  signal?: AbortSignal,
) =>
  apiRequest(
    `/orders/${encodeURIComponent(reference)}/depositor`,
    depositorResultSchema,
    {
      method: "POST",
      headers: { "X-Order-Token": token },
      body: JSON.stringify(input),
      signal,
    },
  );
export const getOrderStatus = (
  reference: string,
  token: string,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/orders/${encodeURIComponent(reference)}/status`,
    orderStatusSchema,
    { headers: { "X-Order-Token": token }, signal },
  );

export const getPaymentMethods = (signal?: AbortSignal) =>
  apiRequest("/payments/methods", paymentMethodsSchema, { signal });

export const startPayment = (
  reference: string,
  token: string,
  provider: string,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/orders/${encodeURIComponent(reference)}/payments`,
    paymentAttemptSchema,
    {
      method: "POST",
      headers: { "X-Order-Token": token },
      body: JSON.stringify({ provider }),
      signal,
    },
  );

export const updatePushToken = (
  reference: string,
  token: string,
  pushToken: string,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/orders/${encodeURIComponent(reference)}/push-token`,
    z.object({}),
    {
      method: "POST",
      headers: { "X-Order-Token": token },
      body: JSON.stringify({ push_token: pushToken }),
      signal,
    },
  );
