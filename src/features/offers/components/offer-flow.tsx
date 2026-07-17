"use client";

import { useEffect, useState } from "react";
import type { Product, TicketCredentials } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { createOffer, getOfferStatus, type OfferInput } from "@/lib/api/products";
import { formatMoney } from "@/lib/format";
import {
  auctionTimeFromProduct,
  auctionTimeFromServer,
  currentRemainingSeconds,
  formatRemaining,
  offerMethodMessageKey,
  offerProducts,
  type AuctionTimeState,
} from "@/features/offers/domain";
import { useI18n } from "@/features/preferences/preferences-provider";

function useAuctionCountdown(state: AuctionTimeState) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 1_000);
    return () => clearInterval(timer);
  }, []);
  return currentRemainingSeconds(state);
}

function OfferCard({ product, ticket }: { product: Product; ticket: TicketCredentials }) {
  const { locale, t } = useI18n();
  const incremental = product.bid_input_mode === "incremental";
  const [amount, setAmount] = useState(product.unit_price);
  const [quantity, setQuantity] = useState(1);
  const [credentials, setCredentials] = useState<{ reference: string; token: string }>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [time, setTime] = useState(() => auctionTimeFromProduct(product));
  const remaining = useAuctionCountdown(time);

  const submit = async (input: OfferInput) => {
    setBusy(true);
    setMessage("");
    try {
      const created = await createOffer(product.product_id, input, ticket);
      setCredentials({ reference: created.offer_reference, token: created.offer_token });
      setTime(auctionTimeFromServer(created));
      if (created.instant_win) {
        setClosed(true);
        setMessage(t("offers.instantWin", { amount: formatMoney(created.amount, locale) }));
      } else if (created.extended) {
        setMessage(
          `${t("offers.accepted", { reference: created.offer_reference })} ${t("offers.extended", { count: created.extension_count })}`,
        );
      } else {
        setMessage(t("offers.accepted", { reference: created.offer_reference }));
      }
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("offers.failed"));
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    if (!credentials) return;
    setBusy(true);
    try {
      const status = await getOfferStatus(credentials.reference, credentials.token);
      setTime(auctionTimeFromServer(status));
      if (status.result !== "pending") setClosed(true);
      const resultMessage = t(`offers.result.${status.result}`, {
        amount: formatMoney(status.amount, locale),
      });
      setMessage(
        status.instant_win && status.result === "won"
          ? t("offers.instantWin", { amount: formatMoney(status.amount, locale) })
          : resultMessage,
      );
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("offers.failed"));
    } finally {
      setBusy(false);
    }
  };

  const quantityInvalid = quantity < 1 || quantity > product.available_quantity;

  return (
    <article className="flex flex-col border border-border bg-card-muted/20 rounded-2xl p-6 transition-all hover:border-primary/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-primary tracking-wide uppercase">
          {t(offerMethodMessageKey(product.purchase_method))}
        </p>
        <span className="text-2xl font-black text-foreground">
          {t("offers.startPrice", { price: formatMoney(product.unit_price, locale) })}
        </span>
      </div>
      
      <h3 className="text-xl font-bold text-foreground mb-4">{product.product_name}</h3>
      
      <div className="flex flex-col gap-1 mb-4 bg-card border border-border/50 rounded-xl p-3">
        {time.saleEndsAt && (
          <p className="text-sm font-semibold text-destructive" aria-live="polite">
            {t("offers.remaining", { time: formatRemaining(remaining) })}
            {time.extensionCount > 0 && <span className="text-muted-foreground ml-1 font-normal">· {t("offers.extensionCount", { count: time.extensionCount })}</span>}
          </p>
        )}
        {(product.minimum_offer_price > 0 || product.maximum_offer_price > 0) && (
          <p className="text-xs text-muted-foreground mt-1">
            {product.minimum_offer_price > 0 &&
              t("offers.minPrice", { price: formatMoney(product.minimum_offer_price, locale) })}
            {product.minimum_offer_price > 0 && product.maximum_offer_price > 0 && " · "}
            {product.maximum_offer_price > 0 &&
              t("offers.maxPrice", { price: formatMoney(product.maximum_offer_price, locale) })}
          </p>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {incremental ? (
          <p className="text-sm text-muted-foreground bg-primary/10 text-primary p-3 rounded-xl">
            {t("offers.incrementalHint")}
          </p>
        ) : (
          <div className="space-y-2">
            <label htmlFor={`offer-amount-${product.product_id}`} className="text-sm font-bold text-foreground">{t("offers.amount")}</label>
            <input 
              id={`offer-amount-${product.product_id}`} 
              type="number" 
              min="0" 
              value={amount} 
              onChange={(event) => setAmount(Number(event.target.value))} 
              className="w-full rounded-xl border border-border bg-card-muted/30 px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor={`offer-quantity-${product.product_id}`} className="text-sm font-bold text-foreground">{t("offers.quantity")}</label>
          <input 
            id={`offer-quantity-${product.product_id}`} 
            type="number" 
            min="1" 
            max={product.available_quantity} 
            value={quantity} 
            onChange={(event) => setQuantity(Number(event.target.value))} 
            className="w-full rounded-xl border border-border bg-card-muted/30 px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto">
        <button
          type="button"
          disabled={busy || closed || quantityInvalid || (!incremental && amount < 0)}
          onClick={() => submit(incremental ? { quantity } : { amount, quantity })}
          className="w-full py-3 px-4 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {busy ? t("offers.processing") : incremental ? t("offers.bid") : t("offers.submit")}
        </button>
        {product.buy_now_price > 0 && (
          <button
            type="button"
            disabled={busy || closed || quantityInvalid}
            onClick={() => submit({ buy_now: true, quantity })}
            className="w-full py-3 px-4 border border-border bg-card-muted/30 text-foreground font-bold rounded-xl hover:bg-card-muted/50 transition-colors disabled:opacity-50"
          >
            {t("offers.buyNow", { price: formatMoney(product.buy_now_price, locale) })}
          </button>
        )}
        {credentials && (
          <button 
            type="button" 
            disabled={busy} 
            onClick={refresh}
            className="w-full py-2 px-4 border border-border bg-transparent text-muted-foreground font-medium rounded-xl hover:text-foreground transition-colors disabled:opacity-50 mt-2"
          >
            {t("offers.refresh")}
          </button>
        )}
      </div>

      {message && (
        <div className="mt-4 p-4 bg-primary/10 border border-primary/20 text-primary font-medium rounded-xl" role="status">
          {message}
        </div>
      )}
    </article>
  );
}

export function OfferFlow({ products, ticket }: { products: Product[]; ticket: TicketCredentials }) {
  const { t } = useI18n();
  const offers = offerProducts(products);
  if (!offers.length) return null;

  return (
    <section aria-labelledby="offer-products-title" className="mt-8 border-t border-border/40 pt-8">
      <h3 id="offer-products-title" className="mb-4 text-2xl font-bold text-foreground">
        {t("offers.heading")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((product) => <OfferCard key={product.product_id} product={product} ticket={ticket} />)}
      </div>
    </section>
  );
}
