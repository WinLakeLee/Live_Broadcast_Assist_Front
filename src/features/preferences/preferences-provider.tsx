"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { locales, translate, type Locale, type MessageKey } from "./i18n";

export const themes = ["system", "light", "dark"] as const;
export type Theme = (typeof themes)[number];
type ResolvedTheme = Exclude<Theme, "system">;

type Preferences = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
};

const PreferencesContext = createContext<Preferences>({
  locale: "ko",
  setLocale: () => undefined,
  theme: "system",
  setTheme: () => undefined,
  resolvedTheme: "light",
});
const LOCALE_KEY = "live-purchase:locale";
const THEME_KEY = "live-purchase:theme";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("ko");
  const [theme, setTheme] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_KEY);
    const storedTheme = window.localStorage.getItem(THEME_KEY);
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const sync = () => setSystemTheme(media.matches ? "dark" : "light");
    const hydrate = window.setTimeout(() => {
      if (locales.includes(storedLocale as Locale)) setLocale(storedLocale as Locale);
      if (themes.includes(storedTheme as Theme)) setTheme(storedTheme as Theme);
      if (media) sync();
    }, 0);
    media?.addEventListener("change", sync);
    return () => {
      window.clearTimeout(hydrate);
      media?.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      resolvedTheme: theme === "system" ? systemTheme : theme,
    }),
    [locale, theme, systemTheme],
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

export function useI18n() {
  const { locale, setLocale } = usePreferences();
  return {
    locale,
    setLocale,
    t: (key: MessageKey, values?: Record<string, string | number>) =>
      translate(locale, key, values),
  };
}
