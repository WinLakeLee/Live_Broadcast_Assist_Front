"use client";

import type { Product } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { MessageKey } from "@/features/preferences/i18n";
export function ProductSelector({
  products,
  quantities,
  onChange,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (productId: string, value: number) => void;
}) {
  const { locale, t } = useI18n();
  const number = new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US");
  if (!products.length)
    return <div className="notice">{t("products.none")}</div>;
  return (
    <div className="product-grid">
      {[...products]
        .filter((p) => p.active && p.purchase_flow === "checkout")
        .sort((a, b) => a.display_order - b.display_order)
        .map((product) => {
          const soldout = product.available_quantity === 0;
          const value = quantities[product.product_id] ?? 0;
          const condition = product.listing?.condition_type ?? "new";
          const conditionLabel = t(`products.condition.${condition}` as MessageKey);
          return (
            <article
              className={`product-card ${soldout ? "soldout" : ""}`}
              key={product.product_id}
            >
              <h3>{product.product_name}</h3>
              {(product.catalog?.brand_name || product.listing?.seller_id) && (
                <p className="text-sm text-slate-500">
                  {[product.catalog?.brand_name, product.listing?.seller_id && t("products.seller", { name: product.listing.seller_id }), conditionLabel]
                    .filter(Boolean).join(" · ")}
                </p>
              )}
              {(product.category_major || product.expected_arrival_date) && (
                <p className="text-sm text-slate-500">
                  {[product.category_major, product.category_minor, product.category_detail]
                    .filter(Boolean).join(" › ")}
                  {product.expected_arrival_date && !product.arrival_date
                    ? ` · ${t("products.arrivalExpected", { date: product.expected_arrival_date })}`
                    : ""}
                </p>
              )}
              {product.catalog && Object.keys(product.catalog.option_values).length > 0 && (
                <p className="text-sm text-slate-500">
                  {Object.entries(product.catalog.option_values)
                    .map(([name, option]) => `${name}: ${option}`).join(" · ")}
                </p>
              )}
              {product.catalog?.description && (
                <p>{product.catalog.description}</p>
              )}
              <div className="price">
                {formatMoney(product.unit_price, locale)}
              </div>
              <div className="stock">
                {soldout
                  ? t("products.soldOut")
                  : t("products.available", { count: number.format(product.available_quantity) })}
              </div>
              {product.inventory.some((item) => item.inbound_quantity > 0) && (
                <p className="text-sm text-slate-500">
                  {t("products.inbound", { count: number.format(product.inventory.reduce((total, item) => total + item.inbound_quantity, 0)) })}
                </p>
              )}
              <div className="quantity">
                <button
                  type="button"
                  aria-label={t("products.quantityDecrease", { name: product.product_name })}
                  disabled={soldout || value <= 0}
                  onClick={() =>
                    onChange(product.product_id, Math.max(0, value - 1))
                  }
                >
                  −
                </button>
                <input
                  aria-label={t("products.quantity", { name: product.product_name })}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={product.available_quantity}
                  disabled={soldout}
                  value={value}
                  onChange={(e) =>
                    onChange(
                      product.product_id,
                      Math.min(
                        product.available_quantity,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={t("products.quantityIncrease", { name: product.product_name })}
                  disabled={soldout || value >= product.available_quantity}
                  onClick={() =>
                    onChange(
                      product.product_id,
                      Math.min(product.available_quantity, value + 1),
                    )
                  }
                >
                  +
                </button>
              </div>
            </article>
          );
        })}
    </div>
  );
}
