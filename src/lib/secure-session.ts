import type {
  OrderCreatedData,
  OrderItem,
  QuoteData,
  StockPolicy,
  WaitingTicket,
} from "./api/contracts";
const WAITING_KEY = "live-purchase:waiting";
const ORDER_KEY = "live-purchase:order";
const REVIEW_KEY = "live-purchase:review";
const DRAFT_KEY = "live-purchase:draft";
export type StoredOrder = OrderCreatedData;
export type PurchaseDraft = {
  items: OrderItem[];
  buyerName: string;
  phone: string;
  address: string;
  addressParts?: {
    province: string;
    city: string;
    street: string;
    building?: string;
    detail: string;
  };
  stockPolicy: StockPolicy;
  couponCode: string;
};
export type StoredReview = { quote: QuoteData; draft: PurchaseDraft };
const storage = () =>
  typeof window === "undefined" ? undefined : window.sessionStorage;
export function saveWaitingTicket(ticket: WaitingTicket) {
  storage()?.setItem(WAITING_KEY, JSON.stringify(ticket));
}
export function loadWaitingTicket(): WaitingTicket | null {
  try {
    const raw = storage()?.getItem(WAITING_KEY);
    return raw ? (JSON.parse(raw) as WaitingTicket) : null;
  } catch {
    return null;
  }
}
export function clearWaitingTicket() {
  storage()?.removeItem(WAITING_KEY);
}
export function saveOrder(order: StoredOrder) {
  storage()?.setItem(ORDER_KEY, JSON.stringify(order));
}
export function loadOrder(): StoredOrder | null {
  try {
    const raw = storage()?.getItem(ORDER_KEY);
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  } catch {
    return null;
  }
}
export function clearOrder() {
  storage()?.removeItem(ORDER_KEY);
}
export function saveReview(review: StoredReview) {
  storage()?.setItem(REVIEW_KEY, JSON.stringify(review));
}
export function loadReview(): StoredReview | null {
  try {
    const raw = storage()?.getItem(REVIEW_KEY);
    return raw ? (JSON.parse(raw) as StoredReview) : null;
  } catch {
    return null;
  }
}
export function clearReview() {
  storage()?.removeItem(REVIEW_KEY);
}
export function savePurchaseDraft(draft: PurchaseDraft) {
  storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
}
export function loadPurchaseDraft(): PurchaseDraft | null {
  try {
    const raw = storage()?.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as PurchaseDraft) : null;
  } catch {
    return null;
  }
}
export function clearPurchaseDraft() {
  storage()?.removeItem(DRAFT_KEY);
}
