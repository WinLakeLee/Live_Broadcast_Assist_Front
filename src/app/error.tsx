"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main className="shell narrow"><section className="card error-card" role="alert"><h1>화면을 불러오지 못했습니다</h1><p>민감한 정보는 전송하지 않았습니다. 잠시 후 다시 시도해 주세요.</p><button className="button" onClick={reset}>다시 시도</button></section></main>; }
