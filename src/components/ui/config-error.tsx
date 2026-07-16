"use client";

import { useI18n } from "@/features/preferences/preferences-provider";

export function ConfigError({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <main className="shell">
      <section className="card error-card" role="alert">
        <span className="eyebrow">{t("config.eyebrow")}</span>
        <h1>{t("config.title")}</h1>
        <p>{message}</p>
        <p>{t("config.help")}</p>
      </section>
    </main>
  );
}
