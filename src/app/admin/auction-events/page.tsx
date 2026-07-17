import type { Metadata } from "next";
import { AuctionEventsAdminClient } from "@/components/admin/auction-events-admin-client";

export const metadata: Metadata = {
  title: "경매 이벤트 관리자",
  robots: { index: false, follow: false },
};

export default function AdminAuctionEventsPage() {
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">AUCTION ADMIN</span>
        <h1>경매 이벤트 관리</h1>
        <p>재고 가져오기 분석 결과를 검토하고 다품목 경매 이벤트를 생성합니다.</p>
      </div>
      <AuctionEventsAdminClient />
    </main>
  );
}
