"use client";
import { useReducer } from "react";
import type {
  Product,
  QuoteData,
  TicketCredentials,
} from "@/lib/api/contracts";
import type { CheckoutDraft } from "@/features/checkout/domain";

export type Draft = CheckoutDraft;
type BaseData = {
  ticket: TicketCredentials;
  products: Product[];
  draft: Draft;
};
export type PurchaseState =
  | { status: "booting" }
  | { status: "ready"; ticket: TicketCredentials }
  | { status: "loadingProducts"; ticket: TicketCredentials }
  | ({ status: "editingOrder" } & BaseData)
  | ({ status: "quoting" } & BaseData)
  | ({ status: "quoteReady"; quote: QuoteData } & BaseData)
  | {
      status: "recoverableError";
      previous: PurchaseState;
      message: string;
      retry: string;
    }
  | { status: "fatalError"; message: string };

export type PurchaseEvent =
  | { type: "TICKET_READY"; ticket: TicketCredentials }
  | { type: "LOAD_PRODUCTS" }
  | { type: "PRODUCTS_LOADED"; products: Product[]; draft: Draft }
  | { type: "EDIT"; draft: Draft }
  | { type: "REQUEST_QUOTE" }
  | { type: "QUOTE_RECEIVED"; quote: QuoteData }
  | { type: "INVALIDATE_QUOTE"; draft: Draft }
  | { type: "ERROR"; message: string; retry: string }
  | { type: "FATAL"; message: string }
  | { type: "RETRY" };

export const initialPurchaseState: PurchaseState = { status: "booting" };
const hasBase = (s: PurchaseState): s is Extract<PurchaseState, BaseData> =>
  "ticket" in s && "products" in s && "draft" in s;

export function purchaseReducer(
  state: PurchaseState,
  event: PurchaseEvent,
): PurchaseState {
  switch (event.type) {
    case "TICKET_READY":
      return state.status === "booting"
        ? { status: "ready", ticket: event.ticket }
        : state;
    case "LOAD_PRODUCTS":
      return state.status === "ready"
        ? { status: "loadingProducts", ticket: state.ticket }
        : state;
    case "PRODUCTS_LOADED":
      return state.status === "loadingProducts"
        ? {
            status: "editingOrder",
            ticket: state.ticket,
            products: event.products,
            draft: event.draft,
          }
        : state;
    case "EDIT":
      return hasBase(state)
        ? {
            status: "editingOrder",
            ticket: state.ticket,
            products: state.products,
            draft: event.draft,
          }
        : state;
    case "INVALIDATE_QUOTE":
      return hasBase(state)
        ? {
            status: "editingOrder",
            ticket: state.ticket,
            products: state.products,
            draft: event.draft,
          }
        : state;
    case "REQUEST_QUOTE":
      return state.status === "editingOrder"
        ? { ...state, status: "quoting" }
        : state;
    case "QUOTE_RECEIVED":
      return state.status === "quoting"
        ? { ...state, status: "quoteReady", quote: event.quote }
        : state;
    case "ERROR":
      return {
        status: "recoverableError",
        previous: state,
        message: event.message,
        retry: event.retry,
      };
    case "FATAL":
      return { status: "fatalError", message: event.message };
    case "RETRY":
      return state.status === "recoverableError" ? state.previous : state;
    default:
      return state;
  }
}
export function usePurchaseMachine() {
  return useReducer(purchaseReducer, initialPurchaseState);
}
