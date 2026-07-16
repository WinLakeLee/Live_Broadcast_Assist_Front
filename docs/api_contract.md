# Live Broadcast Assist 공통 API 계약

- 계약 버전: `1.7.0`
- 기준일: `2026-07-16`
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

두 저장소가 같은 상위 디렉터리에 있으면 `python scripts/check_api_contract_sync.py`로
프런트 사본이 기준 문서와 바이트 단위로 동일한지 검사한다.

## 2. 공통 전송 규약

- API base URL에는 경로·query·fragment를 붙이지 않는다. 예: `https://api.example.com`
- 요청과 응답은 UTF-8 JSON이며 요청 body가 있으면 `Content-Type: application/json`을 사용한다.
- 브라우저 요청은 `credentials: omit`, `Accept: application/json`, `cache: no-store`를 사용한다.
- 금액은 원 단위 정수, 수량은 정수, 시각은 timezone이 포함된 ISO 8601 문자열이다.
- 정의되지 않은 요청 필드는 `422`로 거부한다. 응답 소비자는 호환 가능한 새 필드는 무시할 수 있다.
- `null`은 이 문서에서 명시한 경우에만 사용한다. 현재 공개 응답은 `null` 대신 빈 문자열·빈 배열·빈 객체를 사용한다.

### `GET /healthz`

Cloudflare Tunnel 및 외부 모니터링용 공개 liveness endpoint다. DB·외부 API 상태를 노출하지 않는다.

```json
{"status":"success","code":"HEALTHY","message":"Service is running.","data":{}}
```

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
| `X-Purchase-Offer-Token` | 경매/역경매 제안 비밀 조회키 |
| `X-Chat-Session-Token` | 자체 채팅 쓰기 세션 토큰 |
| `X-Admin-API-Key` | 관리자 원본 API 키 |

FastAPI CORS는 다음을 허용해야 한다.

- Origin: 배포된 프런트의 정확한 Origin. 운영환경 와일드카드 금지
- Methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
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
  "display_order": 1,
  "purchase_method": "fixed_price",
  "reserve_price": 0,
  "bid_increment": 0,
  "sale_starts_at": "",
  "sale_ends_at": "",
  "sku": "SKU-001",
  "category_major": "식품",
  "category_minor": "과일",
  "category_detail": "사과",
  "expected_arrival_date": "2026-07-20",
  "arrival_date": "",
  "inventory_status": "scheduled",
  "purchase_flow": "checkout",
  "catalog": {
    "catalog_item_id": "CAT-APPLE-001",
    "brand_name": "산지직송",
    "manufacturer": "예시농원",
    "model_number": "",
    "product_type": "FRESH_FOOD",
    "description": "상품 상세 설명",
    "detail_category_id": "c_1234",
    "parent_sku": "APPLE-PARENT",
    "barcode": "8800000000001",
    "option_values": {"중량":"2kg"},
    "attributes": {"원산지":"대한민국"},
    "image_urls": ["https://cdn.example.com/apple.jpg"]
  },
  "listing": {
    "listing_id": "lst_1234",
    "seller_id": "direct",
    "variant_sku": "SKU-001",
    "marketplace_code": "LIVE_COMMERCE",
    "currency": "KRW",
    "condition_type": "new",
    "status": "active"
  },
  "inventory": [{
    "location_code": "MAIN",
    "on_hand_quantity": 100,
    "reserved_quantity": 25,
    "available_quantity": 75,
    "inbound_quantity": 20,
    "expected_arrival_date": "2026-07-20",
    "arrival_date": ""
  }]
}
```

- `unit_price`: 1 이상의 정수
- `stock_limit`, `reserved_quantity`, `available_quantity`: 0 이상의 정수
- `display_order`: 0~1,000,000 정수
- `purchase_method`: `fixed_price`, `auction`, `reverse_auction`, `blind_auction`
- `purchase_flow`: `fixed_price`이면 `checkout`, 그 외에는 `offer`
- 경매 계열은 timezone이 포함된 시작·종료 시각과 1 이상의 `bid_increment`가 필수다.
- `unit_price`는 고정가 또는 경매 시작가다. `reserve_price`는 일반/블라인드 경매의
  낙찰 하한 또는 역경매의 가격 하한이다.
- 분류는 대분류→소분류→상세분류 순서이며 SKU와 입고예정일·실입고일을 함께 관리한다.
  `inventory_status`는 `unscheduled`, `scheduled`, `arrived` 중 서버가 계산한 값이다.
- `catalog`은 상품 자체의 공통 정보, `listing`은 판매자별 판매 조건과 SKU,
  `inventory`는 창고/입고 위치별 수량이다. 마이그레이션 전 레거시 상품은
  `catalog`과 `listing`이 `null`, `inventory`가 빈 배열일 수 있다.
- `condition_type`은 `new`, `used_like_new`, `used_good`, `used_acceptable` 중 하나다.

### `GET /api/broadcast`

대기실과 무관한 공개 endpoint다. 프런트는 공급자 URL을 직접 조합하지 않고 이 응답을
iframe `src`로 사용한다. 현재 공급자는 YouTube이며 응답 형태는 다른 플랫폼에도 유지한다.

```json
{
  "status": "success",
  "code": "BROADCAST",
  "message": "방송 임베드 정보입니다.",
  "data": {
    "platform": "youtube",
    "video_id": "video-id",
    "embed_url": "https://www.youtube-nocookie.com/embed/video-id?playsinline=1&rel=0",
    "chat_embed_url": "https://www.youtube.com/live_chat?v=video-id&embed_domain=shop.example.com",
    "watch_url": "https://www.youtube.com/watch?v=video-id",
    "chat": {
      "provider":"youtube",
      "mode":"embedded_live_chat",
      "video_id":"video-id",
      "synchronized_with_video":true,
      "mobile_web_embed":false
    },
    "mobile_chat": {
      "current_mode":"dual_first_party_write_youtube_read",
      "custom_api_available":true,
      "requires_viewer_google_oauth":false,
      "read_api":"/api/chat/messages",
      "write_api":"/api/chat/messages",
      "youtube_source":"liveChatMessages.list",
      "youtube_write_enabled":false,
      "youtube_read_enabled":true
    },
    "capabilities": {
      "video_embed":true,
      "chat_embed":true,
      "chat_embed_mobile_web":false,
      "site_checkout":true,
      "first_party_chat":true,
      "combined_chat_feed":true
    }
  }
}
```

방송 미설정 시 URL은 빈 문자열이고 `video_embed`, `chat_embed`가 `false`다.
`chat_embed_url`은 `BROADCAST_EMBED_ORIGIN`이 유효할 때만 제공한다.
빈 `BROADCAST_VIDEO_ID`는 `YOUTUBE_VIDEO_ID`를 상속하며 영상 iframe, 채팅 iframe,
`chat.video_id`는 항상 동일한 ID를 사용한다. YouTube 정책상 라이브 채팅 iframe은
`embed_domain`이 실제 부모 페이지 도메인과 일치해야 하고 모바일 웹에서는 지원되지 않는다.
프런트는 `chat_embed_mobile_web=false`일 때 모바일에서 `watch_url`로 여는 대체 동선을 제공한다.
모바일 쓰기는 자체 채팅에만 기록되며 YouTube로 재전송하지 않는다. YouTube 채팅은 공식
`liveChatMessages.list` 수신 결과를 읽기 전용으로 같은 피드에 표시하고 출처 배지를 반드시
붙인다. `youtube_read_enabled`는 공식 `YOUTUBE_API_KEY`가 있을 때만 `true`다. YouTube API
데이터는 설정된 단기 보관기간 후 삭제하며 legacy `pytchat` 수신분을 피드에 복제하거나
스크래핑으로 대체하지 않는다.

### 자체·YouTube 통합 채팅 API

#### `POST /api/chat/sessions`

```json
{"nickname":"모바일사용자"}
```

성공 `data`는 `session_id`, 한 번만 반환되는 `session_token`, `nickname`, `expires_at`을
포함한다. 세션은 주문·결제 계정과 연결하지 않으며 기본 24시간 후 만료된다.

#### `GET /api/chat/messages?after={cursor}&limit=100`

```json
{
  "messages":[
    {"message_id":"own_...","source":"first_party","author_name":"모바일사용자","message":"안녕하세요","created_at":"2026-07-16T10:00:00.000000+00:00","can_report":true},
    {"message_id":"yt_...","source":"youtube","author_name":"YouTube 사용자","message":"반갑습니다","created_at":"2026-07-16T10:00:01Z","can_report":false}
  ],
  "next_cursor":"2026-07-16T10:00:01Z|yt_..."
}
```

`source`를 화면에 명시하며 YouTube 메시지는 읽기 전용이다. 최초 조회는 최신 100건,
이후 조회는 응답의 `next_cursor`를 `after`로 보내 새 메시지를 가져온다.

#### `POST /api/chat/messages`

헤더 `X-Chat-Session-Token`과 아래 body가 필요하다.

```json
{"session_id":"0123456789abcdef0123456789abcdef","message":"자체 채팅 메시지"}
```

기본 제한은 메시지 300자, 10초당 5건이다. 세션 만료·차단·잘못된 토큰은 동일한 `404`,
도배 제한은 `429`와 `Retry-After`를 반환한다.

#### 신고·관리자 moderation

- `POST /api/chat/messages/{message_id}/reports`: 자체 메시지만 신고할 수 있다.
- `GET /admin/api/chat/messages`: 신고 수와 작성 세션 ID를 포함한 관리자 moderation 목록이다.
- `DELETE /admin/api/chat/messages/{message_id}`: 메시지를 숨긴다.
- `POST /admin/api/chat/sessions/{session_id}/ban`: 세션을 차단하고 기존 자체 메시지를 숨긴다.
- 자체·YouTube 임시 피드는 기본 24시간 후 삭제한다. 신고 사유도 대상 메시지 삭제 시 함께 삭제한다.

### `POST /api/products/{product_name}/offers`

경매 계열 상품에 익명 구매 제안을 접수한다. 준비된 대기실 헤더가 필요하다.

```json
{"amount":15000,"quantity":1}
```

- `auction`: 첫 제안은 시작가 이상, 이후 제안은 현재 최고가 + 호가 단위 이상
- `reverse_auction`: 시작가 이하에서 내려가며 최저가보다 낮을 수 없음
- `blind_auction`: 다른 제안 가격을 공개하지 않고 최저 낙찰가 이상만 검증
- 고정가 상품은 `409`이며 기존 견적/주문 API를 사용한다.

성공 `data`에는 `offer_reference`, 한 번만 전달되는 `offer_token`, 상품·방식·금액·수량,
`status=accepted`, `sale_ends_at`이 포함된다. 토큰은 주문 토큰과 동일하게 URL·로그에
노출하지 않는다.

### `GET /api/purchase-offers/{offer_reference}`

`X-Purchase-Offer-Token` 헤더가 필수다. 본인의 금액과 수량, 종료 전 `result=pending`,
종료 후 `result=won|lost`를 반환한다. 블라인드 경매도 타인의 가격이나 순위를 반환하지 않는다.

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
  "coupon_code": "WELCOME10",
  "items": [{ "product_name": "상품A", "quantity": 2 }]
}
```

`stock_policy`는 `partial` 또는 `all_or_nothing`이다.

성공 `data`:

```json
{
  "subtotal": 24000,
  "discount_amount": 2400,
  "promotion_id": "welcome-event",
  "payment_amount": 21600,
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
  "quoted_subtotal": 24000,
  "quoted_amount": 21600,
  "coupon_code": "WELCOME10",
  "quote_token": "server-signed-opaque-token",
  "captcha_token": "turnstile-response-token",
  "items": [{ "product_name": "상품A", "quantity": 2 }]
}
```

- `push_token`은 필드 자체는 필수지만 값은 선택이다. 알림 미동의·미지원 브라우저는 빈 문자열을 보낸다.
- 비어 있지 않은 `push_token`은 16~4096자다.
- `quote_token`, 품목, 수량, 정책, 쿠폰, 할인 전·후 금액은 바로 전 견적과 정확히 같아야 한다.
- 쿠폰·자동 할인은 서버가 활성기간, 최소주문금액, 정액/정률, 최대할인을 검증한다.
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

### `GET /payments/methods`

체크아웃 UI가 표시할 실제 사용 가능 결제수단을 반환한다. `enabled=false`인 수단은 선택지로 표시하지 않는다.

```json
{"status":"success","code":"PAYMENT_METHODS","message":"사용 가능한 결제수단입니다.","data":{"methods":[{"provider":"bank_transfer","enabled":true,"flow":"manual_transfer"}]}}
```

### `POST /orders/{order_reference}/payments`

요청 헤더: `X-Order-Token`. 금액은 요청에 포함하지 않으며 DB에 저장된 확정 주문 금액만 사용한다.

```json
{"provider":"bank_transfer"}
```

성공 시 `data`에는 `provider`, `flow`, `payment_attempt_id`, `merchant_order_id`, `amount`, `expires_at`와 다음 행동이 포함된다. PG 어댑터가 배포되지 않은 수단은 `503`으로 거부한다.

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
  "display_order": 1,
  "sku": "SKU-001",
  "catalog_item_id": "CAT-001",
  "seller_id": "direct",
  "brand_name": "브랜드",
  "manufacturer": "제조사",
  "model_number": "MODEL-01",
  "product_type": "GENERAL",
  "description": "상품 상세 설명",
  "condition_type": "new",
  "parent_sku": "PARENT-SKU",
  "barcode": "8800000000001",
  "option_values": {"색상":"블루"},
  "attributes": {"소재":"스테인리스"},
  "image_urls": ["https://cdn.example.com/product.jpg"],
  "warehouse_code": "MAIN",
  "inbound_quantity": 20
}
```

성공 `data`는 저장된 `Product` 하나다. `unit_price`는 1 이상이며 `stock_limit`가 현재
예약수량보다 작으면 `409`다.

상품 저장은 기존 체크아웃용 `products`와 카탈로그 상품, 변형 SKU, 판매자 리스팅,
브랜드, 계층형 카테고리, 이미지/속성, 창고별 재고를 한 트랜잭션에서 함께 갱신한다.
`catalog_item_id`가 비어 있으면 서버가 상품명 기반의 안정적인 ID를 생성한다.

### 관리자 프로모션 및 통계 API

- `GET|PUT /admin/api/promotions`: 관리자 키로 쿠폰/자동행사의 정액·정률 할인,
  최소 주문액, 최대 할인액, 시작·종료 시각, 활성 여부를 조회·저장한다. 빈 `coupon_code`는 자동행사다.
  여러 행사가 적용 가능하면 중복 합산하지 않고 고객에게 할인액이 가장 큰 하나만 적용한다.
- `GET /admin/api/analytics?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`: 관리자 키가 필수다.
  결제완료·미환불 건만 대상으로 주문수, 순매출, 할인액, 일별 판매추이, 분류 선호도와
  가명 고객 선호를 반환한다. 이름·전화·주소·주문 ID·운영 조회지문은 반환하지 않는다.
- 분류 통계는 서로 다른 고객 5명 미만이면 숨기고, 개인 선호는 구매 주문 3건 이상인
  가명 고객만 제공한다. 가명키는 분석 전용 도메인 분리 HMAC이며 배송 개인정보 파기 뒤에도
  통계 연결에만 사용한다. 원 주문과 결합하거나 재식별을 시도하지 않는다.

## 9. 보안 및 결제 예외 처리 규칙

### 9.1. 프런트엔드 보안 저장 규칙

- 대기표 토큰, `quote_token`, 주문 조회키, 푸시 토큰, 채팅 세션 토큰, 배송 개인정보는 URL·cookie·`localStorage`·analytics·console에 넣지 않는다.
- 채팅 세션 토큰은 만료시각과 함께 `sessionStorage`에만 보관하고 탭 종료·만료·차단 시 삭제한다.
- 탭 복구가 필요할 때만 `sessionStorage`를 사용하고 완료·취소·만료·409·관련 422에서 즉시 삭제한다.
- 은행 웹훅 비밀값, 관리자 키 해시, Turnstile secret, DB·Redis URL은 프런트에 전달하지 않는다.
- 푸시는 상태 변경 신호일 뿐이며 최종 상태는 `GET /orders/{reference}/status`로 확인한다.

### 9.2. 결제 관련 보안 취약점 및 엣지 케이스 (Edge Cases)

1. **가격 및 견적 위변조 (Price Manipulation)**
   - `POST /orders` 요청 시 프런트가 전송하는 `quoted_amount` 및 `items`는 백엔드에서 `quote_token`의 단기 HMAC 서명 무결성을 거치며, 변조되거나 품목/수량이 불일치할 경우 거부된다.
   - 추가로 DB 행 잠금(`FOR UPDATE`) 시점의 가격·재고를 다시 검사하여 위변조를 차단한다.
2. **견적 만료 및 재고 선점 경쟁 (Race Condition)**
   - Redis 대기실의 `ready` 입장권을 원자적으로 1회 claim 성공한 뒤에만 주문이 확정되며, `quote_token` 만료 시간과 함께 동시성 및 재고 선점 경쟁을 방어한다.
   - 입금이 없는 `결제대기` 주문은 설정 기한 후 자동 `주문만료` 처리되고 DB 트랜잭션에서 예약 재고를 반환한다.
3. **재생산/중복 요청 방지 (Replay Attack & Idempotency)**
   - 중복 `POST /orders` 요청은 1회성 입장권 폐기 구조로 차단된다.
   - 은행 입금 웹훅의 경우 `payment_transactions.event_id`를 멱등 키로 활용하여 동일 입금 이벤트의 중복 처리를 방어한다.
4. **초과 입금 및 과소 입금 (Over/Under Payment)**
   - 입금 이벤트 원장을 주문별로 누적한다. 부족 입금 시 추가 입금을 기다리고, 초과 입금이나 이름/은행 불일치 시 배송을 보류한다.
   - 참조번호·입금자명·은행명·누적 금액이 모두 일치할 때만 `결제완료` 상태로 전환한다.
5. **결제 상태 폴링 어뷰징 (Polling Abuse)**
   - `GET /orders/{order_reference}/status` 등의 과도 호출은 IP+주문번호 단위의 조회 제한으로 방어한다.
   - 상태 변경 시 앱 푸시 알림을 전달하여 불필요한 폴링을 줄이도록 제어한다.
6. **외부 웹훅/콜백 위조 (Webhook Spoofing)**
   - 은행 웹훅은 반드시 요청 본문의 원본 UTF-8 바이트를 대상으로 한 HMAC-SHA256 서명을 검증한다.
   - timestamp 허용 범위 확인과 nonce 캐시 검증을 통해 재전송(Replay) 공격과 상태 조작을 차단한다.

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
