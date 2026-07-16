"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  PackageCheck,
} from "lucide-react";
import type { DepositorResultData, OrderStatusData } from "@/lib/api/contracts";
import { describeDifference, formatDateTime, formatMoney } from "@/lib/format";
import { getStatusPresentation } from "@/features/orders/status-model";
import { useI18n } from "@/features/preferences/preferences-provider";
function safeTrackingUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
export function PaymentStatus({
  data,
}: {
  data: OrderStatusData | DepositorResultData;
}) {
  const { locale, t } = useI18n();
  const item = getStatusPresentation(data.status_code);
  const title = t(item.titleKey, { status: data.status });
  const full = "items" in data;
  const trackingUrl = full ? safeTrackingUrl(data.courier.tracking_url) : null;
  const hasTracking =
    full && data.items.some((line) => Boolean(line.tracking_number));
  return (
    <section className="card" aria-live="polite">
      <span className={`status-badge ${item.kind === "ok" ? "ok" : ""}`}>
        {item.kind === "ok" ? (
          <CheckCircle2 size={15} />
        ) : item.kind === "danger" ? (
          <AlertTriangle size={15} />
        ) : (
          <Clock3 size={15} />
        )}{" "}
        {title}
      </span>
      <h2>{title}</h2>
      <p>{t(item.detailKey)}</p>
      <div className="summary-row">
        <span>{t("payment.expected")}</span>
        <strong>{formatMoney(data.expected_amount, locale)}</strong>
      </div>
      <div className="summary-row">
        <span>{t("payment.paid")}</span>
        <strong>{formatMoney(data.paid_amount, locale)}</strong>
      </div>
      <div className="summary-row">
        <span>{t("payment.difference")}</span>
        <strong>{describeDifference(data.difference, locale)}</strong>
      </div>
      {hasTracking && full && (
        <div className="notice success">
          <strong>{data.courier.display_name}</strong>
          <br />
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noreferrer">
              {t("payment.tracking")}
            </a>
          )}
        </div>
      )}
      {full && (
        <>
          <p className="muted">
            {t("payment.orderedAt", { date: formatDateTime(data.created_at, locale) })}
          </p>
          <h3>
            <PackageCheck size={19} /> {t("payment.items")}
          </h3>
          {data.items.map((line, i) => (
            <div className="quote-line" key={line.product_id || i}>
              <span>
                <strong>{line.product_name}</strong> × {line.quantity}
                <br />
                <small>
                  {t(getStatusPresentation(line.status_code).titleKey, { status: line.status })}
                  {line.cancellation_reason && ` · ${line.cancellation_reason}`}
                  {line.tracking_number &&
                    ` · ${t("payment.trackingNumber", { courier: data.courier.display_name, number: line.tracking_number })}`}
                </small>
              </span>
              <strong>{formatMoney(line.price, locale)}</strong>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
