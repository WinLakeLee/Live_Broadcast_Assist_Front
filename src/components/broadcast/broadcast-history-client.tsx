"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { History, LoaderCircle, Radio } from "lucide-react";

import { getBroadcastHistory } from "@/lib/api/broadcast";
import { Card, CardContent } from "@/components/ui/card";

const statusLabels: Record<string, string> = {
  live: "라이브",
  ended: "종료",
  offline: "오프라인",
};

function formatDateTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export function BroadcastHistoryClient() {
  const history = useQuery({
    queryKey: ["broadcast-history"],
    queryFn: ({ signal }) => getBroadcastHistory(50, signal),
    retry: 1,
  });

  if (history.isPending) {
    return (
      <Card aria-busy="true">
        <CardContent className="flex items-center gap-3 p-6 text-slate-600">
          <LoaderCircle className="animate-spin" aria-hidden="true" />
          방송 기록을 불러오고 있습니다.
        </CardContent>
      </Card>
    );
  }

  if (history.isError) {
    return (
      <Card>
        <CardContent className="p-6 text-red-700">
          방송 기록을 불러오지 못했습니다.
        </CardContent>
      </Card>
    );
  }

  if (!history.data.length) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-slate-600">
          <History aria-hidden="true" />
          아직 기록된 방송이 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4">
      {history.data.map((broadcast) => (
        <li key={broadcast.broadcast_id}>
          <Link
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-[#1777d2]"
            href={`/broadcasts/${encodeURIComponent(broadcast.broadcast_id)}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Radio
                className={broadcast.status === "live" ? "text-red-600" : "text-slate-400"}
                size={18}
                aria-hidden="true"
              />
              <strong>{broadcast.title || "제목 없는 방송"}</strong>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  broadcast.status === "live"
                    ? "bg-red-600 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {statusLabels[broadcast.status] ?? broadcast.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {formatDateTime(broadcast.started_at)}
              {broadcast.ended_at && ` ~ ${formatDateTime(broadcast.ended_at)}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
