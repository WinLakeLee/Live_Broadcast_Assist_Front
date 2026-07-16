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
