"use client";
import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { getPublicEnv } from "@/lib/env";

export type TurnstileHandle = { reset: () => void };
export const TurnstileWidget = forwardRef<TurnstileHandle, { onToken: (token: string) => void }>(function TurnstileWidget({ onToken }, ref) {
  const container = useRef<HTMLDivElement>(null); const widgetId = useRef<string | undefined>(undefined); const [loaded, setLoaded] = useState(false);
  const sitekey = getPublicEnv().turnstileSiteKey;
  const reset = useCallback(() => { onToken(""); if (widgetId.current) window.turnstile?.reset(widgetId.current); }, [onToken]);
  useImperativeHandle(ref, () => ({ reset }), [reset]);
  const render = useCallback(() => {
    if (!sitekey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, { sitekey, theme: "light", callback: onToken, "expired-callback": reset, "error-callback": reset });
  }, [sitekey, onToken, reset]);
  useEffect(() => { if (loaded) render(); return () => { if (widgetId.current) window.turnstile?.remove(widgetId.current); widgetId.current = undefined; }; }, [loaded, render]);
  if (!sitekey && process.env.NODE_ENV !== "production") return <div className="notice warning"><p>로컬 Turnstile 사이트 키가 비어 있습니다.</p><button type="button" className="button" onClick={() => onToken("local-turnstile-test-token")}>로컬 검증 토큰 사용</button></div>;
  return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setLoaded(true)} /><div ref={container} aria-label="사람인지 확인" /></>;
});
