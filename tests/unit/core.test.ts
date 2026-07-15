import { afterEach,describe,expect,it,vi } from "vitest";
import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import { parseRetryAfter } from "@/lib/api/errors";
import { describeDifference,formatMoney } from "@/lib/format";
import { initialPurchaseState,purchaseReducer,type Draft } from "@/hooks/use-purchase-machine";
import { clearOrder,clearPurchaseDraft,clearReview,clearWaitingTicket,loadOrder,loadReview,saveOrder,savePurchaseDraft,saveReview,saveWaitingTicket } from "@/lib/secure-session";
import { requestPushToken } from "@/lib/push";
import { buildContentSecurityPolicy } from "@/lib/content-security-policy";
import { getPublicEnv } from "@/lib/env";

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()});
describe("운영 보안 설정",()=>{
  it("script CSP는 nonce를 요구하고 unsafe-inline을 허용하지 않는다",()=>{const script=buildContentSecurityPolicy("test-nonce").split("; ").find(value=>value.startsWith("script-src"));expect(script).toContain("'nonce-test-nonce'");expect(script).toContain("'strict-dynamic'");expect(script).not.toContain("'unsafe-inline'")});
  it("운영 API의 HTTP 주소를 거부한다",()=>{vi.stubEnv("NODE_ENV","production");vi.stubEnv("NEXT_PUBLIC_ORDER_API_BASE_URL","http://orders.example.test");vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY","site-key");expect(getPublicEnv()).toMatchObject({valid:false,error:"운영 환경의 주문 API 주소는 HTTPS여야 합니다."})});
});
describe("API 계약",()=>{
  it("성공 envelope를 검증한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"success",data:{value:3}}),{headers:{"Content-Type":"application/json"}})));await expect(apiRequest("/test",z.object({value:z.number()}))).resolves.toEqual({value:3})});
  it("오류와 Retry-After를 보존한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"error",code:"RATE",message:"잠시 후"}),{status:429,headers:{"Content-Type":"application/json","Retry-After":"7"}})));await expect(apiRequest("/test",z.object({}))).rejects.toMatchObject({httpStatus:429,retryAfter:7})});
  it("JSON 아닌 응답을 거부한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html/>",{status:500,headers:{"Content-Type":"text/html"}})));await expect(apiRequest("/test",z.object({}))).rejects.toMatchObject({code:"NON_JSON_RESPONSE"})});
  it("Retry-After 날짜를 파싱한다",()=>expect(parseRetryAfter("Thu, 01 Jan 1970 00:00:05 GMT",0)).toBe(5));
});
describe("표시",()=>{it("금액과 차액을 표시한다",()=>{expect(formatMoney(12000)).toBe("12,000원");expect(describeDifference(2)).toContain("부족");expect(describeDifference(-2)).toContain("초과")})});
const ticket={enabled:true,ticketId:"i",ticketToken:"t"};const draft:Draft={items:[{product_name:"상품",quantity:1}],buyerName:"구매자",phone:"000",address:"주소 주소",stockPolicy:"partial"};const product={product_name:"상품",unit_price:1,stock_limit:1,reserved_quantity:0,available_quantity:1,active:true,display_order:1};
describe("구매 reducer",()=>{it("허용된 전이와 견적 무효화를 처리한다",()=>{let s=purchaseReducer(initialPurchaseState,{type:"TICKET_READY",ticket});s=purchaseReducer(s,{type:"LOAD_PRODUCTS"});s=purchaseReducer(s,{type:"PRODUCTS_LOADED",products:[product],draft});s=purchaseReducer(s,{type:"REQUEST_QUOTE"});s=purchaseReducer(s,{type:"QUOTE_RECEIVED",quote:{payment_amount:1,quote_token:"quote-token",expires_at:"2099-01-01T00:00:00Z",lines:[]}});expect(s.status).toBe("quoteReady");s=purchaseReducer(s,{type:"INVALIDATE_QUOTE",draft});expect(s.status).toBe("editingOrder")});it("잘못된 submit을 무시한다",()=>expect(purchaseReducer(initialPurchaseState,{type:"SUBMIT_ORDER"})).toBe(initialPurchaseState))});
describe("민감 세션",()=>{it("주문·대기·견적 토큰과 배송정보를 삭제한다",()=>{saveOrder({order_reference:"R",order_token:"T",payment_amount:1,accepted_count:1,cancelled_count:0});expect(loadOrder()?.order_token).toBe("T");clearOrder();saveWaitingTicket({enabled:true,status:"ready",ticket_id:"I",ticket_token:"S",position:0,retry_after_seconds:1});clearWaitingTicket();saveReview({quote:{payment_amount:1,quote_token:"Q",expires_at:"2099-01-01T00:00:00Z",lines:[]},draft});expect(loadReview()?.quote.quote_token).toBe("Q");savePurchaseDraft(draft);clearReview();clearPurchaseDraft();expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0)})});
describe("푸시 게이트웨이",()=>{it("사용자 권한 뒤 게이트웨이 토큰을 메모리로 받는다",async()=>{vi.stubGlobal("Notification",{requestPermission:vi.fn().mockResolvedValue("granted")});window.addEventListener("live-purchase:request-push-token",()=>window.dispatchEvent(new CustomEvent("live-purchase:push-token",{detail:{token:"device-token"}})),{once:true});await expect(requestPushToken(100)).resolves.toBe("device-token")})});
