const turnstileOrigin = "https://challenges.cloudflare.com";
const youtubeOrigin = "https://www.youtube.com";
const youtubeNoCookieOrigin = "https://www.youtube-nocookie.com";

function apiOrigin() {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_ORDER_API_BASE_URL ?? "http://localhost:8000",
    ).origin;
  } catch {
    return "http://localhost:8000";
  }
}

export function buildContentSecurityPolicy(nonce: string) {
  const development = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""} ${turnstileOrigin}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin()} ${turnstileOrigin}`,
    `frame-src ${turnstileOrigin} ${youtubeOrigin} ${youtubeNoCookieOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
