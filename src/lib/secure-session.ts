import type { OrderCreatedData, WaitingTicket } from "./api/contracts";
const WAITING_KEY = "live-purchase:waiting";
const ORDER_KEY = "live-purchase:order";
export type StoredOrder = OrderCreatedData;
const storage = () => typeof window === "undefined" ? undefined : window.sessionStorage;
export function saveWaitingTicket(ticket: WaitingTicket) { storage()?.setItem(WAITING_KEY, JSON.stringify(ticket)); }
export function loadWaitingTicket(): WaitingTicket | null { try { const raw = storage()?.getItem(WAITING_KEY); return raw ? JSON.parse(raw) as WaitingTicket : null; } catch { return null; } }
export function clearWaitingTicket() { storage()?.removeItem(WAITING_KEY); }
export function saveOrder(order: StoredOrder) { storage()?.setItem(ORDER_KEY, JSON.stringify(order)); }
export function loadOrder(): StoredOrder | null { try { const raw = storage()?.getItem(ORDER_KEY); return raw ? JSON.parse(raw) as StoredOrder : null; } catch { return null; } }
export function clearOrder() { storage()?.removeItem(ORDER_KEY); }
