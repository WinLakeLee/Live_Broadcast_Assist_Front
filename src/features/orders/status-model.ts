import type { MessageKey } from "@/features/preferences/i18n";

export type StatusKind = "ok" | "warn" | "danger";

const statusPresentation = {
  payment_pending: "warn",
  payment_underpaid: "warn",
  payment_overpaid: "warn",
  depositor_mismatch: "danger",
  payment_completed: "ok",
  order_expired: "danger",
  stock_cancelled: "warn",
  preparing_shipment: "ok",
  shipped: "ok",
  delivered: "ok",
  refunded: "ok",
} as const satisfies Record<string, StatusKind>;

export type KnownOrderStatusCode = keyof typeof statusPresentation;

export function getStatusPresentation(statusCode: string): {
  kind: StatusKind;
  titleKey: MessageKey;
  detailKey: MessageKey;
} {
  if (statusCode in statusPresentation) {
    const code = statusCode as KnownOrderStatusCode;
    return {
      kind: statusPresentation[code],
      titleKey: `status.${code}.title` as MessageKey,
      detailKey: `status.${code}.detail` as MessageKey,
    };
  }
  return {
    kind: "warn",
    titleKey: "status.unknown.title",
    detailKey: "status.unknown.detail",
  };
}
