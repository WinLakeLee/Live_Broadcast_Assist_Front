export type PushTokenDetail = { token: string };

export async function requestPushToken(timeoutMs = 5_000): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  return new Promise(resolve => {
    const receive = (event: Event) => {
      const token = (event as CustomEvent<PushTokenDetail>).detail?.token;
      cleanup(); resolve(typeof token === "string" && token.trim() ? token : null);
    };
    const timer = window.setTimeout(() => { cleanup(); resolve(null); }, timeoutMs);
    const cleanup = () => { clearTimeout(timer); window.removeEventListener("live-purchase:push-token", receive); };
    window.addEventListener("live-purchase:push-token", receive, { once: true });
    window.dispatchEvent(new CustomEvent("live-purchase:request-push-token"));
  });
}
