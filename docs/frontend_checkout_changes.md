# 프런트 반영용 변경 요약 — 구매내역 확인·CU(롯데택배)

이 문서는 기존 프런트에 이번 변경만 반영하기 위한 작업 체크리스트다. 전체 계약은 `frontend_api.md`, 새 프로젝트 구현 기준은 `nextjs_frontend_prompt.md`를 따른다.

## 1. 깨지는 API 변경

`POST /orders/quote` 응답 `data`에 다음 값이 추가됐다.

```ts
type QuoteData = {
  payment_amount: number;
  quote_token: string;
  expires_at: string;
  lines: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    line_amount: number;
    available_quantity: number;
    accepted: boolean;
  }>;
};
```

`POST /orders`에는 견적에서 받은 `quote_token`을 반드시 추가한다.

```json
{
  "buyer_name": "홍길동",
  "phone": "010-1234-5678",
  "address": "서울특별시 중구 ...",
  "push_token": "FCM_OR_APNS_GATEWAY_DEVICE_TOKEN",
  "stock_policy": "partial",
  "quoted_amount": 24000,
  "quote_token": "server_signed_short_lived_quote",
  "captcha_token": "TURNSTILE_RESPONSE_TOKEN",
  "items": [{"product_id": "prd_01JZ8R7F6K2M4N8Q1T3V5W7X9Y", "quantity": 2}]
}
```

토큰 누락은 `422`, 만료·변조·품목/수량/금액 불일치는 `409`다. `409`에서 기존 토큰으로 자동 재전송하지 말고 상품과 견적을 다시 받아 변경 내용을 보여준 뒤 재확정한다.

`GET /orders/{order_reference}/status` 응답에는 다음 택배사 표시 정보가 추가됐다.

```ts
courier: {
  provider: 'cu_lotte';
  display_name: 'CU(롯데택배)';
  tracking_url: string;
};
```

운송장 번호가 생기면 `display_name`, `tracking_number`, 공식 조회 페이지 링크를 함께 표시한다. 조회 링크에는 주문 조회키나 개인정보를 붙이지 않는다.

## 2. 화면과 상태 흐름

```text
/purchase 상품·수량 선택 + 배송정보 입력
  → POST /orders/quote
  → /purchase/review 구매내역 확인
  → POST /orders 최종 확정
  → /purchase/complete 입금 안내·입금정보 등록
  → 앱 푸시 수신 후 주문 상태 재조회
```

`/purchase/review`에는 다음 항목이 모두 보여야 한다.

- `구매목록 → 구매내역 확인 → 입금 → 배송` 진행 표시
- 구매 상품명, 단가, 수량, 줄별 소계
- `accepted=false`인 제외 예정 상품과 재고 부족 안내
- `partial`/`all_or_nothing` 재고 처리 정책
- 수취인명, 전화번호, 전체 주소
- 배송사 `CU(롯데택배)`
- 최종 입금 예정액
- `수정` 및 한 개의 `구매내역 확정` 버튼

견적은 재고 예약이 아니라고 표시한다. `expires_at`이 지나면 확정 버튼을 끄고 새 견적을 받는다. 수정 화면으로 돌아간 뒤에는 기존 견적을 버린다.

## 3. 토큰·알림 처리

- `quote_token`과 배송 개인정보는 URL, 로그, analytics, `localStorage`에 넣지 않는다.
- 페이지 분리가 필요하면 현재 탭의 메모리 상태를 우선하고, 새로고침 복구가 꼭 필요할 때만 `sessionStorage`를 사용해 탭 종료 시 제거한다.
- 푸시 권한은 사용자 동작 뒤 요청하고, FCM/APNs 게이트웨이 토큰을 최종 주문 body의 `push_token`으로 전달한다.
- 푸시는 상태 변경 신호일 뿐 성공의 원본이 아니다. 푸시 탭 시 `X-Order-Token`으로 주문 상태 API를 다시 조회한다.
- 제출 중 버튼을 비활성화하고 한 번의 사용자 동작에서 `POST /orders`를 두 번 호출하지 않는다.

## 4. 완료 기준

- 정상 견적이 `/purchase/review`에서 단가·수량·소계·총액으로 표시된다.
- 재고 부족 줄과 부분구매/전체취소 차이가 명확히 표시된다.
- 견적 만료와 서버 `409`가 새 견적 및 사용자 재확인으로 이어진다.
- 주문 요청에 서버가 준 `quote_token`이 그대로 포함된다.
- 배송 상태 화면에 `CU(롯데택배)`와 운송장 번호가 표시된다.
- 주문 조회키, 견적 토큰, 푸시 토큰, 개인정보가 URL·console·analytics에 남지 않는다.
- 모바일 화면과 키보드/스크린리더에서 수정·확정·오류 안내를 사용할 수 있다.
