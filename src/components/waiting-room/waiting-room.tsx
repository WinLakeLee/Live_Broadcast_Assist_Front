"use client";
import { Clock3, Radio, RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { useWaitingRoom } from "@/hooks/use-waiting-room";

export function WaitingRoom() {
  const { view, enter, reissue } = useWaitingRoom();
  
  return (
    <section className="relative mx-auto mt-8 w-full max-w-2xl overflow-hidden rounded-[32px] border border-border/50 bg-card/60 p-8 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] backdrop-blur-xl sm:p-12">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>
      
      <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold tracking-widest text-primary shadow-sm ring-1 ring-primary/20">
        <Radio size={16} className="animate-pulse" aria-hidden="true" /> 
        LIVE ORDER
      </div>
      
      {view.kind === "idle" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
            방송 속 상품을 <br />
            <em className="bg-gradient-to-r from-primary to-focus bg-clip-text font-black text-transparent not-italic drop-shadow-sm">안전하게 주문하세요</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-balance text-lg font-medium text-muted-foreground">
            접속자가 많을 때는 순서대로 구매 화면에 연결해 드립니다.
          </p>
          <button 
            className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-primary-dark px-8 py-5 text-lg font-bold tracking-wide text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/30 active:translate-y-0 sm:w-auto" 
            onClick={enter}
          >
            구매 대기줄 입장하기
          </button>
        </div>
      )}

      {view.kind === "issuing" && (
        <div role="status" className="flex flex-col items-center justify-center py-8 animate-in fade-in duration-500">
          <RefreshCw className="mb-6 animate-spin text-primary" size={48} aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">대기표를 받고 있습니다</h1>
          <p className="mt-3 text-lg text-muted-foreground">잠시만 기다려 주세요...</p>
        </div>
      )}

      {view.kind === "waiting" && (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center py-4 animate-in fade-in zoom-in-95 duration-500">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card shadow-[0_0_30px_rgba(var(--color-focus),0.15)] ring-1 ring-border">
            <Clock3 className="text-focus animate-pulse" size={40} aria-hidden="true" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">현재 나의 대기 순서</p>
          <strong className="my-2 text-6xl font-black tracking-tighter text-foreground drop-shadow-sm sm:text-7xl">
            {view.position.toLocaleString("ko-KR")}
          </strong>
          <h1 className="text-xl font-bold text-muted-foreground">번째로 기다리고 있습니다</h1>
          
          <div className="mt-8 h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-muted/20 relative">
            <div className="absolute inset-0 bg-primary/20"></div>
            <div className="h-full animate-[progress_2s_ease-in-out_infinite] bg-primary rounded-full w-1/3"></div>
          </div>
          
          <p className="mt-8 text-balance text-sm font-medium leading-relaxed text-muted-foreground">
            새로고침하지 않아도 자동으로 연결됩니다.<br />
            <span className="opacity-75">약 {view.retry}초 간격으로 순서를 확인합니다.</span>
          </p>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}} />
        </div>
      )}

      {view.kind === "expired" && (
        <div role="alert" className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-500">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning ring-1 ring-warning/30">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">대기표가 만료되었습니다</h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground">새 대기표를 받아 다시 입장해 주세요.</p>
          <button 
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-warning px-8 py-4 font-bold text-white shadow-lg transition-all hover:bg-warning/90 hover:shadow-warning/30 sm:w-auto" 
            onClick={reissue}
          >
            새 대기표 받기
          </button>
        </div>
      )}

      {view.kind === "error" && (
        <div role="alert" className="flex flex-col items-center justify-center py-6 animate-in fade-in duration-500">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive ring-1 ring-destructive/30">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">연결이 원활하지 않습니다</h1>
          <p className="mt-3 text-balance text-lg font-medium text-muted-foreground">{view.message}</p>
          {view.retry && <p className="mt-2 text-sm text-muted-foreground">{view.retry}초 후 다시 시도할 수 있습니다.</p>}
          <button 
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-card-muted border border-border px-8 py-4 font-bold text-foreground shadow-sm transition-all hover:bg-muted/20 sm:w-auto" 
            onClick={enter}
          >
            다시 시도
          </button>
        </div>
      )}
    </section>
  );
}
