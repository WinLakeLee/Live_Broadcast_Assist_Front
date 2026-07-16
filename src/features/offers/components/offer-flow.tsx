"use client";

import type { Product } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/format";
import { offerMethodMessageKey, offerProducts } from "@/features/offers/domain";
import { useI18n } from "@/features/preferences/preferences-provider";

export function OfferFlow({ products }: { products: Product[] }) {
  const { locale, t } = useI18n();
  const offers = offerProducts(products);
  if (!offers.length) return null;

  return (
    <section aria-labelledby="offer-products-title" className="mt-6">
      <h3 id="offer-products-title" className="mb-3 text-lg font-bold">
        {t("offers.heading")}
      </h3>
      <div className="product-grid">
        {offers.map((product) => (
          <article className="product-card" key={product.product_id}>
            <p className="text-sm font-semibold text-[#e94d2f]">
              {t(offerMethodMessageKey(product.purchase_method))}
            </p>
            <h3>{product.product_name}</h3>
            <div className="price">
              {t("offers.startPrice", { price: formatMoney(product.unit_price, locale) })}
            </div>
            <div className="notice" role="status">
              {t("offers.unavailable")}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
