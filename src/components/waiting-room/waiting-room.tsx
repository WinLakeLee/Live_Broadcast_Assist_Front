"use client";
import { Clock3, Radio, RefreshCw } from "lucide-react";
import { useWaitingRoom } from "@/hooks/use-waiting-room";

export function WaitingRoom() {
  const { view, enter, reissue } = useWaitingRoom();
  return <section className="hero-card">
    <div className="live-mark"><Radio aria-hidden="true" /> LIVE ORDER</div>
    {view.kind === "idle" && <><h1>방송 속 상품을<br/><em>안전하게 주문하세요</em></h1><p className="lead">접속자가 많을 때는 순서대로 구매 화면에 연결해 드립니다.</p><button className="button primary wide" onClick={enter}>구매 대기줄 입장</button></>}
    {view.kind === "issuing" && <div role="status" className="waiting"><RefreshCw className="spin" aria-hidden="true"/><h1>대기표를 받고 있습니다</h1><p>잠시만 기다려 주세요.</p></div>}
    {view.kind === "waiting" && <div role="status" aria-live="polite" className="waiting"><Clock3 aria-hidden="true"/><p>현재</p><strong>{view.position.toLocaleString("ko-KR")}번째</strong><h1>로 기다리고 있습니다</h1><div className="progress"><span /></div><p>새로고침하지 않아도 자동으로 연결됩니다.<br/>약 {view.retry}초 간격으로 순서를 확인합니다.</p></div>}
    {view.kind === "expired" && <div role="alert" className="waiting"><h1>대기표가 만료되었습니다</h1><p>새 대기표를 받아 다시 입장해 주세요.</p><button className="button primary" onClick={reissue}>새 대기표 받기</button></div>}
    {view.kind === "error" && <div role="alert" className="waiting"><h1>연결이 원활하지 않습니다</h1><p>{view.message}</p>{view.retry && <p>{view.retry}초 후 다시 시도할 수 있습니다.</p>}<button className="button" onClick={enter}>다시 시도</button></div>}
  </section>;
}
