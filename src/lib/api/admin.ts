import { apiRequest } from "./client";
import { productSchema, productsSchema, type AdminProductInput } from "./contracts";
export const getAdminProducts = async (key: string, signal?: AbortSignal) =>
  (await apiRequest("/admin/api/products", productsSchema, { headers: { "X-Admin-API-Key": key }, signal })).products;
export const saveAdminProduct = (key: string, input: AdminProductInput, signal?: AbortSignal) => apiRequest("/admin/api/products", productSchema, { method: "PUT", headers: { "X-Admin-API-Key": key }, body: JSON.stringify(input), signal });
