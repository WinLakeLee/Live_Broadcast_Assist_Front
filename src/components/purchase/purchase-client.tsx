"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const defaults: BuyerForm = {
  buyer_name: "",
  phone: "",
  address: "",
  stock_policy: "partial",
  coupon_code: "",
  privacy_agreed: false as true,
  policy_agreed: false as true,
};

export function PurchaseClient() {
  const router = useRouter();
  const [state, dispatch] = usePurchaseMachine();
  
  const [savedDraft] = useState(loadPurchaseDraft);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      savedDraft?.items.map((item) => [item.product_name, item.quantity]) ?? [],
    ),
  );

  const form = useForm<BuyerForm>({
    resolver: zodResolver(buyerSchema),
    defaultValues: savedDraft
      ? {
          buyer_name: savedDraft.buyerName,
          phone: savedDraft.phone,
          address: savedDraft.address,
          stock_policy: savedDraft.stockPolicy,
          coupon_code: savedDraft.couponCode ?? "",
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
      couponCode: values.coupon_code,
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
    if (state.status === "ready") {
      dispatch({ type: "LOAD_PRODUCTS" });
    }
  }, [state.status, dispatch]);

  useQuery({
    queryKey: ["products", state.status === "loadingProducts" ? state.ticket : null],
    queryFn: async ({ signal }) => {
      if (state.status !== "loadingProducts") return null;
      try {
        const products = await getProducts(state.ticket, signal);
        dispatch({ type: "PRODUCTS_LOADED", products, draft: makeDraft() });
        return products;
      } catch (error) {
        if (!signal.aborted) {
          dispatch({
            type: "FATAL",
            message: error instanceof ApiError ? error.message : "상품을 불러오지 못했습니다.",
          });
        }
        throw error;
      }
    },
    enabled: state.status === "loadingProducts",
    retry: 1,
  });

  const { mutate: doQuote, isPending: isQuoting } = useMutation({
    mutationFn: async ({ draft, signal }: { draft: Draft; signal: AbortSignal }) => {
      if (!("ticket" in state)) throw new Error("No ticket");
      return getQuote({ stock_policy: draft.stockPolicy, coupon_code: draft.couponCode, items: draft.items }, state.ticket, signal);
    },
    onSuccess: (quote, { draft }) => {
      savePurchaseDraft(draft);
      saveReview({ quote, draft });
      dispatch({ type: "QUOTE_RECEIVED", quote });
      router.push("/purchase/review");
    },
    onError: (error, { draft }) => {
      const api = error instanceof ApiError ? error : null;
      dispatch({ type: "EDIT", draft });
      toast.error(api?.message ?? "견적을 확인하지 못했습니다.");
    },
  });

  const quantityChange = (name: string, value: number) => {
    setQuantities((current) => ({ ...current, [name]: value }));
    if (state.status === "quoteReady") {
      dispatch({ type: "INVALIDATE_QUOTE", draft: makeDraft() });
    }
  };

  const quote = form.handleSubmit((values) => {
    const draft = makeDraft();
    if (!draft.items.length) {
      toast.error("상품을 한 개 이상 선택해 주세요.");
      return;
    }
    if (state.status !== "editingOrder") return;
    
    dispatch({ type: "EDIT", draft });
    dispatch({ type: "REQUEST_QUOTE" });
    
    // Using a manually triggered abort signal to cancel if re-submitted rapidly is handled by react-query usually,
    // but here we just fire mutation.
    const controller = new AbortController();
    doQuote({ draft, signal: controller.signal });
  });

  if (
    state.status === "booting" ||
    state.status === "issuingTicket" ||
    state.status === "waiting" ||
    state.status === "ready" ||
    state.status === "loadingProducts" ||
    state.status === "quoteReady"
  ) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <StepIndicator current={1} />
        <Card className="flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <LoaderCircle className="animate-spin text-[#e94d2f] mb-6" size={48} aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">구매내역을 준비하고 있습니다</h1>
          <p className="text-slate-500">서버 견적을 안전하게 확인하고 있습니다.</p>
        </Card>
      </main>
    );
  }

  if (state.status === "fatalError") {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <Card className="border-red-200 bg-red-50 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700 mb-2">구매를 계속할 수 없습니다</h1>
          <p className="text-red-600 mb-6">{state.message}</p>
          <Button asChild>
            <Link href="/">처음으로</Link>
          </Button>
        </Card>
      </main>
    );
  }

  if (state.status === "recoverableError") {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <Card className="border-amber-200 bg-amber-50 p-8 shadow-sm">
          <AlertTriangle className="text-amber-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-amber-800 mb-2">요청을 완료하지 못했습니다</h1>
          <p className="text-amber-700 mb-4">{state.message}</p>
          {state.retry === "order" && (
            <p className="p-4 bg-white/60 rounded-xl text-sm text-amber-800 mb-6">
              주문 요청이 서버에 도달했을 수 있어 같은 주문을 자동으로 재전송하지 않습니다.
            </p>
          )}
          <Button variant="outline" onClick={() => dispatch({ type: "RETRY" })}>
            내용으로 돌아가기
          </Button>
        </Card>
      </main>
    );
  }

  if (
    state.status === "orderCreated" ||
    state.status === "registeringDepositor" ||
    state.status === "checkingPayment" ||
    state.status === "completed"
  ) {
    return (
      <main className="w-full max-w-4xl mx-auto px-4 py-12 pb-24 text-center">
        <p className="text-slate-500 animate-pulse">주문 완료 화면으로 이동합니다.</p>
      </main>
    );
  }

  const busy = state.status === "quoting" || isQuoting;
  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-12 pb-32">
      <StepIndicator current={2} />
      <div className="mb-8">
        <span className="inline-flex gap-2 items-center text-[#e94d2f] text-xs font-black tracking-widest uppercase mb-2">ORDER</span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">상품과 배송정보를 입력하세요</h1>
        <p className="text-slate-500">
          표시 재고는 안내이며 주문 확정 전 서버에서 다시 확인합니다.
        </p>
      </div>

      <Card className="mb-8 shadow-sm">
        <CardHeader>
          <CardTitle>1. 상품 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSelector
            products={state.products}
            quantities={quantities}
            onChange={quantityChange}
          />
        </CardContent>
      </Card>

      <form onSubmit={quote}>
        <Card className="mb-8 shadow-sm">
          <CardHeader>
            <CardTitle>2. 배송정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="buyer_name">주문자명</Label>
                <Input
                  id="buyer_name"
                  autoComplete="name"
                  aria-describedby={form.formState.errors.buyer_name ? "buyer_name-error" : undefined}
                  {...form.register("buyer_name")}
                />
                {form.formState.errors.buyer_name && (
                  <p id="buyer_name-error" className="text-sm text-red-500">
                    {form.formState.errors.buyer_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone">전화번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  aria-describedby={form.formState.errors.phone ? "phone-error" : undefined}
                  {...form.register("phone", {
                    onChange: (e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "");
                      if (val.length <= 3) e.target.value = val;
                      else if (val.length <= 7) e.target.value = val.slice(0, 3) + "-" + val.slice(3);
                      else e.target.value = val.slice(0, 3) + "-" + val.slice(3, 7) + "-" + val.slice(7, 11);
                    }
                  })}
                />
                {form.formState.errors.phone && (
                  <p id="phone-error" className="text-sm text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="address">배송주소</Label>
              <textarea
                id="address"
                autoComplete="street-address"
                className="flex w-full rounded-xl border border-[#cfd1ca] bg-white px-3 py-2 text-sm placeholder:text-[#686d65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1777d2] min-h-[100px] resize-y"
                aria-describedby={form.formState.errors.address ? "address-error" : undefined}
                {...form.register("address")}
              />
              {form.formState.errors.address && (
                <p id="address-error" className="text-sm text-red-500">
                  {form.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Label htmlFor="coupon_code">쿠폰 코드 (선택)</Label>
              <Input
                id="coupon_code"
                autoComplete="off"
                placeholder="WELCOME10"
                {...form.register("coupon_code", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase();
                  },
                })}
              />
              {form.formState.errors.coupon_code && (
                <p className="text-sm text-red-500">{form.formState.errors.coupon_code.message}</p>
              )}
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Label className="text-base font-bold">재고 부족 처리</Label>
              <div className="flex flex-col md:flex-row gap-4">
                <label className="flex flex-1 gap-3 items-center border border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="radio" value="partial" className="w-5 h-5 accent-[#e94d2f]" {...form.register("stock_policy")} />
                  <span className="font-medium">가능한 상품만 구매</span>
                </label>
                <label className="flex flex-1 gap-3 items-center border border-slate-200 rounded-xl p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                  <input type="radio" value="all_or_nothing" className="w-5 h-5 accent-[#e94d2f]" {...form.register("stock_policy")} />
                  <span className="font-medium">하나라도 부족하면 전체 취소</span>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex flex-col space-y-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-[#e94d2f]" {...form.register("privacy_agreed")} />
                  <span className="text-sm font-medium">
                    <Link href="/privacy" target="_blank" className="text-[#e94d2f] hover:underline">개인정보 수집·이용 안내</Link>에 동의합니다.
                  </span>
                </label>
                {form.formState.errors.privacy_agreed && (
                  <p className="text-sm text-red-500 ml-8">{form.formState.errors.privacy_agreed.message}</p>
                )}
              </div>

              <div className="flex flex-col space-y-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-[#e94d2f]" {...form.register("policy_agreed")} />
                  <span className="text-sm font-medium">
                    <Link href="/terms" target="_blank" className="text-[#e94d2f] hover:underline">구매·재고·계좌이체·취소 정책</Link>을 확인했습니다.
                  </span>
                </label>
                {form.formState.errors.policy_agreed && (
                  <p className="text-sm text-red-500 ml-8">{form.formState.errors.policy_agreed.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center px-2">
            <div>
              <span className="text-slate-500 text-sm hidden md:inline-block">선택 수량</span>
              <strong className="block text-xl md:text-2xl">{totalItems}개</strong>
            </div>
            <Button size="lg" className="w-48 md:w-64 text-base" disabled={busy} type="submit">
              {busy ? "서버 견적 확인 중…" : "금액 확인하기"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
