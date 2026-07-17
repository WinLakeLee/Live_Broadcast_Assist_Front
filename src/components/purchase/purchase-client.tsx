"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { StepIndicator } from "@/components/ui/step-indicator";
import { usePurchaseMachine } from "@/hooks/use-purchase-machine";
import {
  buyerFormFromDraft,
  createCheckoutDraft,
  quantitiesFromDraft,
  sanitizeCheckoutQuantities,
  type CheckoutDraft,
} from "@/features/checkout/domain";
import { CheckoutFlow } from "@/features/checkout/components/checkout-flow";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KOREA_REGIONS, PROVINCES } from "@/lib/korea-regions";

export function PurchaseClient() {
  const router = useRouter();
  const [state, dispatch] = usePurchaseMachine();
  
  const [savedDraft] = useState(loadPurchaseDraft);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    quantitiesFromDraft(savedDraft),
  );

  const form = useForm<BuyerForm>({
    resolver: zodResolver(buyerSchema),
    defaultValues: buyerFormFromDraft(savedDraft),
  });

  const makeDraft = (nextQuantities = quantities) =>
    createCheckoutDraft(form.getValues(), nextQuantities);

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
        const nextQuantities = sanitizeCheckoutQuantities(products, quantities);
        setQuantities(nextQuantities);
        dispatch({
          type: "PRODUCTS_LOADED",
          products,
          draft: makeDraft(nextQuantities),
        });
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
    mutationFn: async (draft: CheckoutDraft) => {
      if (!("ticket" in state)) throw new Error("No ticket");
      return getQuote({ stock_policy: draft.stockPolicy, coupon_code: draft.couponCode, items: draft.items }, state.ticket);
    },
    onSuccess: (quote, draft) => {
      savePurchaseDraft(draft);
      saveReview({ quote, draft });
      dispatch({ type: "QUOTE_RECEIVED", quote });
      router.push("/purchase/review");
    },
    onError: (error, draft) => {
      const api = error instanceof ApiError ? error : null;
      dispatch({ type: "EDIT", draft });
      toast.error(api?.message ?? "견적을 확인하지 못했습니다.");
    },
  });

  const quantityChange = (name: string, value: number) => {
    const nextQuantities = { ...quantities, [name]: value };
    setQuantities(nextQuantities);
    if (state.status === "quoteReady") {
      dispatch({ type: "INVALIDATE_QUOTE", draft: makeDraft(nextQuantities) });
    }
  };

  const selectedProvince = form.watch("address_province");
  const cities = selectedProvince ? KOREA_REGIONS[selectedProvince] || [] : [];

  const quote = form.handleSubmit(() => {
    const draft = makeDraft();
    if (!draft.items.length) {
      toast.error("상품을 한 개 이상 선택해 주세요.");
      return;
    }
    if (state.status !== "editingOrder") return;
    
    dispatch({ type: "EDIT", draft });
    dispatch({ type: "REQUEST_QUOTE" });
    
    doQuote(draft);
  });

  if (
    state.status === "booting" ||
    state.status === "ready" ||
    state.status === "loadingProducts" ||
    state.status === "quoteReady"
  ) {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <StepIndicator current={1} />
        <Card className="flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <LoaderCircle className="animate-spin text-primary mb-6" size={48} aria-hidden="true" />
          <h1 className="text-2xl font-bold mb-2">구매내역을 준비하고 있습니다</h1>
          <p className="text-muted-foreground">서버 견적을 안전하게 확인하고 있습니다.</p>
        </Card>
      </main>
    );
  }

  if (state.status === "fatalError") {
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <Card className="border-destructive/20 bg-destructive/5 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-destructive mb-2">구매를 계속할 수 없습니다</h1>
          <p className="text-destructive mb-6">{state.message}</p>
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

  const busy = state.status === "quoting" || isQuoting;
  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  return (
    <main className="w-full max-w-4xl mx-auto px-4 py-12 pb-32">
      <StepIndicator current={2} />
      <div className="mb-8">
        <span className="inline-flex gap-2 items-center text-primary text-xs font-black tracking-widest uppercase mb-2">ORDER</span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">상품과 배송정보를 입력하세요</h1>
        <p className="text-muted-foreground">
          표시 재고는 안내이며 주문 확정 전 서버에서 다시 확인합니다.
        </p>
      </div>

      <Card className="mb-8 shadow-sm border border-border/50 bg-card rounded-[24px] overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
          <CardTitle className="text-foreground">1. 상품 선택</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <CheckoutFlow
            products={state.products}
            quantities={quantities}
            onQuantityChange={quantityChange}
            ticket={state.ticket}
          />
        </CardContent>
      </Card>

      <form onSubmit={quote}>
        <Card className="mb-8 shadow-sm border border-border/50 bg-card rounded-[24px] overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-card-muted/20 px-6 py-4">
            <CardTitle className="text-foreground">2. 배송정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="buyer_name" className="text-sm font-semibold text-foreground">주문자명</Label>
                <Input
                  id="buyer_name"
                  autoComplete="name"
                  className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary"
                  aria-describedby={form.formState.errors.buyer_name ? "buyer_name-error" : undefined}
                  {...form.register("buyer_name")}
                />
                {form.formState.errors.buyer_name && (
                  <p id="buyer_name-error" className="text-sm font-medium text-destructive">
                    {form.formState.errors.buyer_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-semibold text-foreground">전화번호</Label>
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary"
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
                  <p id="phone-error" className="text-sm font-medium text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <Label className="text-sm font-semibold text-foreground">배송주소</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <select
                    className="flex w-full rounded-xl border border-border bg-card-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 appearance-none"
                    {...form.register("address_province", {
                      onChange: () => form.setValue("address_city", "", { shouldValidate: true })
                    })}
                  >
                    <option value="">도/광역시/특별시 선택</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {form.formState.errors.address_province && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.address_province.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <select
                    className="flex w-full rounded-xl border border-border bg-card-muted/30 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary h-10 appearance-none disabled:opacity-50"
                    disabled={!selectedProvince}
                    {...form.register("address_city")}
                  >
                    <option value="">시/군/구 선택</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {form.formState.errors.address_city && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.address_city.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="도로명/지번 주소 (예: 세종대로 110)"
                  className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary"
                  {...form.register("address_street")}
                />
                {form.formState.errors.address_street && (
                  <p className="text-sm font-medium text-destructive">
                    {form.formState.errors.address_street.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    placeholder="상세주소 (예: 101동 202호)"
                    className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary"
                    {...form.register("address_detail")}
                  />
                  {form.formState.errors.address_detail && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.address_detail.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="건물명 (선택, 예: 서울시청)"
                    className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary"
                    {...form.register("address_building")}
                  />
                  {form.formState.errors.address_building && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.address_building.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border/40">
              <Label htmlFor="coupon_code" className="text-sm font-semibold text-foreground">쿠폰 코드 (선택)</Label>
              <Input
                id="coupon_code"
                autoComplete="off"
                placeholder="WELCOME10"
                className="rounded-xl border-border bg-card-muted/30 focus-visible:ring-primary font-mono uppercase text-foreground"
                {...form.register("coupon_code", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase();
                  },
                })}
              />
              {form.formState.errors.coupon_code && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.coupon_code.message}</p>
              )}
            </div>

            <div className="space-y-4 pt-6 border-t border-border/40">
              <Label className="text-base font-bold text-foreground">재고 부족 처리</Label>
              <div className="flex flex-col md:flex-row gap-4">
                <label className="group flex flex-1 gap-4 items-start border border-border bg-card-muted/20 rounded-2xl p-5 cursor-pointer hover:border-primary/50 transition-all focus-within:ring-2 focus-within:ring-primary">
                  <input type="radio" value="partial" className="mt-1 w-5 h-5 accent-primary cursor-pointer" {...form.register("stock_policy")} />
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">부분 배송 허용</span>
                    <span className="text-sm text-muted-foreground mt-1">재고가 있는 상품만 먼저 주문합니다.</span>
                  </div>
                </label>
                <label className="group flex flex-1 gap-4 items-start border border-border bg-card-muted/20 rounded-2xl p-5 cursor-pointer hover:border-primary/50 transition-all focus-within:ring-2 focus-within:ring-primary">
                  <input type="radio" value="all_or_nothing" className="mt-1 w-5 h-5 accent-primary cursor-pointer" {...form.register("stock_policy")} />
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">전체 구매 취소</span>
                    <span className="text-sm text-muted-foreground mt-1">하나라도 재고가 부족하면 주문을 취소합니다.</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-border/40">
              <div className="flex flex-col space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-primary rounded cursor-pointer" {...form.register("privacy_agreed")} />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    <Link href="/privacy" target="_blank" className="text-primary hover:underline font-semibold">개인정보 수집·이용 안내</Link>에 동의합니다.
                  </span>
                </label>
                {form.formState.errors.privacy_agreed && (
                  <p className="text-sm font-medium text-destructive ml-8">{form.formState.errors.privacy_agreed.message}</p>
                )}
              </div>

              <div className="flex flex-col space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-5 h-5 accent-primary rounded cursor-pointer" {...form.register("policy_agreed")} />
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    <Link href="/terms" target="_blank" className="text-primary hover:underline font-semibold">구매·재고·계좌이체·취소 정책</Link>을 확인했습니다.
                  </span>
                </label>
                {form.formState.errors.policy_agreed && (
                  <p className="text-sm font-medium text-destructive ml-8">{form.formState.errors.policy_agreed.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-40 transition-colors">
          <div className="max-w-4xl mx-auto flex justify-between items-center px-2 md:px-4">
            <div>
              <span className="text-muted-foreground text-sm font-medium hidden md:block">선택 수량</span>
              <strong className="block text-2xl md:text-3xl font-black text-foreground">{totalItems}개</strong>
            </div>
            <Button size="lg" className="w-48 md:w-64 text-base font-bold rounded-xl shadow-lg transition-transform active:scale-[0.98]" disabled={busy} type="submit">
              {busy ? "서버 견적 확인 중…" : "금액 확인하기"}
            </Button>
          </div>
        </div>
      </form>

    </main>
  );
}
