import type { Metadata } from "next";
export const metadata: Metadata = { title: "구매·취소 정책" };
export default function TermsPage() {
  return (
    <main className="shell narrow">
      <div className="page-head">
        <span className="eyebrow">ORDER POLICY</span>
        <h1>구매·재고·계좌이체 정책</h1>
      </div>
      <article className="card">
        <h2>재고와 견적</h2>
        <p>
          화면의 구매 가능 수량과 견적은 안내이며, 주문 확정 시 서버가 가격과
          재고를 다시 판정합니다. 견적 확인만으로 재고가 예약되지 않습니다.
        </p>
        <h2>재고 부족</h2>
        <p>
          부분 구매를 선택하면 확보 가능한 상품만 주문됩니다. 전체 구매를
          선택하면 하나라도 부족할 때 전체 주문이 취소됩니다.
        </p>
        <h2>계좌이체</h2>
        <p>
          주문 완료 화면의 실제 입금 예정액을 확인한 뒤 입금하세요. 입금정보
          등록은 결제 완료를 보장하지 않으며 서버의 대조 결과를 따릅니다.
        </p>
        <h2>취소·만료</h2>
        <p>
          주문 만료 상태에서는 입금하지 마세요. 취소·환불의 상세 절차는 고객지원
          안내를 따릅니다.
        </p>
      </article>
    </main>
  );
}
