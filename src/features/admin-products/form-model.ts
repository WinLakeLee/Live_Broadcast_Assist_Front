import { z } from "zod";

import type { AdminProductInput, Product } from "@/lib/api/contracts";

function isStringRecord(value: string) {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    return (
      Boolean(parsed) &&
      !Array.isArray(parsed) &&
      typeof parsed === "object" &&
      Object.entries(parsed as Record<string, unknown>).every(
        ([key, item]) => Boolean(key) && typeof item === "string",
      )
    );
  } catch {
    return false;
  }
}

export const adminProductFormSchema = z.object({
  product_id: z.string(),
  product_name: z.string().trim().min(1, "상품명을 입력해 주세요."),
  unit_price: z.number().int().positive("단가는 1원 이상이어야 합니다."),
  stock_limit: z.number().int().nonnegative(),
  active: z.boolean(),
  display_order: z
    .number()
    .int()
    .min(0)
    .max(1_000_000, "표시 순서는 0~1,000,000이어야 합니다."),
  purchase_method: z.enum([
    "fixed_price",
    "auction",
    "reverse_auction",
    "blind_auction",
  ]),
  reserve_price: z.number().int().nonnegative(),
  bid_increment: z.number().int().nonnegative(),
  sale_starts_at: z.string(),
  sale_ends_at: z.string(),
  sku: z.string().max(100),
  category_major: z.string().max(100),
  category_minor: z.string().max(100),
  category_detail: z.string().max(100),
  expected_arrival_date: z.string(),
  arrival_date: z.string(),
  catalog_item_id: z.string().max(100),
  seller_id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  brand_name: z.string().max(100),
  manufacturer: z.string().max(200),
  model_number: z.string().max(100),
  product_type: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().max(5000),
  condition_type: z.enum([
    "new",
    "used_like_new",
    "used_good",
    "used_acceptable",
  ]),
  parent_sku: z.string().max(100),
  barcode: z.string().max(100),
  option_values_json: z
    .string()
    .refine(isStringRecord, "옵션은 JSON 객체여야 합니다."),
  attributes_json: z
    .string()
    .refine(isStringRecord, "속성은 JSON 객체여야 합니다."),
  image_urls_text: z.string().refine(
    (value) =>
      value
        .split(/\r?\n/)
        .filter(Boolean)
        .every((url) => /^https:\/\//.test(url)),
    "이미지는 줄마다 HTTPS URL을 입력해 주세요.",
  ),
  warehouse_code: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  inbound_quantity: z.number().int().nonnegative(),
});

export type AdminProductForm = z.infer<typeof adminProductFormSchema>;

export const blankAdminProductForm: AdminProductForm = {
  product_id: "",
  product_name: "",
  unit_price: 1,
  stock_limit: 0,
  active: true,
  display_order: 1,
  purchase_method: "fixed_price",
  reserve_price: 0,
  bid_increment: 0,
  sale_starts_at: "",
  sale_ends_at: "",
  sku: "",
  category_major: "",
  category_minor: "",
  category_detail: "",
  expected_arrival_date: "",
  arrival_date: "",
  catalog_item_id: "",
  seller_id: "direct",
  brand_name: "",
  manufacturer: "",
  model_number: "",
  product_type: "GENERAL",
  description: "",
  condition_type: "new",
  parent_sku: "",
  barcode: "",
  option_values_json: "{}",
  attributes_json: "{}",
  image_urls_text: "",
  warehouse_code: "MAIN",
  inbound_quantity: 0,
};

export function productToAdminForm(product?: Product): AdminProductForm {
  if (!product) return { ...blankAdminProductForm };

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    unit_price: product.unit_price,
    stock_limit: product.stock_limit,
    active: product.active,
    display_order: product.display_order,
    purchase_method: product.purchase_method,
    reserve_price: product.reserve_price,
    bid_increment: product.bid_increment,
    sale_starts_at: product.sale_starts_at,
    sale_ends_at: product.sale_ends_at,
    sku: product.sku,
    category_major: product.category_major,
    category_minor: product.category_minor,
    category_detail: product.category_detail,
    expected_arrival_date: product.expected_arrival_date,
    arrival_date: product.arrival_date,
    catalog_item_id: product.catalog?.catalog_item_id ?? "",
    seller_id: product.listing?.seller_id ?? "direct",
    brand_name: product.catalog?.brand_name ?? "",
    manufacturer: product.catalog?.manufacturer ?? "",
    model_number: product.catalog?.model_number ?? "",
    product_type: product.catalog?.product_type ?? "GENERAL",
    description: product.catalog?.description ?? "",
    condition_type: product.listing?.condition_type ?? "new",
    parent_sku: product.catalog?.parent_sku ?? "",
    barcode: product.catalog?.barcode ?? "",
    option_values_json: JSON.stringify(product.catalog?.option_values ?? {}, null, 2),
    attributes_json: JSON.stringify(product.catalog?.attributes ?? {}, null, 2),
    image_urls_text: (product.catalog?.image_urls ?? []).join("\n"),
    warehouse_code: product.inventory[0]?.location_code ?? "MAIN",
    inbound_quantity: product.inventory[0]?.inbound_quantity ?? 0,
  };
}

export function adminFormToInput(form: AdminProductForm): AdminProductInput {
  const { option_values_json, attributes_json, image_urls_text, ...base } = form;
  return {
    ...base,
    option_values: JSON.parse(option_values_json || "{}") as Record<string, string>,
    attributes: JSON.parse(attributes_json || "{}") as Record<string, string>,
    image_urls: image_urls_text
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean),
  };
}

export function sortAdminProducts(products: Product[]) {
  return [...products].sort((a, b) => a.display_order - b.display_order);
}
