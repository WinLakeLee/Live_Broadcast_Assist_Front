import { render,screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe,expect,it,vi } from "vitest";
import { ProductSelector } from "@/components/products/product-selector";
import { PaymentStatus } from "@/components/payment/payment-status";

const product={product_id:"prd-soldout",product_name:"품절 상품",unit_price:1000,stock_limit:1,reserved_quantity:1,available_quantity:0,active:true,display_order:1,purchase_method:"fixed_price" as const,reserve_price:0,bid_increment:0,sale_starts_at:"",sale_ends_at:"",purchase_flow:"checkout" as const,sku:"SKU",category_major:"",category_minor:"",category_detail:"",expected_arrival_date:"",arrival_date:"",inventory_status:"unscheduled" as const,catalog:null,listing:null,inventory:[]};
describe("상품 카드",()=>{
  it("품절 수량을 비활성화한다",()=>{render(<ProductSelector products={[product]} quantities={{}} onChange={vi.fn()}/>);expect(screen.getByText("품절")).toBeInTheDocument();expect(screen.getByLabelText("품절 상품 수량")).toBeDisabled()});
  it("수량 stepper를 조작한다",async()=>{const change=vi.fn();render(<ProductSelector products={[{...product,product_id:"prd-sale",product_name:"판매 상품",available_quantity:2}]} quantities={{"prd-sale":0}} onChange={change}/>);await userEvent.click(screen.getByLabelText("판매 상품 수량 늘리기"));expect(change).toHaveBeenCalledWith("prd-sale",1)});
});
describe("입금 상태",()=>{
  for(const [status_code,status,text] of [["payment_underpaid","입금부족","부족합니다"],["payment_overpaid","입금초과","많이 입금"],["depositor_mismatch","입금자불일치","일치하지 않습니다"],["payment_completed","결제완료","완료되었습니다"]]) it(status,()=>{render(<PaymentStatus data={{status_code,status,expected_amount:1000,paid_amount:500,difference:500}}/>);expect(screen.getAllByText(new RegExp(text)).length).toBeGreaterThan(0)});
  it("CU(롯데택배) 운송장과 안전한 공식 조회 링크를 표시한다",()=>{render(<PaymentStatus data={{order_reference:"REF",status_code:"preparing_shipment",status:"배송준비",created_at:"2026-01-01T00:00:00Z",buyer_name:"테***",phone:"000",address:"테스트 **",expected_amount:1000,paid_amount:1000,difference:0,courier:{provider:"cu_lotte",display_name:"CU(롯데택배)",tracking_url:"https://www.lotteglogis.com/track"},items:[{product_id:"prd-item",product_name:"상품",quantity:1,price:1000,status_code:"preparing_shipment",status:"배송준비",cancellation_reason:"",tracking_number:"TEST-TRACKING"}]}}/>);expect(screen.getAllByText(/CU\(롯데택배\)/).length).toBeGreaterThan(0);expect(screen.getByText(/TEST-TRACKING/)).toBeInTheDocument();expect(screen.getByRole("link",{name:"공식 배송조회 페이지 열기"})).toHaveAttribute("href","https://www.lotteglogis.com/track")});
});
