import { apiRequest } from "./client";
import {
  productSchema,
  productsSchema,
  type AdminProductInput,
} from "./contracts";
export const getAdminProducts = async (key: string, signal?: AbortSignal) =>
  (
    await apiRequest("/admin/api/products", productsSchema, {
      headers: { "X-Admin-API-Key": key },
      signal,
    })
  ).products;
export const saveAdminProduct = (
  key: string,
  input: AdminProductInput,
  signal?: AbortSignal,
) =>
  apiRequest("/admin/api/products", productSchema, {
    method: "PUT",
    headers: { "X-Admin-API-Key": key },
    body: JSON.stringify({
      ...input,
      sale_starts_at: input.sale_starts_at || null,
      sale_ends_at: input.sale_ends_at || null,
      expected_arrival_date: input.expected_arrival_date || null,
      arrival_date: input.arrival_date || null,
    }),
    signal,
  });
