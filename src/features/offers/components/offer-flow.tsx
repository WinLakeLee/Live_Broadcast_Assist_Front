"use client";

import { useState } from "react";
import type { Product, TicketCredentials } from "@/lib/api/contracts";
import { ApiError } from "@/lib/api/errors";
import { createOffer, getOfferStatus } from "@/lib/api/products";
import { formatMoney } from "@/lib/format";
import { offerMethodMessageKey, offerProducts } from "@/features/offers/domain";
import { useI18n } from "@/features/preferences/preferences-provider";

function OfferCard({ product, ticket }: { product: Product; ticket: TicketCredentials }) {
  const { locale, t } = useI18n();
  const [amount, setAmount] = useState(product.unit_price);
  const [quantity, setQuantity] = useState(1);
  const [credentials, setCredentials] = useState<{ reference: string; token: string }>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setMessage("");
    try {
      const created = await createOffer(product.product_id, { amount, quantity }, ticket);
      setCredentials({ reference: created.offer_reference, token: created.offer_token });
      setMessage(t("offers.accepted", { reference: created.offer_reference }));
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
      setMessage(t(`offers.result.${status.result}`, { amount: formatMoney(status.amount, locale) }));
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : t("offers.failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="product-card">
      <p className="text-sm font-semibold text-[#e94d2f]">{t(offerMethodMessageKey(product.purchase_method))}</p>
      <h3>{product.product_name}</h3>
      <div className="price">{t("offers.startPrice", { price: formatMoney(product.unit_price, locale) })}</div>
      <div className="field">
        <label htmlFor={`offer-amount-${product.product_id}`}>{t("offers.amount")}</label>
        <input id={`offer-amount-${product.product_id}`} type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
      </div>
      <div className="field">
        <label htmlFor={`offer-quantity-${product.product_id}`}>{t("offers.quantity")}</label>
        <input id={`offer-quantity-${product.product_id}`} type="number" min="1" max={product.available_quantity} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
      </div>
      <button className="button primary" type="button" disabled={busy || amount < 0 || quantity < 1 || quantity > product.available_quantity} onClick={submit}>
        {busy ? t("offers.processing") : t("offers.submit")}
      </button>
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
