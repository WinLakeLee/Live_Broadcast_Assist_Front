import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfigError } from "@/components/ui/config-error";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StepIndicator } from "@/components/ui/step-indicator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckoutFlow } from "@/features/checkout/components/checkout-flow";
import { PreferencesControls } from "@/features/preferences/components/preferences-controls";
import { translate } from "@/features/preferences/i18n";
import { PreferencesProvider } from "@/features/preferences/preferences-provider";
import { TurnstileWidget } from "@/components/purchase/turnstile-widget";
import { Providers } from "@/components/providers";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { initialPurchaseState, purchaseReducer, usePurchaseMachine } from "@/hooks/use-purchase-machine";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";
import { getPublicEnv } from "@/lib/env";
import { describeDifference, formatDateTime, formatMoney } from "@/lib/format";
import { requestPushToken } from "@/lib/push";
import { cn } from "@/lib/utils";
import { makeProduct } from "../fixtures/contracts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.lang = "ko";
});

describe("P2 공용 유틸리티·환경 회귀", () => {
  it("typed 사전에서 한국어와 영어를 같은 key로 제공한다", () => {
    expect(translate("ko", "nav.orderLookup")).toBe("주문 조회");
    expect(translate("en", "products.available", { count: 3 })).toBe("3 available");
  });

  it("locale과 theme 선택을 저장하고 문서 속성에 반영한다", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    render(<PreferencesProvider><PreferencesControls /></PreferencesProvider>);
    await userEvent.selectOptions(screen.getByLabelText("언어"), "en");
    await userEvent.selectOptions(screen.getByLabelText("Theme"), "dark");
    await waitFor(() => {
      expect(document.documentElement.lang).toBe("en");
      expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    });
    expect(localStorage.getItem("live-purchase:locale")).toBe("en");
    expect(localStorage.getItem("live-purchase:theme")).toBe("dark");
  });

  it("금액·시각·차액과 Tailwind class를 일관되게 만든다", () => {
    expect(formatMoney(1234)).toBe("1,234원");
    expect(formatDateTime(new Date("2026-01-01T00:00:00Z"))).toContain("2026");
    expect(describeDifference(0)).toBe("금액 일치");
    expect(describeDifference(-100)).toContain("초과");
    expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
  });

  it("개발 기본값·잘못된 URL·운영 필수값을 구분한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_ORDER_API_BASE_URL", "");
    expect(getPublicEnv()).toMatchObject({ apiBaseUrl: "http://localhost:8000", valid: true });
    vi.stubEnv("NEXT_PUBLIC_ORDER_API_BASE_URL", "not a url");
    expect(getPublicEnv().valid).toBe(false);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ORDER_API_BASE_URL", "https://api.example.com/");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    expect(getPublicEnv().error).toContain("설정되지 않았습니다");
  });

  it("CSP는 개발과 운영 directive를 분리한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(buildContentSecurityPolicy("nonce")).toContain("'unsafe-eval'");
    vi.stubEnv("NODE_ENV", "production");
    const production = buildContentSecurityPolicy("nonce");
    expect(production).toContain("upgrade-insecure-requests");
    expect(production).toContain("frame-ancestors 'none'");
  });

  it("푸시 미지원·거부·응답 timeout을 null로 처리한다", async () => {
    vi.stubGlobal("Notification", undefined);
    await expect(requestPushToken()).resolves.toBeNull();
    vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("denied") });
    await expect(requestPushToken()).resolves.toBeNull();
    vi.stubGlobal("Notification", { requestPermission: vi.fn().mockResolvedValue("granted") });
    await expect(requestPushToken(1)).resolves.toBeNull();
  });
});

describe("P2 공개 훅 회귀", () => {
  it("페이지 visibility 변경을 구독하고 해제한다", () => {
    let state: DocumentVisibilityState = "visible";
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
    const { result, unmount } = renderHook(() => usePageVisibility());
    expect(result.current).toBe(true);
    act(() => {
      state = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false);
    unmount();
  });

  it("구매 hook과 reducer가 오류·재시도·치명 오류 전이를 처리한다", () => {
    const { result } = renderHook(() => usePurchaseMachine());
    act(() => result.current[1]({ type: "FATAL", message: "중단" }));
    expect(result.current[0]).toEqual({ status: "fatalError", message: "중단" });
    const failed = purchaseReducer(initialPurchaseState, { type: "ERROR", message: "재시도", retry: "quote" });
    expect(purchaseReducer(failed, { type: "RETRY" })).toBe(initialPurchaseState);
  });
});

describe("P2 공용 UI 회귀", () => {
  it("단계·설정 오류·기본 UI primitive를 합성할 수 있다", () => {
    render(
      <>
        <StepIndicator current={2} />
        <ConfigError message="환경변수 오류" />
        <Button>버튼</Button>
        <Label htmlFor="field">필드</Label><Input id="field" />
        <Card><CardHeader><CardTitle>제목</CardTitle><CardDescription>설명</CardDescription></CardHeader><CardContent>내용</CardContent><CardFooter>하단</CardFooter></Card>
      </>,
    );
    expect(screen.getByText("정보").closest("li")).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("alert")).toHaveTextContent("환경변수 오류");
    expect(screen.getByLabelText("필드")).toBeInTheDocument();
    expect(buttonVariants({ variant: "destructive" })).toContain("text-destructive");
  });

  it("확인 dialog는 확인·Escape·backdrop 취소를 제공한다", async () => {
    const onConfirm = vi.fn(), onCancel = vi.fn();
    const { container } = render(<ConfirmDialog title="저장" onConfirm={onConfirm} onCancel={onCancel}>변경</ConfirmDialog>);
    await userEvent.click(screen.getByRole("button", { name: "변경 내용 저장" }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
    await userEvent.click(container.querySelector(".dialog-backdrop")!);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("상품 선택기는 고정가 조작과 경매 차단을 분리한다", async () => {
    const onChange = vi.fn();
    const auction = makeProduct({ product_id: "prd-auction", product_name: "경매", purchase_method: "auction", purchase_flow: "offer" });
    const fixed = makeProduct({ product_id: "prd-fixed", product_name: "고정가", available_quantity: 2 });
    render(<CheckoutFlow products={[auction, fixed]} quantities={{ "prd-fixed": 1 }} onQuantityChange={onChange} />);
    expect(screen.getByText(/경매 제안 기능은 현재 사용할 수 없습니다/)).toBeVisible();
    expect(screen.queryByLabelText("경매 수량 늘리기")).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("고정가 수량 줄이기"));
    expect(onChange).toHaveBeenCalledWith("prd-fixed", 0);
  });

  it("개발 Turnstile fallback과 Provider 합성이 동작한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const onToken = vi.fn();
    render(<Providers><TurnstileWidget onToken={onToken} /></Providers>);
    await userEvent.click(screen.getByRole("button", { name: "로컬 검증 토큰 사용" }));
    expect(onToken).toHaveBeenCalledWith("local-turnstile-test-token");
  });
});
