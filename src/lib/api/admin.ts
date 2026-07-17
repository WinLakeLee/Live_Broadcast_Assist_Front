import { apiRequest } from "./client";
import {
  adminBroadcastsSchema,
  auctionEventSchema,
  auctionImportAnalyzedSchema,
  broadcastStartedSchema,
  productSchema,
  productsSchema,
  aiIdentificationSchema,
  type AdminProductInput,
  type AuctionEventInput,
  type AuctionImportImage,
  type BroadcastStartInput,
} from "./contracts";
import { z } from "zod";
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

export const createAuctionEvent = (
  key: string,
  input: AuctionEventInput,
  signal?: AbortSignal,
) =>
  apiRequest("/admin/api/auction-events", auctionEventSchema, {
    method: "POST",
    headers: { "X-Admin-API-Key": key },
    body: JSON.stringify(input),
    signal,
  });

export const analyzeAuctionImport = (
  key: string,
  input: { source_text: string } | { images: AuctionImportImage[] },
  signal?: AbortSignal,
) =>
  apiRequest(
    "/admin/api/auction-imports/analyze",
    auctionImportAnalyzedSchema,
    {
      method: "POST",
      headers: { "X-Admin-API-Key": key },
      body: JSON.stringify(input),
      signal,
    },
    30_000,
  );

export const getAdminBroadcasts = async (
  key: string,
  limit = 50,
  signal?: AbortSignal,
) =>
  (
    await apiRequest(`/admin/api/broadcasts?limit=${limit}`, adminBroadcastsSchema, {
      headers: { "X-Admin-API-Key": key },
      signal,
    })
  ).broadcasts;

export const startBroadcast = (
  key: string,
  input: BroadcastStartInput,
  signal?: AbortSignal,
) =>
  apiRequest("/admin/api/broadcasts", broadcastStartedSchema, {
    method: "POST",
    headers: { "X-Admin-API-Key": key },
    body: JSON.stringify(input),
    signal,
  });

export const endBroadcast = (
  key: string,
  broadcastId: string,
  signal?: AbortSignal,
) =>
  apiRequest(
    `/admin/api/broadcasts/${encodeURIComponent(broadcastId)}/end`,
    z.object({}).loose(),
    {
      method: "POST",
      headers: { "X-Admin-API-Key": key },
      signal,
    },
  );

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
    body: formData,
    signal,
  });
};
