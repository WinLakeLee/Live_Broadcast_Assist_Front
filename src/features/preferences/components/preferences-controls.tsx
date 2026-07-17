"use client";

import { Languages, MoonStar, ChevronDown } from "lucide-react";

import { useI18n, usePreferences, type Theme } from "../preferences-provider";
import type { Locale } from "../i18n";

export function PreferencesControls() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = usePreferences();

  return (
    <div className="flex items-center gap-4">
      <label className="relative flex items-center gap-2 cursor-pointer rounded-full border border-border bg-card-muted/50 px-3 py-1.5 transition-all hover:bg-card-muted focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <Languages aria-hidden="true" size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{locale === "ko" ? t("preferences.ko") : t("preferences.en")}</span>
        <ChevronDown size={14} className="text-muted-foreground/70" />
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          aria-label={t("preferences.language")}
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          <option value="ko">{t("preferences.ko")}</option>
          <option value="en">{t("preferences.en")}</option>
        </select>
      </label>

      <label className="relative flex items-center gap-2 cursor-pointer rounded-full border border-border bg-card-muted/50 px-3 py-1.5 transition-all hover:bg-card-muted focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
        <MoonStar aria-hidden="true" size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">
          {theme === "system" ? t("preferences.system") : theme === "light" ? t("preferences.light") : t("preferences.dark")}
        </span>
        <ChevronDown size={14} className="text-muted-foreground/70" />
        <select
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none"
          aria-label={t("preferences.theme")}
          value={theme}
          onChange={(event) => setTheme(event.target.value as Theme)}
        >
          <option value="system">{t("preferences.system")}</option>
          <option value="light">{t("preferences.light")}</option>
          <option value="dark">{t("preferences.dark")}</option>
        </select>
      </label>
    </div>
  );
}
