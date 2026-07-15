"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { StepIndicator } from "@/components/ui/step-indicator";
import { ProductSelector } from "@/components/products/product-selector";
import { usePurchaseMachine, type Draft } from "@/hooks/use-purchase-machine";
import {
  loadPurchaseDraft,
  loadWaitingTicket,
  savePurchaseDraft,
  saveReview,
} from "@/lib/secure-session";
import { getProducts } from "@/lib/api/products";
import { getQuote } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/errors";
import { buyerSchema, type BuyerForm } from "@/lib/validation";

const defaults: BuyerForm = {
  buyer_name: "",
  phone: "",
  address: "",
  stock_policy: "partial",
  privacy_agreed: false as true,
  policy_agreed: false as true,
};
export function PurchaseClient() {
  const router = useRouter();
  const [state, dispatch] = usePurchaseMachine();
  const loaded = useRef(false);
  const request = useRef<AbortController | undefined>(undefined);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [savedDraft] = useState(loadPurchaseDraft);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      savedDraft?.items.map((item) => [item.product_name, item.quantity]) ?? [],
    ),
  );
  const [message, setMessage] = useState("");
  const form = useForm<BuyerForm>({
    resolver: zodResolver(buyerSchema),
    defaultValues: savedDraft
      ? {
          buyer_name: savedDraft.buyerName,
          phone: savedDraft.phone,
          address: savedDraft.address,
          stock_policy: savedDraft.stockPolicy,
          privacy_agreed: true,
          policy_agreed: true,
        }
      : defaults,
  });
  const makeDraft = useCallback((): Draft => {
    const values = form.getValues();
    return {
      items: Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([product_name, quantity]) => ({ product_name, quantity })),
      buyerName: values.buyer_name,
      phone: values.phone,
      address: values.address,
      stockPolicy: values.stock_policy,
    };
  }, [form, quantities]);

  useEffect(() => {
    const ticket = loadWaitingTicket();
    if (!ticket || (ticket.enabled && ticket.status !== "ready")) {
      router.replace("/");
      return;
    }
    dispatch({
      type: "TICKET_READY",
      ticket: {
        enabled: ticket.enabled,
        ticketId: ticket.ticket_id,
        ticketToken: ticket.ticket_token,
      },
    });
  }, [router, dispatch]);
  useEffect(() => {
    if (state.status !== "ready" || loaded.current) return;
    loaded.current = true;
    dispatch({ type: "LOAD_PRODUCTS" });
    const controller = new AbortController();
    request.current = controller;
    getProducts(state.ticket, controller.signal)
      .then((products) =>
        dispatch({ type: "PRODUCTS_LOADED", products, draft: makeDraft() }),
      )
      .catch((error) => {
        if (!controller.signal.aborted)
          dispatch({
            type: "FATAL",
            message:
              error instanceof ApiError
                ? error.message
                : "상품을 불러오지 못했습니다.",
          });
      });
  }, [state, dispatch, makeDraft]);
  useEffect(() => {
    if (unmountTimer.current) clearTimeout(unmountTimer.current);
    return () => {
      unmountTimer.current = setTimeout(() => request.current?.abort(), 0);
    };
  }, []);

  const quantityChange = (name: string, value: number) => {
    setQuantities((current) => ({ ...current, [name]: value }));
    if (state.status === "quoteReady")
      dispatch({ type: "INVALIDATE_QUOTE", draft: makeDraft() });
  };
  // react-hook-form returns a stable submit callback; it does not read this component's refs during render.
  // eslint-disable-next-line react-hooks/refs
  const quote = form.handleSubmit(async () => {
    const draft = makeDraft();
    if (!draft.items.length) {
      setMessage("상품을 한 개 이상 선택해 주세요.");
      return;
    }
    if (state.status !== "editingOrder") return;
    setMessage("");
    dispatch({ type: "EDIT", draft });
    dispatch({ type: "REQUEST_QUOTE" });
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const quote = await getQuote(
        { stock_policy: draft.stockPolicy, items: draft.items },
        state.ticket,
        controller.signal,
      );
      savePurchaseDraft(draft);
      saveReview({ quote, draft });
      dispatch({ type: "QUOTE_RECEIVED", quote });
      router.push("/purchase/review");
    } catch (error) {
      if (!controller.signal.aborted) {
        const api = error instanceof ApiError ? error : null;
        dispatch({ type: "EDIT", draft });
        setMessage(api?.message ?? "견적을 확인하지 못했습니다.");
      }
    }
  });

  if (
    state.status === "booting" ||
    state.status === "issuingTicket" ||
    state.status === "waiting" ||
    state.status === "ready" ||
    state.status === "loadingProducts" ||
    state.status === "quoteReady"
  )
    return (
      <main className="shell narrow">
        <StepIndicator current={1} />
        <section className="card" role="status">
          <LoaderCircle className="spin" aria-hidden="true" />
          <h1>구매내역을 준비하고 있습니다</h1>
          <p>서버 견적을 안전하게 확인하고 있습니다.</p>
        </section>
      </main>
    );
  if (state.status === "fatalError")
    return (
      <main className="shell narrow">
        <section className="card error-card" role="alert">
          <h1>구매를 계속할 수 없습니다</h1>
          <p>{state.message}</p>
          <Link className="button" href="/">
            처음으로
          </Link>
        </section>
      </main>
    );
  if (state.status === "recoverableError")
    return (
      <main className="shell narrow">
        <section className="card error-card" role="alert">
          <AlertTriangle />
          <h1>요청을 완료하지 못했습니다</h1>
          <p>{state.message}</p>
          {state.retry === "order" && (
            <p className="notice warning">
              주문 요청이 서버에 도달했을 수 있어 같은 주문을 자동으로
              재전송하지 않습니다.
            </p>
          )}
          <button
            className="button"
            onClick={() => dispatch({ type: "RETRY" })}
          >
            내용으로 돌아가기
          </button>
        </section>
      </main>
    );
  if (
    state.status === "orderCreated" ||
    state.status === "registeringDepositor" ||
    state.status === "checkingPayment" ||
    state.status === "completed"
  )
    return (
      <main className="shell">
        <p>주문 완료 화면으로 이동합니다.</p>
      </main>
    );
  const busy = state.status === "quoting";
  return (
    <main className="shell">
      <StepIndicator current={2} />
      <div className="page-head">
        <span className="eyebrow">ORDER</span>
        <h1>상품과 배송정보를 입력하세요</h1>
        <p>표시 재고는 안내이며 주문 확정 전 서버에서 다시 확인합니다.</p>
      </div>
      {message && (
        <div className="notice error" role="alert">
          {message}
        </div>
      )}
      <section className="card">
        <h2>1. 상품 선택</h2>
        <ProductSelector
          products={state.products}
          quantities={quantities}
          onChange={quantityChange}
        />
      </section>
      <form onSubmit={quote}>
        <section className="card">
          <h2>2. 배송정보</h2>
          <div className="field">
            <label htmlFor="buyer_name">주문자명</label>
            <input
              id="buyer_name"
              autoComplete="name"
              aria-describedby={
                form.formState.errors.buyer_name
                  ? "buyer_name-error"
                  : undefined
              }
              {...form.register("buyer_name")}
            />
            {form.formState.errors.buyer_name && (
              <p id="buyer_name-error" className="error-text">
                {form.formState.errors.buyer_name.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="phone">전화번호</label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              aria-describedby={
                form.formState.errors.phone ? "phone-error" : undefined
              }
              {...form.register("phone")}
            />
            {form.formState.errors.phone && (
              <p id="phone-error" className="error-text">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>
          <div className="field">
            <label htmlFor="address">배송주소</label>
            <textarea
              id="address"
              autoComplete="street-address"
              aria-describedby={
                form.formState.errors.address ? "address-error" : undefined
              }
              {...form.register("address")}
            />
            {form.formState.errors.address && (
              <p id="address-error" className="error-text">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>
          <fieldset className="field">
            <legend>재고 부족 처리</legend>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  value="partial"
                  {...form.register("stock_policy")}
                />{" "}
                가능한 상품만 구매
              </label>
              <label>
                <input
                  type="radio"
                  value="all_or_nothing"
                  {...form.register("stock_policy")}
                />{" "}
                하나라도 부족하면 전체 취소
              </label>
            </div>
          </fieldset>
          <div className="field check">
            <label>
              <input type="checkbox" {...form.register("privacy_agreed")} />
              <span>
                <Link href="/privacy" target="_blank">
                  개인정보 수집·이용 안내
                </Link>
                에 동의합니다.
              </span>
            </label>
            {form.formState.errors.privacy_agreed && (
              <p className="error-text">
                {form.formState.errors.privacy_agreed.message}
              </p>
            )}
          </div>
          <div className="field check">
            <label>
              <input type="checkbox" {...form.register("policy_agreed")} />
              <span>
                <Link href="/terms" target="_blank">
                  구매·재고·계좌이체·취소 정책
                </Link>
                을 확인했습니다.
              </span>
            </label>
            {form.formState.errors.policy_agreed && (
              <p className="error-text">
                {form.formState.errors.policy_agreed.message}
              </p>
            )}
          </div>
        </section>
        <div className="sticky-action">
          <div>
            <span className="muted">선택 수량</span>
            <br />
            <strong>
              {Object.values(quantities).reduce((a, b) => a + b, 0)}개
            </strong>
          </div>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? "서버 견적 확인 중…" : "금액 확인하기"}
          </button>
        </div>
      </form>
    </main>
  );
}
