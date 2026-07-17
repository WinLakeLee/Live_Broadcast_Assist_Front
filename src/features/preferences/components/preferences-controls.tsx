"use client";

import { Languages, MoonStar } from "lucide-react";
import { Select } from "@/components/ui/select";
import { useI18n, usePreferences, type Theme } from "../preferences-provider";
import type { Locale } from "../i18n";

export function PreferencesControls() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = usePreferences();

  return (
    <div className="flex items-center gap-3">
      <Select
        className="w-auto"
        triggerClassName="w-auto rounded-full bg-card-muted/50 border-border h-auto py-1.5 px-3"
        menuClassName="w-max right-0 left-auto"
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

      <Select
        className="w-auto"
        triggerClassName="w-auto rounded-full bg-card-muted/50 border-border h-auto py-1.5 px-3"
        menuClassName="w-max right-0 left-auto"
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
