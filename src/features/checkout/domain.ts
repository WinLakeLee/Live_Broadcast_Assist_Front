import type {
  OrderItem,
  Product,
  StockPolicy,
} from "@/lib/api/contracts";
import type { PurchaseDraft } from "@/lib/secure-session";
import type { BuyerForm } from "@/lib/validation";

export type CheckoutDraft = {
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

export const emptyBuyerForm: BuyerForm = {
  buyer_name: "",
  phone: "",
  address_province: "",
  address_city: "",
  address_street: "",
  address_building: "",
  address_detail: "",
  stock_policy: "partial",
  coupon_code: "",
  privacy_agreed: false as true,
  policy_agreed: false as true,
};

export function buyerFormFromDraft(draft: PurchaseDraft | null): BuyerForm {
  if (!draft) return { ...emptyBuyerForm };
  return {
    buyer_name: draft.buyerName,
    phone: draft.phone,
    address_province: draft.addressParts?.province ?? "",
    address_city: draft.addressParts?.city ?? "",
    address_street: draft.addressParts?.street ?? "",
    address_building: draft.addressParts?.building ?? "",
    address_detail: draft.addressParts?.detail ?? "",
    stock_policy: draft.stockPolicy,
    coupon_code: draft.couponCode ?? "",
    privacy_agreed: true,
    policy_agreed: true,
  };
}

export function quantitiesFromDraft(draft: PurchaseDraft | null) {
  return Object.fromEntries(
    draft?.items.map((item) => [item.product_id, item.quantity]) ?? [],
  );
}

export function createCheckoutDraft(
  form: BuyerForm,
  quantities: Record<string, number>,
): CheckoutDraft {
  const parts = [
    form.address_province,
    form.address_city,
    form.address_street,
    form.address_building ? `(${form.address_building})` : "",
    form.address_detail
  ].filter(Boolean);
  
  return {
    items: Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity })),
    buyerName: form.buyer_name,
    phone: form.phone,
    address: parts.join(" "),
    addressParts: {
      province: form.address_province,
      city: form.address_city,
      street: form.address_street,
      building: form.address_building,
      detail: form.address_detail,
    },
    stockPolicy: form.stock_policy,
    couponCode: form.coupon_code,
  };
}

export function checkoutProducts(products: Product[]) {
  return products
    .filter((product) => product.active && product.purchase_flow === "checkout")
    .sort((a, b) => a.display_order - b.display_order);
}

export function sanitizeCheckoutQuantities(
  products: Product[],
  quantities: Record<string, number>,
) {
  const available = new Map(
    checkoutProducts(products).map((product) => [
      product.product_id,
      product.available_quantity,
    ]),
  );
  return Object.fromEntries(
    Object.entries(quantities)
      .filter(([name]) => available.has(name))
      .map(([name, quantity]) => [
        name,
        Math.max(0, Math.min(available.get(name) ?? 0, quantity)),
      ]),
  );
}
