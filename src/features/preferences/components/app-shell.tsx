"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-transparent">
      {/* Glassmorphic Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/70 px-4 py-4 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row sm:gap-0">
          <Link
            className="flex items-center gap-2 text-xl font-extrabold tracking-tight transition-transform hover:scale-[1.02]"
            href="/"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_15px_rgba(var(--color-primary),0.5)]">
              <Zap size={16} fill="currentColor" />
            </div>
            <span>{brandName}</span>
          </Link>
          <nav
            className="flex w-full flex-wrap items-center justify-between gap-4 sm:w-auto sm:justify-end"
            aria-label="Primary"
          >
            <Link
              className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              href="/orders/lookup"
            >
              {t("nav.orderLookup")}
            </Link>
            <PreferencesControls />
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1">
        {children}
      </div>

      {/* Modern Minimal Footer */}
      <footer className="mt-16 w-full border-t border-border/50 bg-card-muted/30 py-8 text-sm">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-4 sm:flex-row sm:gap-8">
          <Link className="font-medium transition-colors hover:text-primary" href="/privacy">
            {t("footer.privacy")}
          </Link>
          <Link className="font-medium transition-colors hover:text-primary" href="/terms">
            {t("footer.terms")}
          </Link>
          <p className="mt-4 text-center text-muted sm:mt-0">{t("footer.disclaimer")}</p>
        </div>
      </footer>
    </div>
  );
}
