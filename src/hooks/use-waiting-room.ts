"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkTicket, issueTicket } from "@/lib/api/waiting-room";
import type { WaitingTicket } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import {
  clearWaitingTicket,
  loadWaitingTicket,
  saveWaitingTicket,
} from "@/lib/secure-session";
import { usePageVisibility } from "./use-page-visibility";

type View =
  | { kind: "idle" }
  | { kind: "issuing" }
  | { kind: "waiting"; position: number; retry: number }
  | { kind: "expired" }
  | { kind: "error"; message: string; retry?: number };
export function useWaitingRoom() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const ticketRef = useRef<WaitingTicket | null>(null);
  const started = useRef(false);
  const failures = useRef(0);
  const router = useRouter();
  const visible = usePageVisibility();

  const enter = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    setView({ kind: "issuing" });
    const controller = new AbortController();
    try {
      const existing = loadWaitingTicket();
      const ticket = existing ?? (await issueTicket(controller.signal));
      ticketRef.current = ticket;
      saveWaitingTicket(ticket);
      if (!ticket.enabled || ticket.status === "ready") {
        router.push("/purchase");
        return;
      }
      setView({
        kind: "waiting",
        position: ticket.position,
        retry: ticket.retry_after_seconds,
      });
    } catch (error) {
      started.current = false;
      const api = error instanceof ApiError ? error : null;
      setView({
        kind: "error",
        message: api?.message ?? "대기실에 연결하지 못했습니다.",
        retry: api?.retryAfter,
      });
    }
    return () => controller.abort();
  }, [router]);

  useEffect(() => {
    if (view.kind !== "waiting" || !ticketRef.current) return;
    const ticket = ticketRef.current;
    const controller = new AbortController();
    const interval =
      Math.max(1, view.retry) *
      (visible ? 1 : 2) *
      Math.min(8, 2 ** failures.current) *
      1000;
    const timer = window.setTimeout(async () => {
      try {
        const status = await checkTicket(ticket, controller.signal);
        failures.current = 0;
        if (status.status === "ready") {
          saveWaitingTicket({ ...ticket, status: "ready", position: 0 });
          router.push("/purchase");
        } else if (status.status === "expired") {
          clearWaitingTicket();
          started.current = false;
          setView({ kind: "expired" });
        } else
          setView({
            kind: "waiting",
            position: status.position,
            retry: status.retry_after_seconds,
          });
      } catch {
        if (!controller.signal.aborted) {
          failures.current += 1;
          setView({
            kind: "waiting",
            position: view.position,
            retry: view.retry,
          });
        }
      }
    }, interval);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [view, visible, router]);
  return {
    view,
    enter,
    reissue: () => {
      clearWaitingTicket();
      started.current = false;
      setView({ kind: "idle" });
    },
  };
}
