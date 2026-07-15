import type { Metadata } from "next";
import { PurchaseClient } from "@/components/purchase/purchase-client";
export const metadata: Metadata = {
  title: "구매하기",
  robots: { index: false, follow: false },
};
export default function PurchasePage() {
  return <PurchaseClient />;
}
