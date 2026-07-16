"use client";

import { Languages, MoonStar } from "lucide-react";

import { useI18n, usePreferences, type Theme } from "../preferences-provider";
import type { Locale } from "../i18n";

export function PreferencesControls() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = usePreferences();

  return (
    <div className="preferences-controls">
      <label>
        <Languages aria-hidden="true" size={16} />
        <span className="sr-only">{t("preferences.language")}</span>
        <select
          aria-label={t("preferences.language")}
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          <option value="ko">{t("preferences.ko")}</option>
          <option value="en">{t("preferences.en")}</option>
        </select>
      </label>
      <label>
        <MoonStar aria-hidden="true" size={16} />
        <span className="sr-only">{t("preferences.theme")}</span>
        <select
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
