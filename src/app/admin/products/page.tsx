import type { Metadata } from "next";
import { ProductsAdminClient } from "@/components/admin/products-admin-client";
export const metadata: Metadata = {
  title: "상품 관리자",
  robots: { index: false, follow: false },
};
export default function AdminProductsPage() {
  return (
    <main className="shell">
      <div className="page-head">
        <span className="eyebrow">PRODUCT ADMIN</span>
        <h1>상품 관리</h1>
        <p>백엔드가 제공하는 상품 조회·저장 기능만 사용할 수 있습니다.</p>
      </div>
      <ProductsAdminClient />
    </main>
  );
}
