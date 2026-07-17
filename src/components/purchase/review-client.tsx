"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock3, LoaderCircle, ShieldCheck, Truck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { createOrder } from "@/lib/api/orders";
import type { WaitingTicket } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requestPushToken } from "@/lib/push";
import {
  clearPurchaseDraft,
  clearReview,
  clearWaitingTicket,
  loadReview,
  loadWaitingTicket,
  saveOrder,
  type StoredReview,
} from "@/lib/secure-session";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const reviewSteps = ["구매목록", "구매내역 확인", "입금", "배송"];

export function ReviewClient({ nonce }: { nonce?: string }) {
  const router = useRouter();
  const [review, setReview] = useState<StoredReview | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [invalidated, setInvalidated] = useState(false);
  const [invalidationMessage, setInvalidationMessage] = useState("");
  const turnstile = useRef<TurnstileHandle>(null);
  const submitting = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadReview();
      if (!stored) router.replace("/purchase");
      else setReview(stored);
      setNow(Date.now());
    }, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      clearTimeout(timer);
      clearInterval(clock);
    };
  }, [router]);

  const modify = useCallback(() => {
    clearReview();
    router.push("/purchase");
  }, [router]);

  const enablePush = async () => {
    const token = await requestPushToken();
    if (token) {
      setPushToken(token);
      toast.success("상태 변경 알림을 받을 준비가 되었습니다.");
    } else {
      toast.error("알림 권한이 거부되었거나 푸시 게이트웨이가 연결되지 않았습니다.");
    }
  };

  const { mutate: doConfirm, isPending: busy } = useMutation({
    mutationFn: async ({ ticket }: { ticket: WaitingTicket }) => {
      if (!review) throw new Error("No review");
      return createOrder(
        {
          buyer_name: review.draft.buyerName,
          phone: review.draft.phone,
          address: review.draft.address,
          push_token: pushToken,
          stock_policy: review.draft.stockPolicy,
          coupon_code: review.draft.couponCode,
          quoted_subtotal: review.quote.subtotal,
          quoted_amount: review.quote.payment_amount,
          quote_token: review.quote.quote_token,
          captcha_token: captcha,
          items: review.draft.items,
        },
        {
          enabled: ticket.enabled,
          ticketId: ticket.ticket_id,
          ticketToken: ticket.ticket_token,
        }
      );
    },
    onSuccess: (order) => {
      setCaptcha("");
      clearReview();
      clearPurchaseDraft();
      clearWaitingTicket();
      saveOrder(order);
      router.push("/purchase/complete");
    },
    onError: (error) => {
      setCaptcha("");
      turnstile.current?.reset();
      const api = error instanceof ApiError ? error : null;
      if (api?.httpStatus === 409 || api?.httpStatus === 422) {
        clearReview();
        setInvalidated(true);
        const msg = api.httpStatus === 422
          ? "견적 정보가 유효하지 않습니다. 상품 화면에서 새 견적을 받아 주세요."
          : "가격·재고 또는 견적 유효시간이 변경되었습니다. 새 견적을 확인한 뒤 다시 확정해 주세요.";
        setInvalidationMessage(msg);
        toast.error(msg);
      } else if (!api) {
        clearReview();
        setInvalidated(true);
        const msg =
          "주문 결과를 확인하지 못해 같은 주문을 자동으로 다시 제출하지 않습니다. 주문 조회 또는 고객지원으로 접수 여부를 확인해 주세요.";
        setInvalidationMessage(msg);
        toast.error(msg);
      } else {
        submitting.current = false;
        toast.error(api?.message ?? "주문 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      }
    },
  });

  if (!review || now === null) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <Card className="flex flex-col items-center justify-center p-12 text-center shadow-sm border border-border/50 bg-card rounded-[24px]">
          <LoaderCircle className="animate-spin text-primary mb-6" size={48} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">구매내역을 불러오고 있습니다</h1>
        </Card>
      </main>
    );
  }

  const expiresAt = Date.parse(review.quote.expires_at);
  const expired = !Number.isFinite(expiresAt) || now >= expiresAt;

  const confirm = () => {
    if (expired || invalidated || !captcha || busy || submitting.current) return;
    const ticket = loadWaitingTicket();
    if (!ticket || (ticket.enabled && ticket.status !== "ready")) {
      setInvalidationMessage("입장 시간이 만료되었습니다. 대기실부터 다시 입장해 주세요.");
      setInvalidated(true);
      clearReview();
      clearWaitingTicket();
      toast.error("입장 시간이 만료되었습니다.");
      return;
    }
    submitting.current = true;
    doConfirm({ ticket });
  };

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-32">
      <ol className="flex items-center w-full justify-between mb-8 overflow-hidden" aria-label="구매 진행 단계">
        {reviewSteps.map((step, index) => (
          <li
            key={step}
            className={`flex-1 text-center text-xs sm:text-sm font-bold border-t-4 pt-2 transition-colors ${
              index <= 1 ? "border-primary text-foreground" : "border-border text-muted-foreground"
            }`}
            aria-current={index === 1 ? "step" : undefined}
          >
            {step}
          </li>
        ))}
      </ol>

      <div className="mb-8">
        <span className="inline-flex gap-2 items-center text-primary text-xs font-black tracking-widest uppercase mb-2">ORDER REVIEW</span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">구매내역을 확인해 주세요</h1>
        <p className="text-muted-foreground">
          표시된 견적은 재고 예약이 아니며 주문 확정 시 서버가 다시 검증합니다.
        </p>
      </div>

      {invalidated && (
        <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive" role="alert">
          {invalidationMessage}
        </div>
      )}

      {expired && !invalidated && (
        <div className="p-4 mb-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center gap-3" role="alert">
          <Clock3 size={18} className="shrink-0" />
          <p>견적 유효시간이 지났습니다. 기존 견적으로 주문할 수 없습니다.</p>
        </div>
      )}

      <Card className="mb-6 shadow-sm border border-border/50 bg-card rounded-[24px]">
        <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
          <CardTitle className="text-foreground">상품과 금액</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 p-6">
          {review.quote.lines.map((line) => (
            <div
              className={`flex justify-between items-center py-4 border-b border-border/40 ${
                !line.accepted ? "opacity-50 line-through" : ""
              }`}
              key={line.product_id}
            >
              <div className="flex flex-col">
                <strong className="text-lg text-foreground">{line.product_name}</strong>
                <span className="text-sm text-muted-foreground mt-1">
                  {line.quantity}개 × {formatMoney(line.unit_price)}
                  {!line.accepted &&
                    ` · 재고 부족으로 제외 예정 (구매 가능 ${line.available_quantity}개)`}
                </span>
              </div>
              <strong className="text-lg whitespace-nowrap ml-4 text-foreground">
                {line.accepted ? formatMoney(line.line_amount) : "제외"}
              </strong>
            </div>
          ))}
          <div className="flex justify-between items-center py-4 border-b border-border/40">
            <span className="text-muted-foreground">재고 부족 처리</span>
            <strong className="font-bold text-foreground">
              {review.draft.stockPolicy === "partial"
                ? "가능한 상품만 구매"
                : "하나라도 부족하면 전체 취소"}
            </strong>
          </div>
          <div className="flex justify-between items-center py-5 border-b border-border/40 text-xl font-black">
            <span className="text-foreground">상품 금액</span>
            <strong className="text-foreground">{formatMoney(review.quote.subtotal)}</strong>
          </div>
          {review.quote.discount_amount > 0 && (
            <div className="flex justify-between items-center py-4 border-b border-border/40 text-green-600 dark:text-green-400">
              <span>쿠폰·행사 할인</span>
              <strong>-{formatMoney(review.quote.discount_amount)}</strong>
            </div>
          )}
          <div className="flex justify-between items-center py-5 border-b border-border/40 text-xl font-black">
            <span className="text-foreground">최종 입금 예정액</span>
            <strong className="text-primary text-2xl">{formatMoney(review.quote.payment_amount)}</strong>
          </div>
          <div className="pt-4 text-sm text-muted-foreground">
            견적 유효시간:{" "}
            <span className="font-mono">
              {Number.isFinite(expiresAt)
                ? formatDateTime(review.quote.expires_at)
                : "확인 불가"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 shadow-sm border border-border/50 bg-card rounded-[24px]">
        <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
          <CardTitle className="text-foreground">수취인과 배송</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <span className="text-muted-foreground">수취인명</span>
            <strong className="font-bold text-foreground">{review.draft.buyerName}</strong>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-border/40">
            <span className="text-muted-foreground">전화번호</span>
            <strong className="font-bold text-foreground">{review.draft.phone}</strong>
          </div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center pb-4 border-b border-border/40 gap-2">
            <span className="text-muted-foreground whitespace-nowrap">전체 주소</span>
            <strong className="font-bold md:text-right text-foreground">{review.draft.address}</strong>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">배송사</span>
            <strong className="font-bold flex items-center gap-2 text-foreground">
              <Truck size={17} /> CU(롯데택배)
            </strong>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8 shadow-sm border border-border/50 bg-card rounded-[24px]">
        <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
          <CardTitle className="text-foreground">알림과 사람 확인</CardTitle>
          <CardDescription>
            푸시는 상태 변경 신호이며, 실제 상태는 주문 조회 API로 다시 확인합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <Button
            type="button"
            variant="outline"
            onClick={enablePush}
            disabled={busy || !!pushToken}
            className="w-full md:w-auto font-bold border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            <Bell size={17} className="mr-2" />
            {pushToken ? "알림 준비 완료" : "상태 변경 알림 받기"}
          </Button>
          
          <div className="pt-6 border-t border-border/40">
            <h3 className="font-bold mb-4 text-foreground">사람인지 확인</h3>
            <div className="mb-4">
              <TurnstileWidget ref={turnstile} nonce={nonce} onToken={setCaptcha} />
            </div>
            <div className="flex items-center gap-3 p-4 bg-card-muted/50 border border-border/50 rounded-xl text-muted-foreground text-sm">
              <ShieldCheck size={18} className="text-primary shrink-0" />
              <p>서버가 가격·재고·견적 토큰을 최종 검증합니다.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 transition-colors">
        <div className="max-w-3xl mx-auto flex justify-between items-center gap-4 px-2 md:px-4">
          <Button variant="outline" size="lg" disabled={busy} onClick={modify} className="w-1/3 font-bold border-border/50 bg-card-muted/30">
            수정
          </Button>
          
          {expired || invalidated ? (
            <Button size="lg" className="w-2/3 text-base font-bold shadow-lg transition-transform active:scale-[0.98]" onClick={modify}>
              새 견적 받기
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-2/3 text-base font-bold shadow-lg transition-transform active:scale-[0.98]"
              disabled={busy || !captcha}
              onClick={confirm}
            >
              {busy ? "주문 확인 중…" : "구매내역 확정"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
