"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, History, LoaderCircle, Radio } from "lucide-react";

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
      <Card className="mb-8 overflow-hidden rounded-[24px] border border-border/40 bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all">
        <CardContent className="flex items-center justify-center gap-3 p-12 text-muted-foreground">
          <LoaderCircle className="animate-spin text-primary" size={24} aria-hidden="true" />
          <span className="font-medium">라이브 방송을 불러오고 있습니다...</span>
        </CardContent>
      </Card>
    );
  }

  if (broadcast.isError || !broadcast.data?.capabilities.video_embed) {
    return (
      <Card className="mb-8 overflow-hidden rounded-[24px] border border-border/40 bg-card/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-12 text-center text-muted-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/20">
            <Radio size={24} aria-hidden="true" />
          </div>
          <p className="text-balance text-lg font-medium">현재 사이트에서 재생할 라이브 방송이 없습니다.</p>
          <Link
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            href="/broadcasts"
          >
            <History size={16} aria-hidden="true" />
            지난 방송 다시보기
          </Link>
        </CardContent>
      </Card>
    );
  }

  const data = broadcast.data;
  const synchronized =
    data.chat.synchronized_with_video && data.chat.video_id === data.video_id;

  return (
    <Card className="mb-8 overflow-hidden rounded-[24px] border border-border/50 bg-card shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all">
      <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
        <CardTitle className="flex flex-wrap items-center gap-3 text-lg">
          <div className="relative flex h-3 w-3 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
          </div>
          <span className="font-extrabold tracking-tight">
            {data.broadcast?.status === "live" && data.broadcast?.title
              ? data.broadcast.title
              : "라이브 방송"}
          </span>
          {data.broadcast?.status === "live" && (
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-white shadow-sm">
              LIVE
            </span>
          )}
          <Link
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            href="/broadcasts"
          >
            <History size={15} aria-hidden="true" />
            지난 방송
          </Link>
        </CardTitle>
      </CardHeader>
      
      {/* Bento Grid Layout for Content */}
      <CardContent className="grid gap-0 p-0 md:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <div className="aspect-video w-full bg-black">
          <iframe
            className="h-full w-full border-0"
            src={data.embed_url}
            title="YouTube 라이브 방송"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {data.capabilities.combined_chat_feed ? (
          <div className="border-l border-border/40 bg-card/50">
            <UnifiedChat youtubeEnabled={data.mobile_chat.youtube_read_enabled} />
          </div>
        ) : data.capabilities.chat_embed && synchronized ? (
          <div className="hidden min-h-[360px] border-l border-border/40 bg-card/50 md:block">
            <iframe
              className="h-full min-h-[360px] w-full border-0"
              src={data.chat_embed_url}
              title="YouTube 라이브 채팅"
            />
          </div>
        ) : null}

        {!data.capabilities.combined_chat_feed && <div className="p-6 md:hidden">
          <div className="rounded-2xl border border-border/50 bg-card-muted/30 p-5 text-center">
            <p className="mb-4 text-balance text-sm font-medium text-muted-foreground">
              {data.mobile_chat.custom_api_available
                ? "Google 계정으로 연결하면 앱 안에서 라이브 채팅에 참여할 수 있습니다."
                : "YouTube 공식 라이브 채팅은 모바일 웹 임베드를 지원하지 않아 현재 YouTube 채팅 화면을 엽니다."}
            </p>
            <a
              className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 font-bold text-white shadow-md transition-all hover:bg-primary-dark hover:shadow-lg active:scale-[0.98]"
              href={data.watch_url}
              target="_blank"
              rel="noreferrer"
            >
              YouTube에서 참여
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </div>
        </div>}
      </CardContent>
    </Card>
  );
}
