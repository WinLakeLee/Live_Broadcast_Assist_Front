"use client";

import { useState, useRef, useEffect } from "react";
import { Languages, MoonStar, ChevronDown } from "lucide-react";

import { useI18n, usePreferences, type Theme } from "../preferences-provider";
import type { Locale } from "../i18n";

function Dropdown({ 
  icon: Icon, 
  label, 
  value, 
  options, 
  onChange, 
  ariaLabel 
}: {
  icon: any,
  label: string,
  value: string,
  options: {value: string, label: string}[],
  onChange: (val: string) => void,
  ariaLabel: string
}) {
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

  return (
    <div className="relative" ref={ref}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-border bg-card-muted/50 px-3 py-1.5 transition-all hover:bg-card-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        aria-label={ariaLabel}
      >
        <Icon aria-hidden="true" size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
        <ChevronDown size={14} className="text-muted-foreground/70" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-max min-w-[120px] right-0 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in duration-200">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-card-muted ${
                value === opt.value 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function PreferencesControls() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = usePreferences();

  return (
    <div className="flex items-center gap-3">
      <Dropdown
        icon={Languages}
        label={locale === "ko" ? t("preferences.ko") : t("preferences.en")}
        value={locale}
        onChange={(val) => setLocale(val as Locale)}
        ariaLabel={t("preferences.language")}
        options={[
          { value: "ko", label: t("preferences.ko") },
          { value: "en", label: t("preferences.en") },
        ]}
      />

      <Dropdown
        icon={MoonStar}
        label={
          theme === "system" 
            ? t("preferences.system") 
            : theme === "light" 
              ? t("preferences.light") 
              : t("preferences.dark")
        }
        value={theme}
        onChange={(val) => setTheme(val as Theme)}
        ariaLabel={t("preferences.theme")}
        options={[
          { value: "system", label: t("preferences.system") },
          { value: "light", label: t("preferences.light") },
          { value: "dark", label: t("preferences.dark") },
        ]}
      />
    </div>
  );
}
