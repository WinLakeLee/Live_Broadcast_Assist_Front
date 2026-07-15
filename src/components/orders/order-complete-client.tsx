"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Download, Printer, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { StepIndicator } from "@/components/ui/step-indicator";
import { PaymentStatus } from "@/components/payment/payment-status";
import { clearOrder, loadOrder, type StoredOrder } from "@/lib/secure-session";
import { getOrderStatus, registerDepositor } from "@/lib/api/orders";
import type { DepositorResultData, OrderStatusData } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  depositor_name: z.string().trim().min(2, "입금자명을 입력해 주세요."),
  bank_name: z.string().trim().min(2, "은행명을 입력해 주세요."),
});
type Form = z.infer<typeof schema>;

export function OrderCompleteClient() {
  const router = useRouter();
  const [order] = useState<StoredOrder | null>(() => loadOrder());
  const [lockout, setLockout] = useState(0);
  const [statusResult, setStatusResult] = useState<OrderStatusData | DepositorResultData>();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { depositor_name: "", bank_name: "" },
  });

  useEffect(() => {
    if (!order) router.replace("/orders/lookup");
  }, [router, order]);

  useEffect(() => {
    if (lockout <= 0) return;
    const t = window.setInterval(() => setLockout((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [lockout]);

  const { refetch: checkStatus, isFetching: isChecking } = useQuery({
    queryKey: ["orderStatus", order?.order_reference],
    queryFn: async () => {
      if (!order) throw new Error("No order");
      return getOrderStatus(order.order_reference, order.order_token);
    },
    enabled: false,
    retry: false,
  });

  const handleCheck = async () => {
    if (isChecking || lockout > 0) return;
    try {
      const { data } = await checkStatus();
      if (data) {
        setStatusResult(data);
      }
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      if (api?.retryAfter) setLockout(api.retryAfter);
      toast.error(
        api?.retryAfter
          ? `${api.message} ${api.retryAfter}초 후 다시 확인해 주세요.`
          : (api?.message ?? "상태를 확인하지 못했습니다.")
      );
    }
  };

  const { mutate: doRegister, isPending: isRegistering } = useMutation({
    mutationFn: (values: Form) => {
      if (!order) throw new Error("No order");
      return registerDepositor(order.order_reference, order.order_token, values);
    },
    onSuccess: (data) => {
      setStatusResult(data);
      toast.success("입금정보를 등록하고 서버 확인 결과를 불러왔습니다.");
    },
    onError: (e) => {
      const api = e instanceof ApiError ? e : null;
      toast.error(api?.message ?? "입금정보를 등록하지 못했습니다.");
    },
  });

  if (!order)
    return (
      <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
        <p role="status" className="animate-pulse text-slate-500 text-center">
          주문 정보를 확인하고 있습니다.
        </p>
      </main>
    );

  const text = `주문번호: ${order.order_reference}\n비밀 조회키: ${order.order_token}\n입금 예정액: ${formatMoney(order.payment_amount)}`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label}을 복사했습니다.`);
    } catch {
      toast.error("복사 권한이 없어 직접 선택해 복사해 주세요.");
    }
  };

  const save = () => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-${order.order_reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("안전하게 파일로 저장되었습니다.");
  };

  const busy = isChecking || isRegistering;

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-12 pb-24">
      <StepIndicator current={4} />
      <div className="mb-8">
        <span className="inline-flex gap-2 items-center text-[#e94d2f] text-xs font-black tracking-widest uppercase mb-2">ORDER CREATED</span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">주문이 접수되었습니다</h1>
        <p className="text-slate-500">
          아래 정보를 먼저 안전한 곳에 보관하고 실제 입금 예정액을 확인하세요.
        </p>
      </div>

      <Card className="mb-6 shadow-sm">
        <CardHeader>
          <CardTitle>주문 보관 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <span className="text-slate-500">주문번호</span>
            <strong className="font-bold text-lg">{order.order_reference}</strong>
          </div>
          <Button
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => copy(order.order_reference, "주문번호")}
          >
            <Copy className="mr-2" size={17} /> 주문번호 복사
          </Button>
          
          <div>
            <h3 className="font-bold mb-2">비밀 조회키</h3>
            <div className="font-mono bg-slate-50 p-4 rounded-xl text-lg break-all border border-slate-100">
              {order.order_token}
            </div>
          </div>
          
          <div className="p-4 bg-amber-50 text-amber-800 rounded-xl text-sm border border-amber-100">
            조회키를 잃어버리면 온라인으로 주문내역을 확인하기 어렵습니다. 다른 사람에게 공유하지 마세요.
          </div>
          
          <div className="flex justify-between items-center py-4 border-b border-slate-100 text-xl md:text-2xl font-black">
            <span>실제 입금 예정액</span>
            <strong className="text-[#e94d2f]">{formatMoney(order.payment_amount)}</strong>
          </div>
          
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <span className="text-slate-500">확보 / 취소 상품</span>
            <strong className="font-bold">
              {order.accepted_count} / {order.cancelled_count}
            </strong>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => copy(order.order_token, "조회키")}>
            <Copy className="mr-2" size={17} /> 조회키 복사
          </Button>
          <Button variant="outline" onClick={() => copy(text, "주문 정보")}>
            <Copy className="mr-2" size={17} /> 함께 복사
          </Button>
          <Button variant="outline" onClick={save}>
            <Download className="mr-2" size={17} /> 텍스트 저장
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2" size={17} /> 인쇄
          </Button>
        </CardFooter>
      </Card>

      <form onSubmit={form.handleSubmit((v) => doRegister(v))} className="mb-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>입금정보 등록</CardTitle>
            <CardDescription>
              등록 후 서버가 입금 내역과 대조합니다. 등록만으로 결제 완료가 되지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="depositor">입금자명</Label>
                <Input
                  id="depositor"
                  autoComplete="name"
                  {...form.register("depositor_name")}
                />
                {form.formState.errors.depositor_name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.depositor_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="bank">은행명</Label>
                <Input
                  id="bank"
                  autoComplete="off"
                  {...form.register("bank_name")}
                />
                {form.formState.errors.bank_name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.bank_name.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={busy} className="w-full md:w-auto">
              입금정보 등록 및 확인
            </Button>
          </CardFooter>
        </Card>
      </form>

      <div className="flex flex-wrap gap-3 mb-8">
        <Button
          variant="outline"
          disabled={busy || lockout > 0}
          onClick={handleCheck}
          className="flex-1 md:flex-none"
        >
          {lockout > 0 ? `${lockout}초 후 확인 가능` : "현재 상태 확인"}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            clearOrder();
            router.replace("/orders/lookup");
          }}
          className="flex-1 md:flex-none"
        >
          <Trash2 className="mr-2" size={17} /> 이 기기에서 지우기
        </Button>
      </div>

      {statusResult && <PaymentStatus data={statusResult} />}
    </main>
  );
}
