import { apiRequest } from "./client";
import {
  productSchema,
  productsSchema,
  aiIdentificationSchema,
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
    body: JSON.stringify(input),
    signal,
  });

export const identifyProduct = (
  key: string,
  file: File,
  domain: string = "pokemon",
  signal?: AbortSignal,
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("domain", domain);
  return apiRequest("/admin/api/products/identify", aiIdentificationSchema, {
    method: "POST",
    headers: { "X-Admin-API-Key": key },
    body: formData as any,
    signal,
  });
};
