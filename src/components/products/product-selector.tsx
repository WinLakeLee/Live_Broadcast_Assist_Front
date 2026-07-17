"use client";

import { useEffect, useState } from "react";
import { List, AlignJustify, ListTree, LayoutList, LayoutGrid, LayoutDashboard, Image as ImageIcon, Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/api/contracts";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/features/preferences/preferences-provider";
import type { MessageKey } from "@/features/preferences/i18n";

export type ViewMode = "list-compact" | "list" | "list-detail" | "tile" | "grid-card" | "gallery";

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

  const [viewMode, setViewMode] = useState<ViewMode>("list-detail");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("live-purchase:view-mode");
    if (saved) {
      setViewMode(saved as ViewMode);
    }
  }, []);

  const handleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("live-purchase:view-mode", mode);
  };

  if (!products.length)
    return <div className="text-muted-foreground py-8 text-center bg-card-muted/20 border border-border/40 rounded-2xl">{t("products.none")}</div>;

  const renderQtyControl = (product: Product, value: number, soldout: boolean, variant: "default" | "small" | "full" | "light" = "default") => {
    const isLight = variant === "light";
    const bgClass = isLight ? "bg-white/20 border-white/30 text-white" : "bg-card border-border/60 text-foreground";
    const hoverClass = isLight ? "hover:bg-white/30" : "hover:bg-card-muted/50";
    const sizeClasses = variant === "small" ? "w-8 h-8" : "w-10 h-10";
    const iconSize = variant === "small" ? 16 : 18;
    const inputWidth = variant === "full" ? "flex-1" : variant === "small" ? "w-10" : "w-12 sm:w-16";

    return (
      <div className={`flex items-center justify-between border rounded-xl p-1 backdrop-blur-sm ${bgClass} ${variant === "full" ? "w-full" : ""}`}>
        <button
          type="button"
          aria-label={t("products.quantityDecrease", { name: product.product_name })}
          disabled={soldout || value <= 0}
          className={`${sizeClasses} flex items-center justify-center rounded-lg ${hoverClass} disabled:opacity-30 transition-colors`}
          onClick={() => onChange(product.product_id, Math.max(0, value - 1))}
        >
          <Minus size={iconSize} strokeWidth={2.5} />
        </button>
        <input
          aria-label={t("products.quantity", { name: product.product_name })}
          type="number"
          inputMode="numeric"
          min={0}
          max={product.available_quantity}
          disabled={soldout}
          value={value}
          className={`${inputWidth} h-8 text-center font-bold text-base sm:text-lg bg-transparent border-none focus:outline-none focus:ring-0 tabular-nums p-0 ${isLight ? "text-white" : "text-foreground"}`}
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
          className={`${sizeClasses} flex items-center justify-center rounded-lg ${hoverClass} disabled:opacity-30 transition-colors`}
          onClick={() => onChange(product.product_id, Math.min(product.available_quantity, value + 1))}
        >
          <Plus size={iconSize} strokeWidth={2.5} />
        </button>
      </div>
    );
  };

  const getContainerClass = () => {
    switch (viewMode) {
      case "list-compact": return "flex flex-col border border-border/50 rounded-2xl divide-y divide-border/40 overflow-hidden";
      case "list": return "flex flex-col gap-3";
      case "list-detail": return "grid grid-cols-1 gap-4";
      case "tile": return "grid grid-cols-1 md:grid-cols-2 gap-4";
      case "grid-card": return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4";
      case "gallery": return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6";
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* View Mode Selector */}
      {mounted && (
        <div className="flex items-center justify-end">
          <div className="flex items-center bg-card-muted/50 p-1 rounded-xl border border-border/50">
            <button type="button" onClick={() => handleViewMode("list-compact")} className={`p-2 rounded-lg transition-colors ${viewMode === "list-compact" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="간단한 목록"><List size={18} /></button>
            <button type="button" onClick={() => handleViewMode("list")} className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="일반 목록"><AlignJustify size={18} /></button>
            <button type="button" onClick={() => handleViewMode("list-detail")} className={`p-2 rounded-lg transition-colors ${viewMode === "list-detail" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="상세 목록"><ListTree size={18} /></button>
            <button type="button" onClick={() => handleViewMode("tile")} className={`p-2 rounded-lg transition-colors ${viewMode === "tile" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="타일 보기"><LayoutList size={18} /></button>
            <button type="button" onClick={() => handleViewMode("grid-card")} className={`p-2 rounded-lg transition-colors ${viewMode === "grid-card" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="카드 보기"><LayoutGrid size={18} /></button>
            <button type="button" onClick={() => handleViewMode("gallery")} className={`p-2 rounded-lg transition-colors ${viewMode === "gallery" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`} title="큰 갤러리 보기"><LayoutDashboard size={18} /></button>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className={getContainerClass()}>
        {[...products]
          .filter((p) => p.active && p.purchase_flow === "checkout")
          .sort((a, b) => a.display_order - b.display_order)
          .map((product) => {
            const soldout = product.available_quantity === 0;
            const value = quantities[product.product_id] ?? 0;
            const condition = product.listing?.condition_type ?? "new";
            const conditionLabel = t(`products.condition.${condition}` as MessageKey);
            
            const metaParts = [product.catalog?.brand_name, product.listing?.seller_id && t("products.seller", { name: product.listing.seller_id }), conditionLabel].filter(Boolean);
            const metaString = metaParts.join(" · ");
            const imgUrl = product.catalog?.image_urls?.[0];

            const renderImage = (className: string, iconSize: number) => (
              <div className={`${className} bg-card-muted/80 flex items-center justify-center shrink-0`}>
                {imgUrl ? (
                  <img src={imgUrl} alt={product.product_name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <ImageIcon size={iconSize} className="text-muted-foreground/30" />
                )}
              </div>
            );

            // 1. List Compact
            if (viewMode === "list-compact") {
              return (
                <article key={product.product_id} className={`flex items-center justify-between p-3 sm:px-4 bg-card-muted/10 transition-colors hover:bg-card-muted/30 ${soldout ? "opacity-60 grayscale-[0.5]" : ""}`}>
                  <h3 className="text-sm sm:text-base font-bold truncate flex-1 mr-4 text-foreground">{product.product_name}</h3>
                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <span className="text-base sm:text-lg font-black text-primary">{formatMoney(product.unit_price, locale)}</span>
                    {renderQtyControl(product, value, soldout, "small")}
                  </div>
                </article>
              );
            }

            // 2. List
            if (viewMode === "list") {
              return (
                <article key={product.product_id} className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border border-border/60 bg-card-muted/10 rounded-xl p-4 transition-colors hover:border-primary/40 ${soldout ? "opacity-60 grayscale-[0.5]" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{product.product_name}</h3>
                    {metaString && <p className="text-sm text-muted-foreground truncate mt-0.5">{metaString}</p>}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 shrink-0">
                    <span className="text-xl font-black text-primary">{formatMoney(product.unit_price, locale)}</span>
                    {renderQtyControl(product, value, soldout)}
                  </div>
                </article>
              );
            }

            // 4. Tile
            if (viewMode === "tile") {
              return (
                <article key={product.product_id} className={`flex gap-4 border border-border/60 bg-card-muted/10 p-3 rounded-2xl transition-all hover:border-primary/40 ${soldout ? "opacity-60 grayscale-[0.5]" : ""}`}>
                  {renderImage("w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden", 32)}
                  <div className="flex flex-col flex-1 py-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-2 leading-snug">{product.product_name}</h3>
                    {metaString && <p className="text-xs text-muted-foreground truncate mt-1">{metaString}</p>}
                    <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                      <span className="text-lg sm:text-xl font-black text-primary truncate">{formatMoney(product.unit_price, locale)}</span>
                      {renderQtyControl(product, value, soldout, "small")}
                    </div>
                  </div>
                </article>
              );
            }

            // 5. Grid Card
            if (viewMode === "grid-card") {
              return (
                <article key={product.product_id} className={`flex flex-col border border-border/60 bg-card/50 rounded-2xl overflow-hidden transition-all hover:border-primary/40 hover:shadow-sm ${soldout ? "opacity-60 grayscale-[0.5]" : ""}`}>
                  {renderImage("aspect-square w-full", 48)}
                  <div className="p-3 sm:p-4 flex flex-col flex-1">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1 min-h-[2.5rem] leading-snug">{product.product_name}</h3>
                    <div className="mt-auto pt-2 sm:pt-3 flex flex-col gap-2 sm:gap-3">
                      <span className="text-lg sm:text-xl font-black text-primary">{formatMoney(product.unit_price, locale)}</span>
                      {renderQtyControl(product, value, soldout, "full")}
                    </div>
                  </div>
                </article>
              );
            }

            // 6. Gallery
            if (viewMode === "gallery") {
              return (
                <article key={product.product_id} className={`relative rounded-3xl overflow-hidden group border border-border/20 shadow-sm ${soldout ? "opacity-60 grayscale-[0.5]" : ""}`}>
                  <div className="aspect-[4/3] sm:aspect-video md:aspect-[4/3] bg-card-muted/80 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={product.product_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                    ) : (
                      <ImageIcon size={64} className="text-muted-foreground/20" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4 sm:p-5">
                    <h3 className="text-lg sm:text-xl font-bold text-white line-clamp-2 mb-1 drop-shadow-md leading-tight">{product.product_name}</h3>
                    {metaString && <p className="text-xs sm:text-sm text-white/80 truncate drop-shadow-sm mb-3">{metaString}</p>}
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xl sm:text-2xl font-black text-white drop-shadow-md">{formatMoney(product.unit_price, locale)}</span>
                      {renderQtyControl(product, value, soldout, "light")}
                    </div>
                  </div>
                </article>
              );
            }

            // 3. List Detail (기존)
            return (
              <article
                className={`flex flex-col md:flex-row gap-5 md:items-center justify-between border border-border bg-card-muted/20 rounded-2xl p-5 transition-all ${
                  soldout ? "opacity-60 grayscale-[0.5]" : "hover:border-primary/50"
                }`}
                key={product.product_id}
              >
                <div className="flex flex-col space-y-1.5 flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold text-foreground break-keep">{product.product_name}</h3>
                  
                  {metaString && <p className="text-sm text-muted-foreground truncate">{metaString}</p>}
                  
                  {(product.category_major || product.expected_arrival_date) && (
                    <p className="text-sm text-muted-foreground truncate">
                      {[product.category_major, product.category_minor, product.category_detail]
                        .filter(Boolean).join(" › ")}
                      {product.expected_arrival_date && !product.arrival_date
                        ? ` · ${t("products.arrivalExpected", { date: product.expected_arrival_date })}`
                        : ""}
                    </p>
                  )}
                  
                  {product.catalog && Object.keys(product.catalog.option_values).length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {Object.entries(product.catalog.option_values)
                        .map(([name, option]) => `${name}: ${option}`).join(" · ")}
                    </p>
                  )}
                  
                  {product.catalog?.description && (
                    <p className="text-foreground mt-2 text-sm sm:text-base line-clamp-3">{product.catalog.description}</p>
                  )}
                  
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-black text-primary">{formatMoney(product.unit_price, locale)}</span>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {soldout
                        ? t("products.soldOut")
                        : t("products.available", { count: number.format(product.available_quantity) })}
                    </span>
                  </div>

                  {product.inventory.some((item) => item.inbound_quantity > 0) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("products.inbound", { count: number.format(product.inventory.reduce((total, item) => total + item.inbound_quantity, 0)) })}
                    </p>
                  )}
                </div>

                <div className="shrink-0 pt-2 md:pt-0">
                  {renderQtyControl(product, value, soldout)}
                </div>
              </article>
            );
          })}
      </div>
    </div>
  );
}

