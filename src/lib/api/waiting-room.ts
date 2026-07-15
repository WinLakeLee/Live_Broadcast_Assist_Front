import { apiRequest } from "./client";
import { waitingStatusSchema, waitingTicketSchema, type WaitingTicket } from "./contracts";

export const issueTicket = (signal?: AbortSignal) => apiRequest("/waiting-room/tickets", waitingTicketSchema, { method: "POST", signal });
export const checkTicket = (ticket: WaitingTicket, signal?: AbortSignal) => apiRequest(
  `/waiting-room/tickets/${encodeURIComponent(ticket.ticket_id)}`, waitingStatusSchema,
  { signal, headers: { "X-Waiting-Room-Token": ticket.ticket_token } },
);
