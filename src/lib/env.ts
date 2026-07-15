export type PublicEnv = { apiBaseUrl: string; turnstileSiteKey: string; brandName: string; supportContact: string; valid: boolean; error?: string };

export function getPublicEnv(): PublicEnv {
  const raw = process.env.NEXT_PUBLIC_ORDER_API_BASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  let apiBaseUrl = raw.replace(/\/+$/, "");
  let error: string | undefined;
  try { if (apiBaseUrl) apiBaseUrl = new URL(apiBaseUrl).toString().replace(/\/+$/, ""); }
  catch { error = "주문 API 주소 형식이 올바르지 않습니다."; }
  if (process.env.NODE_ENV === "production" && (!apiBaseUrl || !key)) error = "운영 환경의 주문 API 주소 또는 Turnstile 사이트 키가 설정되지 않았습니다.";
  return { apiBaseUrl: apiBaseUrl || "http://localhost:8000", turnstileSiteKey: key, brandName: process.env.NEXT_PUBLIC_BRAND_NAME || "라이브 구매", supportContact: process.env.NEXT_PUBLIC_SUPPORT_CONTACT || "", valid: !error, error };
}
