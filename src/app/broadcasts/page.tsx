import type { Metadata } from "next";
import { BroadcastHistoryClient } from "@/components/broadcast/broadcast-history-client";
import { ConfigError } from "@/components/ui/config-error";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "지난 방송",
};

export default function BroadcastsPage() {
  const env = getPublicEnv();
  if (!env.valid) return <ConfigError message={env.error!} />;
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">BROADCASTS</span>
        <h1>지난 방송</h1>
        <p>종료된 라이브 방송의 다시보기와 채팅 기록을 확인할 수 있습니다.</p>
      </div>
      <BroadcastHistoryClient />
    </main>
  );
}
