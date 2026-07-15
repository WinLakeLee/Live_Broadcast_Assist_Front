import { AlertTriangle, CheckCircle2, Clock3, PackageCheck } from "lucide-react";
import type { OrderStatusData, PaymentMatchData } from "@/lib/api/contracts";
import { describeDifference, formatDateTime, formatMoney } from "@/lib/format";

const copy: Record<string,{title:string;detail:string;kind:"ok"|"warn"|"danger"}>={
  "결제대기":{title:"입금을 기다리고 있습니다",detail:"입금 예정액과 등록한 입금정보를 다시 확인해 주세요.",kind:"warn"},
  "입금부족":{title:"입금액이 부족합니다",detail:"표시된 부족액을 확인해 주세요.",kind:"warn"},
  "입금초과":{title:"예정액보다 많이 입금되었습니다",detail:"자동 완료되지 않으며 관리자 확인이 필요합니다.",kind:"warn"},
  "입금자불일치":{title:"입금정보가 일치하지 않습니다",detail:"입금자명 또는 은행을 확인하고 고객지원에 문의해 주세요.",kind:"danger"},
  "결제완료":{title:"입금 확인이 완료되었습니다",detail:"상품별 처리 상태를 확인해 주세요.",kind:"ok"},
  "주문만료":{title:"주문이 만료되었습니다",detail:"이 주문에는 입금하지 마세요.",kind:"danger"},
  "재고취소":{title:"일부 상품이 재고 부족으로 취소되었습니다",detail:"취소 상품은 입금 대상에서 제외됩니다.",kind:"warn"},
  "배송준비":{title:"배송을 준비하고 있습니다",detail:"운송장이 등록되면 아래에 표시됩니다.",kind:"ok"},
  "환불완료":{title:"환불이 완료되었습니다",detail:"실제 계좌 반영 시간은 금융기관에 따라 다를 수 있습니다.",kind:"ok"},
};
export function PaymentStatus({data}:{data:OrderStatusData|PaymentMatchData}){const item=copy[data.status]??{title:data.status,detail:"서버에서 확인한 현재 상태입니다.",kind:"warn" as const};const full="items" in data;return <section className="card" aria-live="polite"><span className={`status-badge ${item.kind==="ok"?"ok":""}`}>{item.kind==="ok"?<CheckCircle2 size={15}/>:item.kind==="danger"?<AlertTriangle size={15}/>:<Clock3 size={15}/>} {data.status}</span><h2>{item.title}</h2><p>{item.detail}</p><div className="summary-row"><span>입금 예정액</span><strong>{formatMoney(data.expected_amount)}</strong></div><div className="summary-row"><span>확인된 입금액</span><strong>{formatMoney(data.paid_amount)}</strong></div><div className="summary-row"><span>차액</span><strong>{describeDifference(data.difference)}</strong></div>{full&&<><p className="muted">주문일 {formatDateTime(data.created_at)}</p><h3><PackageCheck size={19}/> 상품 상태</h3>{data.items.map((line,i)=><div className="quote-line" key={`${line.product_name}-${i}`}><span><strong>{line.product_name}</strong> × {line.quantity}<br/><small>{line.status}{line.cancellation_reason&&` · ${line.cancellation_reason}`}{line.tracking_number&&` · 운송장 ${line.tracking_number}`}</small></span><strong>{formatMoney(line.price)}</strong></div>)}</>}</section>}
