import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  issueTicket: vi.fn(),
  checkTicket: vi.fn(),
}));
const { push, issueTicket, checkTicket } = mocks;

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock("@/lib/api/waiting-room", () => ({ issueTicket: mocks.issueTicket, checkTicket: mocks.checkTicket }));
vi.mock("@/hooks/use-page-visibility", () => ({ usePageVisibility: () => true }));

import { useWaitingRoom } from "@/hooks/use-waiting-room";

const waiting = {
  enabled: true,
  status: "waiting" as const,
  ticket_id: "ticket-id",
  ticket_token: "ticket-token",
  position: 3,
  retry_after_seconds: 1,
};

beforeEach(() => {
  push.mockReset();
  issueTicket.mockReset();
  checkTicket.mockReset();
  sessionStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("P1 대기실 hook 회귀", () => {
  it("비활성 또는 ready 대기표는 구매 화면으로 즉시 이동한다", async () => {
    issueTicket.mockResolvedValue({ ...waiting, enabled: false, status: "ready", position: 0 });
    const { result } = renderHook(() => useWaitingRoom());
    await act(async () => { await result.current.enter(); });
    expect(push).toHaveBeenCalledWith("/purchase");
    expect(sessionStorage.getItem("live-purchase:waiting")).toContain("ticket-token");
  });

  it("waiting을 폴링해 ready가 되면 저장값과 화면을 갱신한다", async () => {
    vi.useFakeTimers();
    issueTicket.mockResolvedValue(waiting);
    checkTicket.mockResolvedValue({ enabled: true, status: "ready", position: 0, retry_after_seconds: 300 });
    const { result } = renderHook(() => useWaitingRoom());
    await act(async () => { await result.current.enter(); });
    expect(result.current.view).toMatchObject({ kind: "waiting", position: 3 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(checkTicket).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/purchase");
  });

  it("expired와 발급 오류를 복구 가능한 상태로 노출한다", async () => {
    vi.useFakeTimers();
    issueTicket.mockResolvedValue(waiting);
    checkTicket.mockResolvedValue({ enabled: true, status: "expired", position: 0, retry_after_seconds: 0 });
    const { result } = renderHook(() => useWaitingRoom());
    await act(async () => { await result.current.enter(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(result.current.view).toEqual({ kind: "expired" });
    act(() => result.current.reissue());
    expect(result.current.view).toEqual({ kind: "idle" });

    issueTicket.mockRejectedValue(new ApiError(503, "DOWN", "대기실 점검", 4));
    await act(async () => { await result.current.enter(); });
    expect(result.current.view).toEqual({ kind: "error", message: "대기실 점검", retry: 4 });
  });
});
