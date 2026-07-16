import type { Product } from "@/lib/api/contracts";
import { ProductSelector } from "@/components/products/product-selector";
import { checkoutProducts } from "@/features/checkout/domain";
import { OfferFlow } from "@/features/offers/components/offer-flow";

export function CheckoutFlow({
  products,
  quantities,
  onQuantityChange,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onQuantityChange: (name: string, value: number) => void;
}) {
  const checkout = checkoutProducts(products);
  if (!checkout.length && !products.some((product) => product.active)) {
    return <div className="notice">현재 판매 중인 상품이 없습니다.</div>;
  }

  return (
    <>
      {checkout.length > 0 && (
        <ProductSelector
          products={checkout}
          quantities={quantities}
          onChange={onQuantityChange}
        />
      )}
      <OfferFlow products={products} />
    </>
  );
}
