"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";

import {
  createChatSession,
  getChatMessages,
  postChatMessage,
  reportChatMessage,
} from "@/lib/api/chat";
import type { ChatFeed, ChatSession } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SESSION_KEY = "live-purchase:first-party-chat";

function loadSession(): ChatSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as ChatSession;
    if (Date.parse(value.expires_at) <= Date.now()) {
      window.sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

export function UnifiedChat({ youtubeEnabled }: { youtubeEnabled: boolean }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<ChatSession | null>(() =>
    typeof window === "undefined" ? null : loadSession(),
  );
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const feed = useQuery({
    queryKey: ["combined-chat"],
    queryFn: async ({ signal }) => {
      const previous = queryClient.getQueryData<ChatFeed>(["combined-chat"]);
      const page = await getChatMessages(previous?.next_cursor ?? "", signal);
      if (!previous) return page;
      const messages = new Map(
        [...previous.messages, ...page.messages].map((item) => [item.message_id, item]),
      );
      return { ...page, messages: [...messages.values()].slice(-100) };
    },
    refetchInterval: 2_000,
    retry: 1,
  });

  useEffect(() => {
    if (!feed.data?.messages.length) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [feed.data?.messages.length]);

  const join = useMutation({
    mutationFn: () => createChatSession(nickname),
    onSuccess: (created) => {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(created));
      setSession(created);
      setNickname("");
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : "채팅에 참여하지 못했습니다."),
  });

  const send = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("No chat session");
      return postChatMessage(session.session_id, session.session_token, message);
    },
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["combined-chat"] });
    },
    onError: (error) => {
      const api = error instanceof ApiError ? error : null;
      if (api?.httpStatus === 404) {
        window.sessionStorage.removeItem(SESSION_KEY);
        setSession(null);
      }
      toast.error(api?.httpStatus === 429 ? "메시지를 너무 빠르게 보내고 있습니다." : api?.message ?? "메시지를 보내지 못했습니다.");
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 300 || send.isPending) return;
    setMessage(trimmed);
    send.mutate();
  };

  return (
    <section className="flex min-h-[360px] flex-col bg-white" aria-label="자체 및 YouTube 통합 채팅">
      <header className="border-b px-4 py-3">
        <h3 className="font-bold">라이브 채팅</h3>
        <p className="text-xs text-slate-500">
          {youtubeEnabled ? "자체 채팅은 작성 가능 · YouTube 채팅은 읽기 전용" : "자체 채팅 · YouTube 공식 API 연결 대기 중"}
        </p>
      </header>

      <div ref={listRef} className="h-[320px] flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {feed.isPending && <LoaderCircle className="mx-auto animate-spin text-slate-400" aria-label="채팅 불러오는 중" />}
        {feed.data?.messages.map((item) => (
          <article key={item.message_id} className="group text-sm">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.source === "youtube" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                {item.source === "youtube" ? "YouTube" : "자체"}
              </span>
              <strong className="truncate">{item.author_name}</strong>
              <time className="ml-auto text-[10px] text-slate-400" dateTime={item.created_at}>
                {new Date(item.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </time>
            </div>
            <div className="mt-1 flex items-start gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-slate-700">{item.message}</p>
              {item.can_report && (
                <button
                  type="button"
                  className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                  aria-label="메시지 신고"
                  onClick={() => reportChatMessage(item.message_id).then(() => toast.success("신고가 접수되었습니다.")).catch(() => toast.error("신고를 접수하지 못했습니다."))}
                >
                  <Flag size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </article>
        ))}
        {!feed.isPending && !feed.data?.messages.length && (
          <p className="py-10 text-center text-sm text-slate-500">첫 메시지를 남겨 보세요.</p>
        )}
      </div>

      {!session ? (
        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (nickname.trim().length >= 2) join.mutate();
          }}
        >
          <Input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={30} placeholder="채팅 닉네임" aria-label="채팅 닉네임" />
          <Button type="submit" disabled={nickname.trim().length < 2 || join.isPending}>참여</Button>
        </form>
      ) : (
        <form className="flex gap-2 border-t p-3" onSubmit={submit}>
          <Input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={300} placeholder={`${session.nickname}(으)로 메시지 입력`} aria-label="채팅 메시지" />
          <Button type="submit" size="icon" disabled={!message.trim() || send.isPending} aria-label="메시지 보내기">
            <Send size={18} aria-hidden="true" />
          </Button>
        </form>
      )}
    </section>
  );
}
