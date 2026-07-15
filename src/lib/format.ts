const money = new Intl.NumberFormat("ko-KR");
const dateTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});
export const formatMoney = (value: number) => `${money.format(value)}원`;
export const formatDateTime = (value: string | Date) =>
  dateTime.format(typeof value === "string" ? new Date(value) : value);
export const describeDifference = (difference: number) =>
  difference > 0
    ? `${formatMoney(difference)} 부족`
    : difference < 0
      ? `${formatMoney(Math.abs(difference))} 초과`
      : "금액 일치";
