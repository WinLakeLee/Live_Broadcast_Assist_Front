import { apiRequest, ticketHeaders } from "./client";
import {
  offerCreatedSchema,
  offerStatusSchema,
  productsSchema,
  type TicketCredentials,
} from "./contracts";
export const getProducts = async (
  ticket: TicketCredentials,
  signal?: AbortSignal,
) =>
  (
    await apiRequest("/api/products", productsSchema, {
      signal,
      headers: ticketHeaders(ticket),
    })
  ).products;

export const createOffer = (
  productId: string,
  input: { amount: number; quantity: number },
  ticket: TicketCredentials,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/api/products/by-id/${encodeURIComponent(productId)}/offers`,
    offerCreatedSchema,
    {
      method: "POST",
      headers: ticketHeaders(ticket),
      body: JSON.stringify(input),
      signal,
    },
  );

export const getOfferStatus = (
  reference: string,
  token: string,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/api/purchase-offers/${encodeURIComponent(reference)}`,
    offerStatusSchema,
    { headers: { "X-Purchase-Offer-Token": token }, signal },
  );
