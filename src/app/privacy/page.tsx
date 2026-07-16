import type { Metadata } from "next";
export const metadata: Metadata = { title: "개인정보 수집·이용 안내" };
export default function PrivacyPage() {
  return (
    <main className="shell narrow">
      <div className="page-head">
        <span className="eyebrow">PRIVACY</span>
        <h1>개인정보 수집·이용 안내</h1>
      </div>
      <article className="card">
        <p className="notice warning">
          <strong>운영 전 필수:</strong> 아래 자리표시자를 실제 사업자의
          개인정보 처리 내용으로 교체해야 합니다.
        </p>
        <h2>수집 항목</h2>
        <p>주문자명, 전화번호, 배송주소, 입금자명, 은행명</p>
        <h2>이용 목적</h2>
        <p>주문 접수, 입금 확인, 상품 배송, 고객 문의 처리</p>
        <h2>라이브 채팅</h2>
        <p>
          자체 채팅의 공개 닉네임과 메시지, 신고 사유를 채팅 표시와 운영·신고 처리에
          사용하며 기본 24시간 후 삭제합니다. 채팅 세션은 주문자 개인정보와 연결하지 않습니다.
        </p>
        <p>
          이 서비스는 YouTube API Services를 사용해 공식 라이브 채팅을 읽기 전용으로
          표시합니다. YouTube 닉네임·메시지는 출처를 표시하고 최대 24시간만 임시 보관합니다.
          자세한 내용은 <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google 개인정보처리방침</a>을 확인하세요.
        </p>
        <h2>가명정보의 통계 이용</h2>
        <p>
          결제 완료·미환불 주문의 구매일, 상품, 수량, 금액, 상품 분류를 판매 추이와
          선호도 통계에 이용할 수 있습니다. 이름과 전화번호는 분석 전용 비가역 HMAC
          가명키로 분리하며 이름·전화번호·주소·주문번호를 통계 응답에 포함하지 않습니다.
        </p>
        <p>
          소규모 분류 집단은 표시하지 않고, 가명정보와 배송 원본을 결합하거나 개인을
          재식별하는 행위를 금지합니다. 처리 목적·기간·접근자를 기록하고 재식별 가능
          정보가 생성되면 처리를 즉시 중단하여 회수·파기합니다.
        </p>
        <h2>보유 기간</h2>
        <p>[관계 법령과 사업자 정책에 따른 실제 보유 기간을 입력하세요.]</p>
        <p>
          배송용 개인정보와 가명 통계정보의 보유기간을 각각 정하고, 목적 달성 또는
          기간 종료 시 복구할 수 없게 파기합니다.
        </p>
        <h2>동의 거부</h2>
        <p>
          동의를 거부할 수 있으나 배송이 필요한 상품 구매가 제한될 수 있습니다.
        </p>
      </article>
    </main>
  );
}
