import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = { title: { default: "라이브 구매", template: "%s | 라이브 구매" }, description: "라이브커머스 안전 주문 서비스" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const env = getPublicEnv();
  return <html lang="ko"><body><header className="site-header"><Link className="brand" href="/"><b>●</b> {env.brandName}</Link><Link className="header-link" href="/orders/lookup">주문 조회</Link></header>{children}<footer className="footer"><Link href="/privacy">개인정보 안내</Link><Link href="/terms">구매·취소 정책</Link><p>가격·재고·입금 상태는 주문 서버의 확인 결과를 따릅니다.</p></footer></body></html>;
}
