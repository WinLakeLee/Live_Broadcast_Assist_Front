import { apiRequest, ticketHeaders } from "./client";
import { orderCreatedSchema, orderStatusSchema, paymentMatchSchema, quoteSchema, type OrderItem, type StockPolicy, type TicketCredentials } from "./contracts";

export const getQuote = (input: { stock_policy: StockPolicy; items: OrderItem[] }, ticket: TicketCredentials, signal?: AbortSignal) =>
  apiRequest("/orders/quote", quoteSchema, { method: "POST", headers: ticketHeaders(ticket), body: JSON.stringify(input), signal });
export const createOrder = (input: { buyer_name: string; phone: string; address: string; push_token: string; stock_policy: StockPolicy; quoted_amount: number; quote_token: string; captcha_token: string; items: OrderItem[] }, ticket: TicketCredentials, signal?: AbortSignal) =>
  apiRequest("/orders", orderCreatedSchema, { method: "POST", headers: ticketHeaders(ticket), body: JSON.stringify(input), signal }, 20_000);
export const registerDepositor = (reference: string, token: string, input: { depositor_name: string; bank_name: string }, signal?: AbortSignal) =>
  apiRequest(`/orders/${encodeURIComponent(reference)}/depositor`, paymentMatchSchema, { method: "POST", headers: { "X-Order-Token": token }, body: JSON.stringify(input), signal });
export const getOrderStatus = (reference: string, token: string, signal?: AbortSignal) =>
  apiRequest(`/orders/${encodeURIComponent(reference)}/status`, orderStatusSchema, { headers: { "X-Order-Token": token }, signal });
