import { z } from "zod";
export const buyerSchema = z.object({
  buyer_name: z.string().trim().min(2, "주문자명을 2자 이상 입력해 주세요."),
  phone: z.string().trim().min(9, "전화번호를 확인해 주세요."),
  address: z.string().trim().min(5, "배송주소를 입력해 주세요."),
  stock_policy: z.enum(["partial", "all_or_nothing"]),
  privacy_agreed: z.literal(true, { error: "개인정보 수집·이용에 동의해 주세요." }),
  policy_agreed: z.literal(true, { error: "구매·취소 정책을 확인해 주세요." }),
});
export type BuyerForm = z.infer<typeof buyerSchema>;
