import { apiRequest, ticketHeaders } from "./client";
import { productsSchema, type TicketCredentials } from "./contracts";
export const getProducts = (ticket: TicketCredentials, signal?: AbortSignal) => apiRequest("/api/products", productsSchema, { signal, headers: ticketHeaders(ticket) });
