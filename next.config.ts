import type { NextConfig } from "next";

const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_ORDER_API_BASE_URL ?? "http://localhost:8000").origin; }
  catch { return "http://localhost:8000"; }
})();
const devScript = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
const csp = [
  "default-src 'self'",
  `script-src 'self'${devScript} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin} https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    }];
  },
};
export default nextConfig;
