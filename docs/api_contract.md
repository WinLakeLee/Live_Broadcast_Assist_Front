# Live Broadcast Assist 공통 API 계약

- 계약 버전: `1.0.0`
- 기준일: `2026-07-15`
- 기준 저장소: `Live_Broadcast_Assist/docs/api_contract.md`
- 적용 대상: FastAPI 백엔드와 `Live_Broadcast_Assist_Front` Next.js 프런트

이 문서는 두 애플리케이션 사이의 단일 계약 원본이다. 구현 코드, 프런트 Zod 스키마,
테스트 mock, 다른 설명 문서가 이 문서와 다르면 이 문서를 기준으로 함께 수정한다.

## 1. 변경 규칙

1. API를 변경할 때 백엔드 코드보다 이 문서의 계약 버전과 내용을 먼저 변경한다.
2. 백엔드 응답, 프런트 타입·Zod 스키마, 양쪽 테스트 fixture를 같은 작업에서 변경한다.
3. 필드 삭제·이름/타입 변경, 필수 필드 추가, URL·헤더 변경은 major 버전을 올린다.
4. 선택 필드나 새 endpoint처럼 기존 소비자가 무시할 수 있는 추가는 minor 버전을 올린다.
5. 설명·예시·오탈자만 바꾸면 patch 버전을 올린다.
6. 테스트 mock은 임의의 간소화 응답을 만들지 않고 이 문서의 envelope와 중첩 구조를 그대로 사용한다.
7. 실제 백엔드를 호출하는 consumer contract smoke test 없이 “연동 완료”로 표시하지 않는다.

## 2. 공통 전송 규약

- API base URL에는 경로·query·fragment를 붙이지 않는다. 예: `https://api.example.com`
- 요청과 응답은 UTF-8 JSON이며 요청 body가 있으면 `Content-Type: application/json`을 사용한다.
- 브라우저 요청은 `credentials: omit`, `Accept: application/json`, `cache: no-store`를 사용한다.
- 금액은 원 단위 정수, 수량은 정수, 시각은 timezone이 포함된 ISO 8601 문자열이다.
- 정의되지 않은 요청 필드는 `422`로 거부한다. 응답 소비자는 호환 가능한 새 필드는 무시할 수 있다.
- `null`은 이 문서에서 명시한 경우에만 사용한다. 현재 공개 응답은 `null` 대신 빈 문자열·빈 배열·빈 객체를 사용한다.

### 성공 envelope

```json
{
  "status": "success",
  "code": "PRODUCTS",
  "message": "판매 상품입니다.",
  "data": {}
}
```

### 오류 envelope

```json
{
  "status": "error",
  "code": "STATE_CONFLICT",
  "message": "가격 또는 재고가 변경되었습니다. 금액을 다시 확인해 주세요.",
  "data": {}
}
```

검증 오류만 `data.errors`를 포함할 수 있다.

```json
{
  "status": "error",
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed.",
  "data": {
    "errors": [{ "field": "push_token", "type": "string_too_short" }]
  }
}
```

주요 상태 코드는 다음과 같다.

| HTTP | 의미 | 프런트 처리 |
|---:|---|---|
| 403 | Turnstile 또는 입장권 실패 | 토큰을 재사용하지 않고 해당 단계부터 다시 진행 |
| 404 | 대기표·주문·조회키 불일치 | 존재 여부를 구분하지 않는 일반 메시지 표시 |
| 409 | 견적·재고·상태 충돌 | 기존 견적 폐기 후 새 견적과 사용자 재확인 |
| 422 | 요청 스키마 위반 | 필드 오류 수정. 견적 관련이면 기존 견적 폐기 |
| 429 | 호출 제한 | 노출된 `Retry-After` 이후 재시도 |
| 503 | 대기실·외부 의존성 일시 장애 | `Retry-After` 또는 지수 backoff 적용 |

## 3. 고정 wire 헤더와 CORS

아래 이름은 두 구현 사이의 고정 wire 계약이다. 백엔드 설정에서 이름을 바꾸려면
major 계약 변경과 프런트 동시 배포가 필요하다.

| 헤더 | 용도 |
|---|---|
| `X-Waiting-Room-Ticket` | 대기표 ID |
| `X-Waiting-Room-Token` | 대기표 비밀 토큰 |
| `X-Order-Token` | 주문 비밀 조회키 |
| `X-Admin-API-Key` | 관리자 원본 API 키 |

FastAPI CORS는 다음을 허용해야 한다.

- Origin: 배포된 프런트의 정확한 Origin. 운영환경 와일드카드 금지
- Methods: `GET`, `POST`, `PUT`, `OPTIONS`
- Request headers: `Content-Type`와 위 표의 헤더
- Exposed response headers: `Retry-After`, `X-Request-ID`
- Credentials: 허용하지 않음

## 4. 공통 자료형

### Product

```json
{
  "product_name": "상품A",
  "unit_price": 12000,
  "stock_limit": 100,
  "reserved_quantity": 25,
  "available_quantity": 75,
  "active": true,
  "display_order": 1
}
```

- `unit_price`: 1 이상의 정수
- `stock_limit`, `reserved_quantity`, `available_quantity`: 0 이상의 정수
- `display_order`: 0~1,000,000 정수

### OrderItem

```json
{ "product_name": "상품A", "quantity": 2 }
```

동일 요청 안에서 `product_name`은 중복될 수 없다.

### Courier

```json
{
  "provider": "cu_lotte",
  "display_name": "CU(롯데택배)",
  "tracking_url": "https://www.lotteglogis.com/home/reservation/tracking/index/"
}
```

`tracking_url`은 빈 문자열 또는 자격정보·fragment가 없는 절대 HTTPS URL이다.

## 5. 대기실

### `POST /waiting-room/tickets`

요청 body는 없다.

성공 `data`:

```json
{
  "enabled": true,
  "status": "waiting",
  "ticket_id": "0123456789abcdef0123456789abcdef",
  "ticket_token": "secret-waiting-token",
  "position": 18,
  "retry_after_seconds": 3
}
```

- `status`: `waiting` 또는 `ready`
- `position`, `retry_after_seconds`: 0 이상의 숫자
- 대기실이 꺼진 경우 `enabled=false`, `status=ready`, 빈 ID·토큰, 위치·재시도 시간 0

### `GET /waiting-room/tickets/{ticket_id}`

요청 헤더: `X-Waiting-Room-Token`

성공 `data`:

```json
{
  "enabled": true,
  "status": "ready",
  "position": 0,
  "retry_after_seconds": 300
}
```

- `status`: `waiting`, `ready`, `processing`, `expired`
- `expired`와 비활성 대기실은 `retry_after_seconds=0`일 수 있다.
- `processing`은 동일 입장권으로 주문 처리 중임을 뜻하며 새 주문을 보내면 안 된다.

## 6. 상품과 견적

### `GET /api/products`

대기실이 활성화되면 두 대기실 헤더가 필요하다.

성공 `data`는 배열 자체가 아니라 `products` 객체로 감싼다.

```json
{
  "products": [
    {
      "product_name": "상품A",
      "unit_price": 12000,
      "stock_limit": 100,
      "reserved_quantity": 25,
      "available_quantity": 75,
      "active": true,
      "display_order": 1
    }
  ]
}
```

### `POST /orders/quote`

대기실이 활성화되면 두 대기실 헤더가 필요하다.

요청:

```json
{
  "stock_policy": "partial",
  "items": [{ "product_name": "상품A", "quantity": 2 }]
}
```

`stock_policy`는 `partial` 또는 `all_or_nothing`이다.

성공 `data`:

```json
{
  "payment_amount": 24000,
  "quote_token": "server-signed-opaque-token",
  "expires_at": "2026-07-15T10:05:00+00:00",
  "lines": [
    {
      "product_name": "상품A",
      "quantity": 2,
      "unit_price": 12000,
      "line_amount": 24000,
      "available_quantity": 75,
      "accepted": true
    }
  ]
}
```

프런트는 금액이나 토큰을 재계산·해석하지 않는다. `accepted=false` 줄도 제거하지 않고
사용자에게 표시한다.

## 7. 주문

### `POST /orders`

대기실이 활성화되면 두 대기실 헤더가 필요하다.

요청:

```json
{
  "buyer_name": "홍길동",
  "phone": "010-1234-5678",
  "address": "서울특별시 중구 ...",
  "push_token": "",
  "stock_policy": "partial",
  "quoted_amount": 24000,
  "quote_token": "server-signed-opaque-token",
  "captcha_token": "turnstile-response-token",
  "items": [{ "product_name": "상품A", "quantity": 2 }]
}
```

- `push_token`은 필드 자체는 필수지만 값은 선택이다. 알림 미동의·미지원 브라우저는 빈 문자열을 보낸다.
- 비어 있지 않은 `push_token`은 16~4096자다.
- `quote_token`, 품목, 수량, 정책, 금액은 바로 전 견적과 정확히 같아야 한다.
- 응답을 받지 못한 timeout은 결과가 불명확하므로 같은 요청을 자동 재전송하지 않는다.

성공 `data`:

```json
{
  "order_reference": "0123456789abcdef0123456789abcdef",
  "order_token": "secret-order-lookup-token",
  "payment_amount": 24000,
  "accepted_count": 1,
  "cancelled_count": 0
}
```

`order_token`은 이 응답에서만 원문으로 제공한다.

### `POST /orders/{order_reference}/depositor`

요청 헤더: `X-Order-Token`

요청:

```json
{
  "depositor_name": "홍길동",
  "bank_name": "국민은행"
}
```

성공 `data`는 주문 상태와 관계없이 네 필드를 모두 포함한다.

```json
{
  "status": "결제대기",
  "expected_amount": 24000,
  "paid_amount": 0,
  "difference": 24000
}
```

이 응답에는 `courier`와 주문 품목을 넣지 않는다. 배송 정보가 필요하면 인증된 주문 상태를 조회한다.

### `POST /orders/{order_reference}/push-token`

요청 헤더: `X-Order-Token`

요청:

```json
{ "push_token": "new-device-token-at-least-16-characters" }
```

성공 `data`: `{}`

### `GET /orders/{order_reference}/status`

요청 헤더: `X-Order-Token`

성공 `data`:

```json
{
  "order_reference": "0123456789abcdef0123456789abcdef",
  "status": "결제완료",
  "created_at": "2026-07-15T10:00:00+00:00",
  "buyer_name": "홍**",
  "phone": "********5678",
  "address": "서울특별시 중구 ***",
  "expected_amount": 24000,
  "paid_amount": 24000,
  "difference": 0,
  "courier": {
    "provider": "cu_lotte",
    "display_name": "CU(롯데택배)",
    "tracking_url": "https://www.lotteglogis.com/home/reservation/tracking/index/"
  },
  "items": [
    {
      "product_name": "상품A",
      "quantity": 2,
      "price": 24000,
      "status": "결제완료",
      "cancellation_reason": "",
      "tracking_number": ""
    }
  ]
}
```

잘못된 주문번호와 잘못된 조회키는 모두 같은 `404 NOT_FOUND`로 응답한다.

## 8. 관리자 상품 API

관리자 키는 화면 메모리에서만 보관하고 URL·쿠키·브라우저 저장소·공개 환경변수에 넣지 않는다.

### `GET /admin/api/products`

요청 헤더: `X-Admin-API-Key`

성공 `data`는 공개 상품 API와 동일하게 `products`로 감싼다.

```json
{ "products": [] }
```

### `PUT /admin/api/products`

요청 헤더: `X-Admin-API-Key`

요청:

```json
{
  "product_name": "상품A",
  "unit_price": 12000,
  "stock_limit": 100,
  "active": true,
  "display_order": 1
}
```

성공 `data`는 저장된 `Product` 하나다. `unit_price`는 1 이상이며 `stock_limit`가 현재
예약수량보다 작으면 `409`다.

## 9. 보안 저장 규칙

- 대기표 토큰, `quote_token`, 주문 조회키, 푸시 토큰, 배송 개인정보는 URL·cookie·`localStorage`·analytics·console에 넣지 않는다.
- 탭 복구가 필요할 때만 `sessionStorage`를 사용하고 완료·취소·만료·409·관련 422에서 즉시 삭제한다.
- 은행 웹훅 비밀값, 관리자 키 해시, Turnstile secret, DB·Redis URL은 프런트에 전달하지 않는다.
- 푸시는 상태 변경 신호일 뿐이며 최종 상태는 `GET /orders/{reference}/status`로 확인한다.

## 10. 계약 검증 체크리스트

양쪽 변경을 완료하려면 다음을 모두 확인한다.

- 백엔드 endpoint 테스트가 이 문서의 정확한 envelope와 중첩 구조를 검증한다.
- 프런트 Zod schema가 이 문서의 성공 예시를 통과시키고 잘못된 중첩 구조를 거부한다.
- Playwright mock이 `data.products` 등 실제 구조를 그대로 사용한다.
- 대기실 비활성화와 만료의 `retry_after_seconds=0` fixture가 있다.
- 푸시 토큰이 빈 주문과 유효 토큰 주문을 모두 검증한다.
- 입금자 등록 응답과 전체 주문 상태 응답을 별도 schema로 검증한다.
- 관리자 상품 단가·재고·표시순서 경계값이 백엔드와 프런트에서 일치한다.
- 로컬 또는 CI smoke test가 mock 없이 FastAPI와 Next.js를 함께 실행해 상품 조회 → 견적까지 확인한다.

## 11. 1.0.0 적용 시 기존 구현 확인 항목

이 버전을 처음 적용할 때 다음 알려진 불일치를 해소해야 한다.

- 프런트 상품 목록 schema와 mock을 `data.products` 구조로 변경
- 프런트 대기실 재시도 시간을 0 이상으로 허용
- 백엔드 주문 생성에서 빈 `push_token` 허용
- 입금자 등록 응답이 항상 `status`, `expected_amount`, `paid_amount`, `difference`를 반환하도록 통일
- 입금자 등록용 schema와 전체 주문 상태용 schema를 분리

