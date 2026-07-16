import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
import { ConfigError } from "@/components/ui/config-error";
import { getPublicEnv } from "@/lib/env";
import { Providers } from "@/components/providers";
import { AppShell } from "@/features/preferences/components/app-shell";

export const metadata: Metadata = {
  title: { default: "라이브 구매", template: "%s | 라이브 구매" },
  description: "라이브커머스 안전 주문 서비스",
  openGraph: {
    title: "라이브 방송 득템찬스! 안전 구매",
    description: "한정수량 라이브 커머스 상품을 지금 바로 확인해보세요.",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "라이브 구매",
    description: "한정수량 라이브 커머스 상품을 지금 바로 확인해보세요.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const env = getPublicEnv();
  
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell brandName={env.brandName}>
            {env.valid ? children : <ConfigError message={env.error!} />}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
