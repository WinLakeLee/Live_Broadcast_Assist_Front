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
    <article className="product-card">
      <p className="text-sm font-semibold text-[#e94d2f]">{t(offerMethodMessageKey(product.purchase_method))}</p>
      <h3>{product.product_name}</h3>
      <div className="price">{t("offers.startPrice", { price: formatMoney(product.unit_price, locale) })}</div>
      {time.saleEndsAt && (
        <p className="text-sm text-slate-600" aria-live="polite">
          {t("offers.remaining", { time: formatRemaining(remaining) })}
          {time.extensionCount > 0 && ` · ${t("offers.extensionCount", { count: time.extensionCount })}`}
        </p>
      )}
      {(product.minimum_offer_price > 0 || product.maximum_offer_price > 0) && (
        <p className="text-xs text-slate-500">
          {product.minimum_offer_price > 0 &&
            t("offers.minPrice", { price: formatMoney(product.minimum_offer_price, locale) })}
          {product.minimum_offer_price > 0 && product.maximum_offer_price > 0 && " · "}
          {product.maximum_offer_price > 0 &&
            t("offers.maxPrice", { price: formatMoney(product.maximum_offer_price, locale) })}
        </p>
      )}
      {incremental ? (
        <p className="text-sm text-slate-600">{t("offers.incrementalHint")}</p>
      ) : (
        <div className="field">
          <label htmlFor={`offer-amount-${product.product_id}`}>{t("offers.amount")}</label>
          <input id={`offer-amount-${product.product_id}`} type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
        </div>
      )}
      <div className="field">
        <label htmlFor={`offer-quantity-${product.product_id}`}>{t("offers.quantity")}</label>
        <input id={`offer-quantity-${product.product_id}`} type="number" min="1" max={product.available_quantity} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
      </div>
      <button
        className="button primary"
        type="button"
        disabled={busy || closed || quantityInvalid || (!incremental && amount < 0)}
        onClick={() => submit(incremental ? { quantity } : { amount, quantity })}
      >
        {busy ? t("offers.processing") : incremental ? t("offers.bid") : t("offers.submit")}
      </button>
      {product.buy_now_price > 0 && (
        <button
          className="button"
          type="button"
          disabled={busy || closed || quantityInvalid}
          onClick={() => submit({ buy_now: true, quantity })}
        >
          {t("offers.buyNow", { price: formatMoney(product.buy_now_price, locale) })}
        </button>
      )}
      {credentials && <button className="button" type="button" disabled={busy} onClick={refresh}>{t("offers.refresh")}</button>}
      {message && <div className="notice" role="status">{message}</div>}
    </article>
  );
}

export function OfferFlow({ products, ticket }: { products: Product[]; ticket: TicketCredentials }) {
  const { t } = useI18n();
  const offers = offerProducts(products);
  if (!offers.length) return null;

  return (
    <section aria-labelledby="offer-products-title" className="mt-6">
      <h3 id="offer-products-title" className="mb-3 text-lg font-bold">
        {t("offers.heading")}
      </h3>
      <div className="product-grid">
        {offers.map((product) => <OfferCard key={product.product_id} product={product} ticket={ticket} />)}
      </div>
    </section>
  );
}
