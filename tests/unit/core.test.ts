import { afterEach,describe,expect,it,vi } from "vitest";
import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import { parseRetryAfter } from "@/lib/api/errors";
import { describeDifference,formatMoney } from "@/lib/format";
import { initialPurchaseState,purchaseReducer,type Draft } from "@/hooks/use-purchase-machine";
import { clearOrder,clearWaitingTicket,loadOrder,saveOrder,saveWaitingTicket } from "@/lib/secure-session";

afterEach(()=>vi.unstubAllGlobals());
describe("API 계약",()=>{
  it("성공 envelope를 검증한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"success",data:{value:3}}),{headers:{"Content-Type":"application/json"}})));await expect(apiRequest("/test",z.object({value:z.number()}))).resolves.toEqual({value:3})});
  it("오류와 Retry-After를 보존한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(JSON.stringify({status:"error",code:"RATE",message:"잠시 후"}),{status:429,headers:{"Content-Type":"application/json","Retry-After":"7"}})));await expect(apiRequest("/test",z.object({}))).rejects.toMatchObject({httpStatus:429,retryAfter:7})});
  it("JSON 아닌 응답을 거부한다",async()=>{vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html/>",{status:500,headers:{"Content-Type":"text/html"}})));await expect(apiRequest("/test",z.object({}))).rejects.toMatchObject({code:"NON_JSON_RESPONSE"})});
  it("Retry-After 날짜를 파싱한다",()=>expect(parseRetryAfter("Thu, 01 Jan 1970 00:00:05 GMT",0)).toBe(5));
});
describe("표시",()=>{it("금액과 차액을 표시한다",()=>{expect(formatMoney(12000)).toBe("12,000원");expect(describeDifference(2)).toContain("부족");expect(describeDifference(-2)).toContain("초과")})});
const ticket={enabled:true,ticketId:"i",ticketToken:"t"};const draft:Draft={items:[{product_name:"상품",quantity:1}],buyerName:"구매자",phone:"000",address:"주소 주소",stockPolicy:"partial"};const product={product_name:"상품",unit_price:1,stock_limit:1,reserved_quantity:0,available_quantity:1,active:true,display_order:1};
describe("구매 reducer",()=>{it("허용된 전이와 견적 무효화를 처리한다",()=>{let s=purchaseReducer(initialPurchaseState,{type:"TICKET_READY",ticket});s=purchaseReducer(s,{type:"LOAD_PRODUCTS"});s=purchaseReducer(s,{type:"PRODUCTS_LOADED",products:[product],draft});s=purchaseReducer(s,{type:"REQUEST_QUOTE"});s=purchaseReducer(s,{type:"QUOTE_RECEIVED",quote:{payment_amount:1,lines:[]}});expect(s.status).toBe("quoteReady");s=purchaseReducer(s,{type:"INVALIDATE_QUOTE",draft});expect(s.status).toBe("editingOrder")});it("잘못된 submit을 무시한다",()=>expect(purchaseReducer(initialPurchaseState,{type:"SUBMIT_ORDER"})).toBe(initialPurchaseState))});
describe("민감 세션",()=>{it("주문과 대기 토큰을 삭제한다",()=>{saveOrder({order_reference:"R",order_token:"T",payment_amount:1,accepted_count:1,cancelled_count:0});expect(loadOrder()?.order_token).toBe("T");clearOrder();saveWaitingTicket({enabled:true,status:"ready",ticket_id:"I",ticket_token:"S",position:0,retry_after_seconds:1});clearWaitingTicket();expect(sessionStorage.length).toBe(0);expect(localStorage.length).toBe(0)})});
