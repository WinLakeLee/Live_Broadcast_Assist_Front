import type { Metadata } from "next";
import { BroadcastsAdminClient } from "@/components/admin/broadcasts-admin-client";

export const metadata: Metadata = {
  title: "방송 관리자",
  robots: { index: false, follow: false },
};

export default function AdminBroadcastsPage() {
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">BROADCAST ADMIN</span>
        <h1>방송 관리</h1>
        <p>라이브 방송 시작·종료와 방송 기록을 관리합니다.</p>
      </div>
      <BroadcastsAdminClient />
    </main>
  );
}
