import type { Metadata } from "next";
import { BroadcastDetailClient } from "@/components/broadcast/broadcast-detail-client";
import { ConfigError } from "@/components/ui/config-error";
import { getPublicEnv } from "@/lib/env";

export const metadata: Metadata = {
  title: "방송 다시보기",
};

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ broadcastId: string }>;
}) {
  const env = getPublicEnv();
  if (!env.valid) return <ConfigError message={env.error!} />;
  const { broadcastId } = await params;
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">BROADCAST</span>
        <h1>방송 다시보기</h1>
      </div>
      <BroadcastDetailClient broadcastId={broadcastId} />
    </main>
  );
}
