"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  icon?: any;
  label?: React.ReactNode;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  menuClassName?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  icon: Icon,
  label,
  placeholder = "선택해주세요",
  ariaLabel,
  className,
  triggerClassName,
  menuClassName,
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = label || selectedOption?.label || placeholder;

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      <button 
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card-muted/30 px-3 py-2 text-sm transition-all hover:bg-card-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 h-10 disabled:opacity-50 disabled:cursor-not-allowed",
          !selectedOption && "text-muted-foreground",
          triggerClassName
        )}
        aria-label={ariaLabel}
      >
        <div className="flex items-center gap-2 w-full truncate">
          {Icon && <Icon aria-hidden="true" size={16} className="text-muted-foreground shrink-0" />}
          <span className="font-medium truncate text-left">{displayLabel}</span>
        </div>
        <ChevronDown size={14} className="text-muted-foreground/70 shrink-0" />
      </button>

      {isOpen && !disabled && (
        <div className={cn(
          "absolute top-full mt-2 min-w-[120px] w-full left-0 rounded-lg border border-border bg-card shadow-lg z-50 animate-in fade-in zoom-in duration-200 max-h-60 overflow-y-auto",
          menuClassName
        )}>
          {options.length === 0 ? (
            <div className="px-4 py-2.5 text-sm text-muted-foreground">옵션이 없습니다</div>
          ) : (
            options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-card-muted",
                  value === opt.value 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
