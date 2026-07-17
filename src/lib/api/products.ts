import { apiRequest, ticketHeaders } from "./client";
import {
  auctionEventSchema,
  lotOfferCreatedSchema,
  offerCreatedSchema,
  offerStatusSchema,
  productsSchema,
  type TicketCredentials,
} from "./contracts";

export type OfferInput =
  | { amount: number; quantity: number }
  | { quantity: number }
  | { buy_now: true; quantity: number };
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
  input: OfferInput,
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

export const getAuctionEvent = (eventId: string, signal?: AbortSignal) =>
  apiRequest(
    `/api/auction-events/${encodeURIComponent(eventId)}`,
    auctionEventSchema,
    { signal },
  );

export const createLotOffer = (
  lotId: string,
  input: OfferInput,
  ticket: TicketCredentials,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/api/auction-lots/${encodeURIComponent(lotId)}/offers`,
    lotOfferCreatedSchema,
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
