import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["대기", "상품", "정보", "금액 확인", "입금"];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-10 w-full px-2" aria-label="구매 단계">
      <div className="relative flex items-center justify-between">
        {/* Background line */}
        <div className="absolute left-0 top-1/2 -z-10 h-1 w-full -translate-y-1/2 rounded-full bg-border" />
        
        {/* Active progress line */}
        <div 
          className="absolute left-0 top-1/2 -z-10 h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-500 ease-in-out" 
          style={{ width: `${(current / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, i) => {
          const isCompleted = i < current;
          const isCurrent = i === current;

          return (
            <div key={step} className="flex flex-col items-center gap-2">
              <div
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-300",
                  isCompleted
                    ? "border-primary bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.5)]"
                    : isCurrent
                    ? "border-primary bg-card text-primary shadow-[0_0_10px_rgba(var(--color-primary),0.3)] ring-4 ring-primary/20"
                    : "border-border bg-card text-muted-foreground"
                )}
              >
                {isCompleted ? <Check strokeWidth={3} size={20} /> : <span>{i + 1}</span>}
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tracking-tight transition-colors md:text-sm",
                  isCurrent ? "text-foreground" : "text-muted"
                )}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
