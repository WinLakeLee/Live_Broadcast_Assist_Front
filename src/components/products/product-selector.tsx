import type { Product } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/format";
export function ProductSelector({
  products,
  quantities,
  onChange,
}: {
  products: Product[];
  quantities: Record<string, number>;
  onChange: (name: string, value: number) => void;
}) {
  if (!products.length)
    return <div className="notice">현재 판매 중인 상품이 없습니다.</div>;
  return (
    <div className="product-grid">
      {products
        .filter((p) => p.active)
        .sort((a, b) => a.display_order - b.display_order)
        .map((product) => {
          const soldout = product.available_quantity === 0;
          const value = quantities[product.product_name] ?? 0;
          const conditionLabel = {
            new: "새 상품",
            used_like_new: "중고 · 최상",
            used_good: "중고 · 양호",
            used_acceptable: "중고 · 사용감 있음",
          }[product.listing?.condition_type ?? "new"];
          return (
            <article
              className={`product-card ${soldout ? "soldout" : ""}`}
              key={product.product_name}
            >
              <h3>{product.product_name}</h3>
              {(product.catalog?.brand_name || product.listing?.seller_id) && (
                <p className="text-sm text-slate-500">
                  {[product.catalog?.brand_name, product.listing?.seller_id && `판매자 ${product.listing.seller_id}`, conditionLabel]
                    .filter(Boolean).join(" · ")}
                </p>
              )}
              {(product.category_major || product.expected_arrival_date) && (
                <p className="text-sm text-slate-500">
                  {[product.category_major, product.category_minor, product.category_detail]
                    .filter(Boolean).join(" › ")}
                  {product.expected_arrival_date && !product.arrival_date
                    ? ` · ${product.expected_arrival_date} 입고 예정`
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
              <div className="price">{formatMoney(product.unit_price)}</div>
              <div className="stock">
                {soldout
                  ? "품절"
                  : `구매 가능 ${product.available_quantity.toLocaleString("ko-KR")}개`}
              </div>
              {product.inventory.some((item) => item.inbound_quantity > 0) && (
                <p className="text-sm text-slate-500">
                  입고 예정 {product.inventory.reduce((total, item) => total + item.inbound_quantity, 0).toLocaleString("ko-KR")}개
                </p>
              )}
              <div className="quantity">
                <button
                  type="button"
                  aria-label={`${product.product_name} 수량 줄이기`}
                  disabled={soldout || value <= 0}
                  onClick={() =>
                    onChange(product.product_name, Math.max(0, value - 1))
                  }
                >
                  −
                </button>
                <input
                  aria-label={`${product.product_name} 수량`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={product.available_quantity}
                  disabled={soldout}
                  value={value}
                  onChange={(e) =>
                    onChange(
                      product.product_name,
                      Math.min(
                        product.available_quantity,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  aria-label={`${product.product_name} 수량 늘리기`}
                  disabled={soldout || value >= product.available_quantity}
                  onClick={() =>
                    onChange(
                      product.product_name,
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
