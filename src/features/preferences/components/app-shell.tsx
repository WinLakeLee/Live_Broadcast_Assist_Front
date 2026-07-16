"use client";

import Link from "next/link";

import { PreferencesControls } from "./preferences-controls";
import { useI18n } from "../preferences-provider";

export function AppShell({
  brandName,
  children,
}: {
  brandName: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <header className="site-header">
        <Link className="brand" href="/">
          <b>●</b> {brandName}
        </Link>
        <nav className="header-actions" aria-label="Primary">
          <Link className="header-link" href="/orders/lookup">
            {t("nav.orderLookup")}
          </Link>
          <PreferencesControls />
        </nav>
      </header>
      {children}
      <footer className="footer">
        <Link href="/privacy">{t("footer.privacy")}</Link>
        <Link href="/terms">{t("footer.terms")}</Link>
        <p>{t("footer.disclaimer")}</p>
      </footer>
    </>
  );
}
