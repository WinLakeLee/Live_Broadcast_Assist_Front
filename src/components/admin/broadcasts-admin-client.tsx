"use client";

import { useCallback, useState } from "react";
import { KeyRound, Play, Square } from "lucide-react";

import type { AdminBroadcastRecord } from "@/lib/api/contracts";
import { endBroadcast, getAdminBroadcasts, startBroadcast } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";

const statusLabels: Record<string, string> = {
  live: "라이브",
  ended: "종료",
  offline: "오프라인",
};

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ko-KR");
}

export function BroadcastsAdminClient() {
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState(false);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastRecord[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ video_id: "", channel_id: "", title: "" });

  const load = useCallback(
    async (adminKey: string) => {
      const data = await getAdminBroadcasts(adminKey);
      setBroadcasts(data);
    },
    [],
  );

  const verify = async () => {
    if (!key || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await load(key);
      setVerified(true);
    } catch {
      setVerified(false);
      setMessage("관리자 인증 또는 방송 목록 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (busy) return;
    if (!form.video_id && !form.channel_id) {
      setMessage("video_id 또는 channel_id 중 하나는 필수입니다.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const started = await startBroadcast(key, {
        platform: "youtube",
        video_id: form.video_id.trim(),
        channel_id: form.channel_id.trim(),
        title: form.title.trim(),
      });
      const endedCount = started.ended_broadcast_ids.length;
      setMessage(
        endedCount > 0
          ? `방송을 시작했습니다. 진행 중이던 방송 ${endedCount}건이 자동 종료되었습니다.`
          : "방송을 시작했습니다.",
      );
      setForm({ video_id: "", channel_id: "", title: "" });
      await load(key);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "방송을 시작하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const end = async (broadcastId: string) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await endBroadcast(key, broadcastId);
      setMessage("방송을 종료했습니다.");
      await load(key);
    } catch (error) {
      setMessage(
        error instanceof ApiError && error.httpStatus === 404
          ? "진행 중인 방송이 아닙니다."
          : error instanceof ApiError
            ? error.message
            : "방송을 종료하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (!verified)
    return (
      <section className="card">
        <KeyRound aria-hidden="true" />
        <h2>관리자 API 키</h2>
        <p>키는 현재 화면의 메모리에만 보관되며 저장하지 않습니다.</p>
        <div className="field">
          <label htmlFor="admin-broadcast-key">API 키</label>
          <input
            id="admin-broadcast-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
          />
        </div>
        {message && (
          <div className="notice error" role="alert">
            {message}
          </div>
        )}
        <button className="button primary" disabled={!key || busy} onClick={verify}>
          {busy ? "확인 중…" : "키 확인 및 방송 조회"}
        </button>
      </section>
    );

  return (
    <>
      <section className="card">
        <h2>새 방송 시작</h2>
        <p className="muted">
          서버를 재시작하지 않고 방송을 전환합니다. video_id 또는 channel_id 중 하나는
          필수이며, channel_id만 입력하면 해당 채널의 현재 라이브를 자동 탐색합니다.
          진행 중이던 방송은 자동 종료됩니다.
        </p>
        <div className="lookup-grid">
          <div className="field">
            <label htmlFor="broadcast-video-id">YouTube video_id</label>
            <input
              id="broadcast-video-id"
              value={form.video_id}
              onChange={(event) => setForm({ ...form, video_id: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="broadcast-channel-id">channel_id (선택)</label>
            <input
              id="broadcast-channel-id"
              value={form.channel_id}
              onChange={(event) => setForm({ ...form, channel_id: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="broadcast-title">방송 제목</label>
            <input
              id="broadcast-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
        </div>
        {message && (
          <div
            className={message.includes("했습니다") ? "notice success" : "notice error"}
            role="status"
          >
            {message}
          </div>
        )}
        <button className="button primary" disabled={busy} onClick={start}>
          <Play size={17} /> 방송 시작
        </button>
      </section>
      <section className="card">
        <h2>방송 기록</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>상태</th>
                <th>video_id</th>
                <th>시작</th>
                <th>종료</th>
                <th>동작</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((broadcast) => (
                <tr key={broadcast.broadcast_id}>
                  <td>{broadcast.title || "-"}</td>
                  <td>{statusLabels[broadcast.status] ?? broadcast.status}</td>
                  <td>{broadcast.video_id}</td>
                  <td>{formatDateTime(broadcast.started_at)}</td>
                  <td>{formatDateTime(broadcast.ended_at)}</td>
                  <td>
                    {broadcast.status === "live" && (
                      <button
                        className="button danger"
                        disabled={busy}
                        onClick={() => end(broadcast.broadcast_id)}
                      >
                        <Square size={15} /> 종료
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
