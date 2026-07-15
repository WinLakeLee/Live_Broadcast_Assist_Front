import type { Metadata } from "next";
import { OrderCompleteClient } from "@/components/orders/order-complete-client";
export const metadata:Metadata={title:"주문 완료",robots:{index:false,follow:false}};
export default function CompletePage(){return <OrderCompleteClient/>}
