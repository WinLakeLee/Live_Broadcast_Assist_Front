type FormatLocale = "ko" | "en";
const localeCode = (locale: FormatLocale) => locale === "ko" ? "ko-KR" : "en-US";

export const formatMoney = (value: number, locale: FormatLocale = "ko") =>
  locale === "ko"
    ? `${new Intl.NumberFormat("ko-KR").format(value)}원`
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "KRW",
        maximumFractionDigits: 0,
      }).format(value);

export const formatDateTime = (
  value: string | Date,
  locale: FormatLocale = "ko",
) =>
  new Intl.DateTimeFormat(localeCode(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);

export const describeDifference = (
  difference: number,
  locale: FormatLocale = "ko",
) => {
  if (locale === "en") {
    return difference > 0
      ? `${formatMoney(difference, locale)} short`
      : difference < 0
        ? `${formatMoney(Math.abs(difference), locale)} over`
        : "Amount matched";
  }
  return difference > 0
    ? `${formatMoney(difference, locale)} 부족`
    : difference < 0
      ? `${formatMoney(Math.abs(difference), locale)} 초과`
      : "금액 일치";
};
