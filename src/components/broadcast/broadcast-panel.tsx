"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, Radio } from "lucide-react";

import { getBroadcast } from "@/lib/api/broadcast";
import { UnifiedChat } from "./unified-chat";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BroadcastPanel() {
  const broadcast = useQuery({
    queryKey: ["broadcast"],
    queryFn: ({ signal }) => getBroadcast(signal),
    refetchInterval: 60_000,
    retry: 1,
  });

  if (broadcast.isPending) {
    return (
      <Card className="mb-6" aria-busy="true">
        <CardContent className="flex items-center gap-3 p-6 text-slate-600">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          라이브 방송을 불러오고 있습니다.
        </CardContent>
      </Card>
    );
  }

  if (broadcast.isError || !broadcast.data?.capabilities.video_embed) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 p-6 text-slate-600">
          <Radio aria-hidden="true" />
          현재 사이트에서 재생할 라이브 방송이 없습니다.
        </CardContent>
      </Card>
    );
  }

  const data = broadcast.data;
  const synchronized =
    data.chat.synchronized_with_video && data.chat.video_id === data.video_id;

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="text-red-600" aria-hidden="true" />
          라이브 방송
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 p-0 md:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
        <div className="aspect-video bg-black">
          <iframe
            className="h-full w-full border-0"
            src={data.embed_url}
            title="YouTube 라이브 방송"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {data.capabilities.combined_chat_feed ? (
          <UnifiedChat youtubeEnabled={data.mobile_chat.youtube_read_enabled} />
        ) : data.capabilities.chat_embed && synchronized ? (
          <div className="hidden min-h-[360px] md:block">
            <iframe
              className="h-full min-h-[360px] w-full border-0"
              src={data.chat_embed_url}
              title="YouTube 라이브 채팅"
            />
          </div>
        ) : null}

        {!data.capabilities.combined_chat_feed && <div className="p-4 md:hidden">
          <p className="mb-3 text-sm text-slate-600">
            {data.mobile_chat.custom_api_available
              ? "Google 계정으로 연결하면 앱 안에서 라이브 채팅에 참여할 수 있습니다."
              : "YouTube 공식 라이브 채팅은 모바일 웹 임베드를 지원하지 않아 현재 YouTube 채팅 화면을 엽니다."}
          </p>
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 font-semibold"
            href={data.watch_url}
            target="_blank"
            rel="noreferrer"
          >
            YouTube에서 채팅 참여
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        </div>}
      </CardContent>
    </Card>
  );
}
