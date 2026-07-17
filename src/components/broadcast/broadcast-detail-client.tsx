"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, LoaderCircle, MessageSquare } from "lucide-react";

import {
  broadcastWatchUrl,
  getBroadcastChatHistory,
  getBroadcastDetail,
} from "@/lib/api/broadcast";
import type { BroadcastChatMessage } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

function ChatHistory({ broadcastId }: { broadcastId: string }) {
  const [messages, setMessages] = useState<BroadcastChatMessage[]>([]);
  const [cursor, setCursor] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadMore = async () => {
    setBusy(true);
    setError("");
    try {
      const feed = await getBroadcastChatHistory(broadcastId, cursor);
      setMessages((previous) => [...previous, ...feed.messages]);
      setCursor(feed.next_cursor);
      setHasMore(Boolean(feed.next_cursor) && feed.messages.length > 0);
      setLoaded(true);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "채팅 기록을 불러오지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare aria-hidden="true" size={18} />
          채팅 다시보기
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length > 0 && (
          <ul className="mb-4 grid max-h-96 gap-2 overflow-y-auto pr-1">
            {messages.map((message) => (
              <li key={message.message_id} className="text-sm">
                <span
                  className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                    message.source === "youtube"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {message.source === "youtube" ? "YouTube" : "채팅"}
                </span>
                <strong className="mr-2">{message.author_name}</strong>
                <span>{message.message}</span>
              </li>
            ))}
          </ul>
        )}
        {loaded && messages.length === 0 && (
          <p className="mb-4 text-sm text-slate-500">기록된 채팅이 없습니다.</p>
        )}
        {error && (
          <div className="notice error mb-4" role="alert">
            {error}
          </div>
        )}
        {hasMore && (
          <Button variant="outline" disabled={busy} onClick={loadMore}>
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : loaded ? (
              "이어서 불러오기"
            ) : (
              "채팅 기록 불러오기"
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function BroadcastDetailClient({ broadcastId }: { broadcastId: string }) {
  const detail = useQuery({
    queryKey: ["broadcast-detail", broadcastId],
    queryFn: ({ signal }) => getBroadcastDetail(broadcastId, signal),
    retry: 1,
  });

  if (detail.isPending) {
    return (
      <Card aria-busy="true">
        <CardContent className="flex items-center gap-3 p-6 text-slate-600">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          방송 정보를 불러오고 있습니다.
        </CardContent>
      </Card>
    );
  }

  if (detail.isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-red-700">
            {detail.error instanceof ApiError && detail.error.httpStatus === 404
              ? "존재하지 않는 방송입니다."
              : "방송 정보를 불러오지 못했습니다."}
          </p>
          <Button asChild variant="outline">
            <Link href="/broadcasts">방송 기록으로</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const broadcast = detail.data;
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{broadcast.title || "제목 없는 방송"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            {formatDateTime(broadcast.started_at)}
            {broadcast.ended_at && ` ~ ${formatDateTime(broadcast.ended_at)}`}
          </p>
          {broadcast.video_id && (
            <a
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 font-semibold"
              href={broadcastWatchUrl(broadcast.video_id)}
              target="_blank"
              rel="noreferrer"
            >
              YouTube에서 다시보기
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          )}
        </CardContent>
      </Card>
      <ChatHistory broadcastId={broadcastId} />
    </>
  );
}
