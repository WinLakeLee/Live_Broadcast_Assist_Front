import { apiRequest, ticketHeaders } from "./client";
import { productsSchema, type TicketCredentials } from "./contracts";
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
