"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Gavel, LoaderCircle } from "lucide-react";

import type { AuctionLot, TicketCredentials } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import {
  createLotOffer,
  getAuctionEvent,
  getOfferStatus,
  type OfferInput,
} from "@/lib/api/products";
import { formatMoney } from "@/lib/format";
import {
  auctionTimeFromServer,
  currentRemainingSeconds,
  formatRemaining,
  type AuctionTimeState,
} from "@/features/offers/domain";
import { loadWaitingTicket } from "@/lib/secure-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const lotModeLabels: Record<string, string> = {
  bundle: "묶음 경매",
  per_product: "상품별 lot",
  per_unit: "1개 단위 lot",
};

function useCountdown(state: AuctionTimeState) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 1_000);
    return () => clearInterval(timer);
  }, []);
  return currentRemainingSeconds(state);
}

// 입찰 시점에만 대기실 입장권을 읽는다. 이벤트 조회 자체는 공개 endpoint다.
function readyTicket(): TicketCredentials | null {
  const stored = loadWaitingTicket();
  if (!stored || (stored.enabled && stored.status !== "ready")) return null;
  return {
    enabled: stored.enabled,
    ticketId: stored.ticket_id,
    ticketToken: stored.ticket_token,
  };
}

function LotCard({ lot }: { lot: AuctionLot }) {
  const incremental = lot.bid_input_mode === "incremental";
  const [amount, setAmount] = useState(lot.unit_price);
  const [credentials, setCredentials] = useState<{ reference: string; token: string }>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [time, setTime] = useState<AuctionTimeState>(() => ({
    saleEndsAt: lot.sale_ends_at,
    remainingSeconds: lot.remaining_seconds,
    extensionCount: 0,
    syncedAt: Date.now(),
  }));
  const remaining = useCountdown(time);

  const submit = async (input: OfferInput) => {
    const ticket = readyTicket();
    if (!ticket) {
      setMessage("대기실 입장 후 입찰할 수 있습니다. 처음 화면에서 입장해 주세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const created = await createLotOffer(lot.lot_id, input, ticket);
      setCredentials({ reference: created.offer_reference, token: created.offer_token });
      setTime(auctionTimeFromServer(created));
      if (created.instant_win) {
        setClosed(true);
        setMessage(`즉시 낙찰되었습니다. 낙찰 금액 ${formatMoney(created.amount)}`);
      } else {
        setMessage(
          `입찰이 접수되었습니다. 번호: ${created.offer_reference}${
            created.extended ? ` · 마감이 연장되었습니다 (누적 ${created.extension_count}회)` : ""
          }`,
        );
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "입찰을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    if (!credentials) return;
    setBusy(true);
    try {
      const status = await getOfferStatus(credentials.reference, credentials.token);
      setTime(auctionTimeFromServer(status));
      if (status.result !== "pending") setClosed(true);
      setMessage(
        status.result === "pending"
          ? `입찰 결과를 기다리고 있습니다. 입찰 금액 ${formatMoney(status.amount)}`
          : status.result === "won"
            ? `낙찰되었습니다. 입찰 금액 ${formatMoney(status.amount)}`
            : `낙찰되지 않았습니다. 입찰 금액 ${formatMoney(status.amount)}`,
      );
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "입찰 상태를 확인하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="product-card">
      <p className="text-sm font-semibold text-[#e94d2f]">
        {lot.title || `Lot ${lot.lot_order || ""}`.trim()}
      </p>
      <ul className="text-sm text-slate-600">
        {lot.items.map((item) => (
          <li key={`${lot.lot_id}-${item.product_id}`}>
            {item.product_name} × {item.quantity}
          </li>
        ))}
      </ul>
      {lot.unit_price > 0 && <div className="price">시작가 {formatMoney(lot.unit_price)}</div>}
      {time.saleEndsAt && (
        <p className="text-sm text-slate-600" aria-live="polite">
          남은 시간 {formatRemaining(remaining)} (서버 기준)
          {lot.sale_status && ` · ${lot.sale_status}`}
        </p>
      )}
      {(lot.minimum_offer_price > 0 || lot.maximum_offer_price > 0) && (
        <p className="text-xs text-slate-500">
          {lot.minimum_offer_price > 0 && `최소 제안가 ${formatMoney(lot.minimum_offer_price)}`}
          {lot.minimum_offer_price > 0 && lot.maximum_offer_price > 0 && " · "}
          {lot.maximum_offer_price > 0 && `최대 제안가 ${formatMoney(lot.maximum_offer_price)}`}
        </p>
      )}
      {incremental ? (
        <p className="text-sm text-slate-600">
          입찰 금액은 서버가 현재 최적가에서 한 호가 단위로 자동 계산합니다.
        </p>
      ) : (
        <div className="field">
          <label htmlFor={`lot-amount-${lot.lot_id}`}>입찰 금액</label>
          <input
            id={`lot-amount-${lot.lot_id}`}
            type="number"
            min="0"
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
          />
        </div>
      )}
      <button
        className="button primary"
        type="button"
        disabled={busy || closed || (!incremental && amount < 0)}
        onClick={() => submit(incremental ? { quantity: 1 } : { amount, quantity: 1 })}
      >
        {busy ? "처리 중…" : incremental ? "한 호가 입찰" : "입찰 제출"}
      </button>
      {lot.buy_now_price > 0 && (
        <button
          className="button"
          type="button"
          disabled={busy || closed}
          onClick={() => submit({ buy_now: true, quantity: 1 })}
        >
          즉시 구매 {formatMoney(lot.buy_now_price)}
        </button>
      )}
      {credentials && (
        <button className="button" type="button" disabled={busy} onClick={refresh}>
          결과 새로고침
        </button>
      )}
      {message && <div className="notice" role="status">{message}</div>}
    </article>
  );
}

export function AuctionEventClient({ eventId }: { eventId: string }) {
  const event = useQuery({
    queryKey: ["auction-event", eventId],
    queryFn: ({ signal }) => getAuctionEvent(eventId, signal),
    refetchInterval: 30_000,
    retry: 1,
  });

  if (event.isPending) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-center shadow-sm" aria-busy="true">
        <LoaderCircle className="animate-spin text-[#e94d2f] mb-4" size={40} aria-hidden="true" />
        <p className="text-slate-500">경매 이벤트를 불러오고 있습니다.</p>
      </Card>
    );
  }

  if (event.isError) {
    return (
      <Card className="border-red-200 bg-red-50 p-8 shadow-sm">
        <p className="text-red-700 mb-4">
          {event.error instanceof ApiError
            ? event.error.message
            : "경매 이벤트를 불러오지 못했습니다."}
        </p>
        <Button asChild variant="outline">
          <Link href="/">처음으로</Link>
        </Button>
      </Card>
    );
  }

  const data = event.data;
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="text-[#e94d2f]" aria-hidden="true" />
          {data.name || "경매 이벤트"}
          <span className="text-sm font-normal text-slate-500">
            {lotModeLabels[data.lot_mode] ?? data.lot_mode}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.lots.length === 0 ? (
          <div className="notice">진행 중인 lot이 없습니다.</div>
        ) : (
          <div className="product-grid">
            {data.lots.map((lot) => (
              <LotCard key={lot.lot_id} lot={lot} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
