"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock3, LoaderCircle, ShieldCheck, Truck } from "lucide-react";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { createOrder } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/errors";
import { formatDateTime, formatMoney } from "@/lib/format";
import { requestPushToken } from "@/lib/push";
import { clearPurchaseDraft, clearReview, clearWaitingTicket, loadReview, loadWaitingTicket, saveOrder, type StoredReview } from "@/lib/secure-session";

const reviewSteps = ["구매목록", "구매내역 확인", "입금", "배송"];

export function ReviewClient({ nonce }:{ nonce?:string }) {
  const router = useRouter();
  const [review, setReview] = useState<StoredReview | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [captcha, setCaptcha] = useState("");
  const [pushToken, setPushToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invalidated, setInvalidated] = useState(false);
  const submitting = useRef(false);
  const request = useRef<AbortController | undefined>(undefined);
  const turnstile = useRef<TurnstileHandle>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = loadReview();
      if (!stored) router.replace("/purchase");
      else setReview(stored);
      setNow(Date.now());
    }, 0);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => { clearTimeout(timer); clearInterval(clock); request.current?.abort(); };
  }, [router]);

  const modify = useCallback(() => { clearReview(); router.push("/purchase"); }, [router]);
  const enablePush = async () => {
    setMessage("");
    const token = await requestPushToken();
    if (token) { setPushToken(token); setMessage("상태 변경 알림을 받을 준비가 되었습니다."); }
    else setMessage("알림 권한이 거부되었거나 푸시 게이트웨이가 연결되지 않았습니다. 주문 상태는 조회 화면에서 확인할 수 있습니다.");
  };

  if (!review || now === null) return <main className="shell narrow"><section className="card" role="status"><LoaderCircle className="spin"/><h1>구매내역을 불러오고 있습니다</h1></section></main>;
  const expiresAt = Date.parse(review.quote.expires_at);
  const expired = !Number.isFinite(expiresAt) || now >= expiresAt;

  const confirm = async () => {
    if (expired || invalidated || !captcha || submitting.current) return;
    const ticket = loadWaitingTicket();
    if (!ticket || (ticket.enabled && ticket.status !== "ready")) { setMessage("입장 시간이 만료되었습니다. 대기실부터 다시 입장해 주세요."); setInvalidated(true); clearReview(); clearWaitingTicket(); return; }
    submitting.current = true; setBusy(true); setMessage("");
    const controller = new AbortController(); request.current = controller;
    try {
      const order = await createOrder({
        buyer_name: review.draft.buyerName, phone: review.draft.phone, address: review.draft.address,
        push_token: pushToken, stock_policy: review.draft.stockPolicy,
        quoted_amount: review.quote.payment_amount, quote_token: review.quote.quote_token,
        captcha_token: captcha, items: review.draft.items,
      }, { enabled: ticket.enabled, ticketId: ticket.ticket_id, ticketToken: ticket.ticket_token }, controller.signal);
      setCaptcha(""); clearReview(); clearPurchaseDraft(); clearWaitingTicket(); saveOrder(order); router.push("/purchase/complete");
    } catch (error) {
      setCaptcha(""); turnstile.current?.reset();
      const api = error instanceof ApiError ? error : null;
      if (api?.httpStatus === 409 || api?.httpStatus === 422) {
        clearReview(); setInvalidated(true);
        setMessage(api.httpStatus === 422 ? "견적 정보가 유효하지 않습니다. 상품 화면에서 새 견적을 받아 주세요." : "가격·재고 또는 견적 유효시간이 변경되었습니다. 새 견적을 확인한 뒤 다시 확정해 주세요.");
      } else {
        setMessage(api?.message ?? "주문 결과를 확인하지 못했습니다. 자동으로 다시 제출하지 말고 고객지원에 확인해 주세요.");
      }
    } finally { submitting.current = false; setBusy(false); }
  };

  return <main className="shell narrow">
    <ol className="steps review-steps" aria-label="구매 진행 단계">{reviewSteps.map((step,index)=><li key={step} className={index<=1?"active":""} aria-current={index===1?"step":undefined}>{step}</li>)}</ol>
    <div className="page-head"><span className="eyebrow">ORDER REVIEW</span><h1>구매내역을 확인해 주세요</h1><p>표시된 견적은 재고 예약이 아니며 주문 확정 시 서버가 다시 검증합니다.</p></div>
    {message&&<div className={invalidated?"notice error":"notice"} role={invalidated?"alert":"status"}>{message}</div>}
    {expired&&<div className="notice error" role="alert"><Clock3 size={18}/> 견적 유효시간이 지났습니다. 기존 견적으로 주문할 수 없습니다.</div>}
    <section className="card"><h2>상품과 금액</h2>{review.quote.lines.map(line=><div className={`quote-line ${!line.accepted?"cancelled":""}`} key={line.product_name}><span><strong>{line.product_name}</strong><br/><small>{line.quantity}개 × {formatMoney(line.unit_price)}{!line.accepted&&` · 재고 부족으로 제외 예정 (구매 가능 ${line.available_quantity}개)`}</small></span><strong>{line.accepted?formatMoney(line.line_amount):"제외"}</strong></div>)}<div className="summary-row"><span>재고 부족 처리</span><strong>{review.draft.stockPolicy==="partial"?"가능한 상품만 구매":"하나라도 부족하면 전체 취소"}</strong></div><div className="summary-row quote-total"><span>최종 입금 예정액</span><strong>{formatMoney(review.quote.payment_amount)}</strong></div><p className="muted">견적 유효시간: {Number.isFinite(expiresAt)?formatDateTime(review.quote.expires_at):"확인 불가"}</p></section>
    <section className="card"><h2>수취인과 배송</h2><div className="summary-row"><span>수취인명</span><strong>{review.draft.buyerName}</strong></div><div className="summary-row"><span>전화번호</span><strong>{review.draft.phone}</strong></div><div className="summary-row"><span>전체 주소</span><strong>{review.draft.address}</strong></div><div className="summary-row"><span>배송사</span><strong><Truck size={17}/> CU(롯데택배)</strong></div></section>
    <section className="card"><h2>알림과 사람 확인</h2><p>푸시는 상태 변경 신호이며, 실제 상태는 주문 조회 API로 다시 확인합니다.</p><button type="button" className="button" onClick={enablePush} disabled={busy}><Bell size={17}/>{pushToken?"알림 준비 완료":"상태 변경 알림 받기"}</button><h3>사람인지 확인</h3><TurnstileWidget ref={turnstile} nonce={nonce} onToken={setCaptcha}/><div className="notice"><ShieldCheck size={18}/> 서버가 가격·재고·견적 토큰을 최종 검증합니다.</div></section>
    <div className="sticky-action"><button className="button" disabled={busy} onClick={modify}>수정</button>{expired||invalidated?<button className="button primary" onClick={modify}>새 견적 받기</button>:<button className="button primary" disabled={busy||!captcha} onClick={confirm}>{busy?"주문 확인 중…":"구매내역 확정"}</button>}</div>
  </main>;
}
