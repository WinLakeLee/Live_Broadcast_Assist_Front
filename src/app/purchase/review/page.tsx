import type { Metadata } from "next";
import { headers } from "next/headers";
import { ReviewClient } from "@/components/purchase/review-client";
export const metadata: Metadata = {
  title: "구매내역 확인",
  robots: { index: false, follow: false },
};
export default async function ReviewPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <ReviewClient nonce={nonce} />;
}
