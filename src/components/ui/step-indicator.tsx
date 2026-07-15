const steps = ["대기", "상품", "정보", "금액 확인", "입금"];
export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="steps" aria-label="구매 단계">
      {steps.map((step, i) => (
        <li
          key={step}
          aria-current={i === current ? "step" : undefined}
          className={i <= current ? "active" : ""}
        >
          <span>{i + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}
