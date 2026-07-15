import type { Metadata } from "next";
import { OrderLookupClient } from "@/components/orders/order-lookup-client";
export const metadata: Metadata = {
  title: "주문 조회",
  robots: { index: false, follow: false },
};
export default function LookupPage() {
  return (
    <main className="shell narrow">
      <div className="page-head">
        <span className="eyebrow">PRIVATE LOOKUP</span>
        <h1>구매내역 조회</h1>
        <p>잘못된 주문번호와 조회키는 보안을 위해 동일하게 안내됩니다.</p>
      </div>
      <OrderLookupClient />
    </main>
  );
}
