import type { Product } from "@/lib/api/contracts";
import type { MessageKey } from "@/features/preferences/i18n";

export function offerProducts(products: Product[]) {
  return products
    .filter((product) => product.active && product.purchase_flow === "offer")
    .sort((a, b) => a.display_order - b.display_order);
}

export function offerMethodMessageKey(
  method: Product["purchase_method"],
): MessageKey {
  return `offers.${method}`;
}

export type AuctionTimeState = {
  saleEndsAt: string;
  remainingSeconds: number;
  extensionCount: number;
  syncedAt: number;
};

export function auctionTimeFromProduct(product: Product): AuctionTimeState {
  return {
    saleEndsAt: product.sale_ends_at,
    remainingSeconds: remainingSecondsFrom(product.sale_ends_at),
    extensionCount: product.auction_extension_count,
    syncedAt: Date.now(),
  };
}

export function auctionTimeFromServer(server: {
  sale_ends_at: string;
  remaining_seconds: number;
  extension_count: number;
}): AuctionTimeState {
  return {
    saleEndsAt: server.sale_ends_at,
    remainingSeconds: server.remaining_seconds,
    extensionCount: server.extension_count,
    syncedAt: Date.now(),
  };
}

export function remainingSecondsFrom(saleEndsAt: string) {
  if (!saleEndsAt) return 0;
  const ends = new Date(saleEndsAt).getTime();
  if (Number.isNaN(ends)) return 0;
  return Math.max(0, Math.round((ends - Date.now()) / 1000));
}

// 서버가 마감을 연장할 수 있으므로 로컬 타이머는 표시에만 쓰고 마감 판정에 쓰지 않는다.
export function currentRemainingSeconds(state: AuctionTimeState) {
  const elapsed = Math.round((Date.now() - state.syncedAt) / 1000);
  return Math.max(0, state.remainingSeconds - elapsed);
}

export function formatRemaining(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
