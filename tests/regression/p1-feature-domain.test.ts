import { describe, expect, it } from "vitest";

import {
  adminFormToInput,
  adminProductFormSchema,
  productToAdminForm,
  sortAdminProducts,
} from "@/features/admin-products/form-model";
import {
  createCheckoutDraft,
  sanitizeCheckoutQuantities,
} from "@/features/checkout/domain";
import { offerMethodMessageKey, offerProducts } from "@/features/offers/domain";
import { makeProduct } from "../fixtures/contracts";

describe("P1 feature 도메인 경계", () => {
  it("관리자 상품의 API 모델과 폼 모델을 왕복 변환한다", () => {
    const product = makeProduct({
      catalog: {
        catalog_item_id: "catalog-1",
        brand_name: "브랜드",
        manufacturer: "제조사",
        model_number: "M1",
        product_type: "GENERAL",
        description: "설명",
        detail_category_id: "detail-1",
        parent_sku: "PARENT",
        barcode: "8800000000000",
        option_values: { 색상: "빨강" },
        attributes: { 원산지: "한국" },
        image_urls: ["https://example.com/product.png"],
      },
    });
    const form = productToAdminForm(product);
    expect(form.option_values_json).toContain("빨강");
    expect(adminProductFormSchema.safeParse(form).success).toBe(true);
    expect(adminFormToInput(form)).toMatchObject({
      catalog_item_id: "catalog-1",
      option_values: { 색상: "빨강" },
      attributes: { 원산지: "한국" },
      image_urls: ["https://example.com/product.png"],
    });
  });

  it("관리자 폼에서 배열 JSON과 비 HTTPS 이미지를 거부한다", () => {
    const form = productToAdminForm(makeProduct());
    expect(
      adminProductFormSchema.safeParse({
        ...form,
        option_values_json: "[]",
        image_urls_text: "http://example.com/insecure.png",
      }).success,
    ).toBe(false);
  });

  it("상품 정렬 시 API 응답 배열을 변경하지 않는다", () => {
    const products = [
      makeProduct({ product_name: "뒤", display_order: 2 }),
      makeProduct({ product_name: "앞", display_order: 1 }),
    ];
    expect(sortAdminProducts(products).map((item) => item.product_name)).toEqual([
      "앞",
      "뒤",
    ]);
    expect(products[0].product_name).toBe("뒤");
  });

  it("체크아웃 초안은 양수 수량만 포함한다", () => {
    const draft = createCheckoutDraft(
      {
        buyer_name: "구매자",
        phone: "010-1234-5678",
        address: "서울특별시 테스트 주소",
        stock_policy: "partial",
        coupon_code: "WELCOME",
        privacy_agreed: true,
        policy_agreed: true,
      },
      { "prd-a": 2, "prd-b": 0 },
    );
    expect(draft.items).toEqual([{ product_id: "prd-a", quantity: 2 }]);
  });

  it("오래된 초안의 제안·삭제 상품을 제거하고 재고 한도로 보정한다", () => {
    const fixed = makeProduct({ product_id: "prd-fixed", product_name: "고정가", available_quantity: 2 });
    const offer = makeProduct({
      product_id: "prd-auction",
      product_name: "경매",
      purchase_method: "auction",
      purchase_flow: "offer",
    });
    expect(
      sanitizeCheckoutQuantities([fixed, offer], { "prd-fixed": 9, "prd-auction": 1, "prd-deleted": 1 }),
    ).toEqual({ "prd-fixed": 2 });
    expect(offerProducts([fixed, offer])).toEqual([offer]);
    expect(offerMethodMessageKey("auction")).toBe("offers.auction");
  });
});
