import type { Metadata } from "next";
import { AuctionEventClient } from "@/features/auction-events/components/auction-event-client";
import { ConfigError } from "@/components/ui/config-error";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "경매 이벤트",
};

export default async function AuctionEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const env = getPublicEnv();
  if (!env.valid) return <ConfigError message={env.error!} />;
  const { eventId } = await params;
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">AUCTION EVENT</span>
        <h1>경매 이벤트</h1>
        <p>각 lot은 독립된 경매 단위이며 입찰 순위와 종료 시각이 서로 섞이지 않습니다.</p>
      </div>
      <AuctionEventClient eventId={eventId} />
    </main>
  );
}
