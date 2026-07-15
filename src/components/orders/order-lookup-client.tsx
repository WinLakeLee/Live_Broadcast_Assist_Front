"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { PaymentStatus } from "@/components/payment/payment-status";
import { getOrderStatus } from "@/lib/api/orders";
import type { OrderStatusData } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { clearOrder } from "@/lib/secure-session";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  reference: z.string().trim().min(1, "주문번호를 입력해 주세요."),
  token: z.string().trim().min(1, "조회키를 입력해 주세요."),
});
type Form = z.infer<typeof schema>;

export function OrderLookupClient() {
  const [data, setData] = useState<OrderStatusData>();
  const [lockout, setLockout] = useState(0);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { reference: "", token: "" },
  });

  useEffect(() => {
    if (lockout <= 0) return;
    const t = window.setInterval(() => setLockout((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [lockout]);

  const { mutate: doLookup, isPending: busy } = useMutation({
    mutationFn: (values: Form) => getOrderStatus(values.reference, values.token),
    onSuccess: (resData) => {
      setData(resData);
      clearOrder();
      toast.success("주문 정보를 성공적으로 불러왔습니다.");
    },
    onError: (e) => {
      const api = e instanceof ApiError ? e : null;
      if (api?.retryAfter) setLockout(api.retryAfter);
      toast.error(
        api?.retryAfter
          ? `${api.message} ${api.retryAfter}초 후 다시 시도해 주세요.`
          : (api?.message ?? "주문 정보를 확인하지 못했습니다.")
      );
      setData(undefined);
    },
  });

  const submit = form.handleSubmit((values) => {
    if (busy || lockout > 0) return;
    doLookup(values);
  });

  return (
    <>
      <form onSubmit={submit} className="mb-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>보관한 정보를 입력하세요</CardTitle>
            <CardDescription>
              주문번호와 비밀 조회키는 서버 확인에만 사용되며 이 기기에 영구 저장하지 않습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="reference">주문번호</Label>
                <Input
                  id="reference"
                  autoComplete="off"
                  {...form.register("reference")}
                />
                {form.formState.errors.reference && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.reference.message}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Label htmlFor="token">비밀 조회키</Label>
                <Input
                  id="token"
                  type="password"
                  autoComplete="off"
                  {...form.register("token")}
                />
                {form.formState.errors.token && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.token.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={busy || lockout > 0}
              className="w-full md:w-auto"
            >
              <Search className="mr-2" size={18} />
              {busy
                ? "확인 중…"
                : lockout > 0
                  ? `${lockout}초 후 가능`
                  : "주문 상태 확인"}
            </Button>
          </CardFooter>
        </Card>
      </form>
      {data && <PaymentStatus data={data} />}
    </>
  );
}
