## 역할과 최종 목표

당신은 시니어 Next.js/TypeScript 프런트엔드 엔지니어다. 라이브커머스 구매자가 트래픽 대기실을 거쳐 상품을 선택하고, 서버 견적을 확인한 뒤 계좌이체 주문을 확정하며, 주문번호와 비밀 조회키로 입금·배송 상태를 확인하는 프로덕션 품질의 웹 애플리케이션을 구현하라.

이 프로젝트는 Vercel에 배포한다. 주문·재고·입금의 원본은 별도 FastAPI/MySQL 백엔드다. 프런트에서 가격, 재고, 입금 완료 여부를 자체 판정하면 안 된다.

결과물은 시연용 한 페이지가 아니라 다음을 갖춘 독립 저장소여야 한다.

- 실제 동작하는 구매자 UI
- Redis 대기실 연동
- 서버 견적과 재고 변경 재확인
- Cloudflare Turnstile 연동
- 계좌이체 후 입금자명·은행 등록
- 마스킹된 주문내역 조회
- API 키 기반 상품 관리자 UI
- 반응형·접근성·보안 헤더
- 단위·컴포넌트·E2E 테스트
- Vercel 배포 문서와 환경변수 예제

질문으로 작업을 중단하지 말고, 아래 요구사항을 기본 결정으로 사용하라. 백엔드 계약에 없는 API를 임의로 만들지 마라.

## 기술 기준

- 공식 `create-next-app`의 최신 안정 Next.js를 사용한다.
- App Router, TypeScript strict mode, `src/` 디렉터리, ESLint, Tailwind CSS를 사용한다.
- Vercel이 지원하는 현재 LTS Node.js와 Corepack/pnpm을 사용하고 lockfile을 커밋한다.
- React Server Component를 기본으로 하되 브라우저 API, 대기실 폴링, 폼 상태가 필요한 작은 경계만 Client Component로 만든다.
- 외부 상태 라이브러리는 꼭 필요한 경우만 사용한다. 구매 상태는 TypeScript discriminated union과 `useReducer`로 명시적인 상태 머신을 구현한다.
- 폼 검증은 `react-hook-form`과 `zod`를 사용한다. 서버 오류는 별도 API 오류 스키마로 검증한다.
- 서버 상태 캐시 라이브러리가 필요하다면 TanStack Query를 사용하되 대기실 폴링은 서버가 반환한 간격과 Visibility API를 직접 준수할 수 있게 구현한다.
- 아이콘은 접근 가능한 SVG 아이콘 라이브러리를 사용한다. 무거운 UI 프레임워크를 추가하지 않는다.
- 날짜·금액은 `Intl.DateTimeFormat('ko-KR')`, `Intl.NumberFormat('ko-KR')`로 표시한다.

공식 기준:

- Next.js 설치: https://nextjs.org/docs/app/getting-started/installation
- Next.js 환경변수: https://nextjs.org/docs/app/guides/environment-variables
- Vercel 환경변수: https://vercel.com/docs/environment-variables

## 절대적인 아키텍처 경계

1. 브라우저가 FastAPI를 직접 호출한다.
2. 구매·입금·조회 요청을 Next.js Route Handler, Server Action, Middleware 또는 Vercel Function으로 프록시하지 않는다.
3. 이 원칙은 실제 사용자 IP가 Redis 대기표 발급 제한에 전달되고, 개인정보·주문 조회키가 Vercel 서버 로그에 복제되지 않게 하기 위한 것이다.
4. `NEXT_PUBLIC_ORDER_API_BASE_URL`만 브라우저에 공개한다.
5. 은행 웹훅 비밀, 관리자 키, Redis URL, DB URL은 Next.js 프로젝트에 넣지 않는다.
6. 관리자 API 키를 빌드 환경변수 또는 `NEXT_PUBLIC_*` 변수로 설정하지 않는다. 관리자가 화면에서 직접 입력한 현재 세션 값만 사용한다.
7. Google Form과 Google Sheets를 구매 제출 경로로 사용하지 않는다.
8. 가격·재고·주문 상태·입금 완료 여부를 프런트 계산으로 확정하지 않는다.

## 환경변수

`.env.example`을 다음처럼 제공한다.

```env
NEXT_PUBLIC_ORDER_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
NEXT_PUBLIC_BRAND_NAME=라이브 구매
NEXT_PUBLIC_SUPPORT_CONTACT=
```

규칙:

- API base URL 끝의 `/`를 정규화한다.
- production에서는 API URL과 Turnstile 사이트 키가 없으면 빌드 또는 런타임 초기에 명확한 설정 오류 화면을 표시한다.
- `.env.local`은 커밋하지 않는다.
- FastAPI의 `FRONTEND_ALLOWED_ORIGINS`에는 Vercel 운영 도메인의 정확한 HTTPS Origin을 별도로 등록해야 한다고 README에 적는다.
- Vercel Preview URL 전체를 CORS 와일드카드로 허용하라고 안내하지 않는다.

## 라우트 구성

다음 App Router 페이지를 구현한다.

```text
/
  구매 랜딩 및 대기실 진입
/purchase
  상품 선택과 배송정보 입력, 서버 견적 요청
/purchase/review
  결제페이지형 구매내역 확인, 견적 만료 감지, Turnstile, 최종 확정
/purchase/complete
  주문번호·조회키·입금액 보관 안내, 입금자 등록, 상태 확인
/orders/lookup
  주문번호와 조회키를 직접 입력하는 구매내역 조회
/admin/products
  관리자 API 키 입력 및 상품 목록·추가·수정
/privacy
  개인정보 수집·이용 안내 자리표시자
/terms
  구매·재고부족·계좌이체·취소 정책 안내
```

`/purchase`, `/purchase/review`, `/purchase/complete`를 직접 URL로 열었는데 필요한 탭 세션 상태가 없으면 `/` 또는 `/orders/lookup`으로 안전하게 안내한다. review로 이동할 때 개인정보나 견적 토큰을 URL/query에 넣지 않는다.

## 구매 상태 머신

문자열 boolean 조합이 아니라 다음 상태를 discriminated union으로 정의한다.

```text
booting
issuingTicket
waiting
ready
loadingProducts
editingOrder
quoting
quoteReady
reviewingOrder
submittingOrder
orderCreated
registeringDepositor
checkingPayment
completed
recoverableError
fatalError
```

각 상태가 가질 수 있는 데이터와 허용 이벤트를 타입으로 제한한다. 예:

- `waiting`: ticket ID, ticket token, position, retry interval
- `quoteReady`/`reviewingOrder`: 선택 항목, 서버 견적 줄, 서명 견적 토큰과 만료시각, 확정 예정액, 재고 처리 정책, 배송정보
- `orderCreated`: 주문번호, 주문 조회키, 입금 예정액, 취소 건수
- `recoverableError`: 이전 안전 상태와 다시 시도 가능한 작업

더블클릭과 중복 submit을 상태 머신에서 차단한다. 네트워크 응답이 늦게 도착해 이전 상태를 덮어쓰지 않도록 모든 fetch에 `AbortController`를 사용한다.

## API 공통 클라이언트

`src/lib/api/` 아래에 브라우저 전용 타입 안전 클라이언트를 만든다.

```text
src/lib/api/client.ts
src/lib/api/contracts.ts
src/lib/api/errors.ts
src/lib/api/waiting-room.ts
src/lib/api/products.ts
src/lib/api/orders.ts
src/lib/api/admin.ts
```

공통 규약:

- JSON 요청은 `Content-Type: application/json`을 보낸다.
- 성공 최상위 형식은 `{ status, code, message, data }`다.
- 오류 최상위 형식도 `{ status: 'error', code, message, data }`다.
- JSON 파싱 전에 HTTP 상태와 Content-Type을 확인한다.
- 알 수 없는/HTML 응답은 일반화된 안전한 오류로 바꾼다.
- API 오류 객체에는 HTTP status, code, 안전한 message, Retry-After를 보존한다.
- `credentials: 'omit'`, `cache: 'no-store'`, 적절한 `Accept: application/json`을 명시한다.
- 주문 조회키, 대기 토큰, 이름, 주소, 전화번호를 `console.*`, analytics, error context에 기록하지 않는다.
- fetch timeout을 AbortController로 구현한다.
- `429`와 `503`은 `Retry-After`가 있으면 우선 사용한다.
- 사용자에게 백엔드 원문 stack/내부 오류를 표시하지 않는다.

## FastAPI 계약

### 공통 대기실 헤더

대기실이 활성화되어 `enabled=true`라면 상품, 견적, 주문 API에 모두 보낸다.

```text
X-Waiting-Room-Ticket: <ticket_id>
X-Waiting-Room-Token: <ticket_token>
```

### 1. 대기표 발급

```http
POST /waiting-room/tickets
```

본문 없음.

응답 `data`:

```ts
type WaitingTicket = {
  enabled: boolean;
  status: 'waiting' | 'ready';
  ticket_id: string;
  ticket_token: string;
  position: number;
  retry_after_seconds: number;
};
```

- `429`: 같은 클라이언트의 발급 과다
- `503`: 대기열 가득 참 또는 Redis 장애
- `Retry-After`를 표시와 재시도에 사용한다.

### 2. 대기 상태 조회

```http
GET /waiting-room/tickets/{ticket_id}
X-Waiting-Room-Token: <ticket_token>
```

응답 `data`:

```ts
type WaitingStatus = {
  enabled: boolean;
  status: 'waiting' | 'ready' | 'processing' | 'expired';
  position: number;
  retry_after_seconds: number;
};
```

### 3. 판매 상품

```http
GET /api/products
X-Waiting-Room-Ticket: <ticket_id>
X-Waiting-Room-Token: <ticket_token>
```

대기실이 꺼진 개발환경에서는 두 헤더를 생략한다.

```ts
type Product = {
  product_name: string;
  unit_price: number;
  stock_limit: number;
  reserved_quantity: number;
  available_quantity: number;
  active: boolean;
  display_order: number;
};
```

`available_quantity=0`은 품절 처리하고 수량 입력을 비활성화한다. 브라우저에 받은 수량은 안내용일 뿐 최종 재고 보장이 아니라고 표시한다.

### 4. 서버 견적

```http
POST /orders/quote
```

```json
{
  "stock_policy": "partial",
  "items": [
    {"product_id": "prd_01JZ8R7F6K2M4N8Q1T3V5W7X9Y", "quantity": 2}
  ]
}
```

`stock_policy`:

- `partial`: 재고가 있는 상품만 구매
- `all_or_nothing`: 하나라도 부족하면 전체 취소

응답 `data`:

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

반드시 상품 선택 화면과 분리된 `/checkout/review` 또는 동등한 확인 단계에서 다음을 표시한다.

- `구매목록 → 구매내역 확인 → 입금 → 배송` 단계 표시
- 구매 확정 상품의 단가·수량·각 줄 소계
- `accepted=false`인 취소 예정 상품
- 재고 처리 정책
- 구매자가 입력한 수취인명·전화번호·전체 배송주소와 `CU(롯데택배)` 안내
- 최종 입금 예정액
- “수정”과 “구매내역 확정” 버튼

견적 단계에서는 재고가 예약되지 않는다고 안내한다. `quote_token`은 React state에 두고 URL·analytics·로그·`localStorage`에 넣지 않는다. `expires_at`이 지나면 확정 버튼을 비활성화하고 새 견적을 받아 변경된 내용을 다시 보여준다.

### 5. 주문 확정

```http
POST /orders
X-Waiting-Room-Ticket: <ticket_id>
X-Waiting-Room-Token: <ticket_token>
```

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
  "items": [
    {"product_id": "prd_01JZ8R7F6K2M4N8Q1T3V5W7X9Y", "quantity": 2}
  ]
}
```

응답 `data`:

```ts
type OrderCreatedData = {
  order_reference: string;
  order_token: string;
  payment_amount: number;
  accepted_count: number;
  cancelled_count: number;
};
```

중요 처리:

- `403`: Turnstile 또는 대기 입장권 실패. Turnstile을 reset하고 상태에 맞게 안내한다.
- `409`: 서명 견적 만료·구매내역 불일치·가격/재고 변경 또는 입장 시간 만료. 이전 견적을 폐기하고 대기 상태/상품/견적을 다시 확인한 뒤 재확정을 받는다.
- `503`: 대기 시스템 또는 백엔드 장애. 자동 중복 제출하지 않는다.
- 주문 요청 timeout은 성공 여부가 불명확할 수 있으므로 무조건 같은 요청을 재전송하지 않는다. 사용자에게 주문번호를 받지 못한 경우 고객지원 확인이 필요하다고 안내한다.
- 네이티브 앱 또는 PWA가 발급한 푸시 토큰은 주문 요청 body로만 전달하고 URL, 로그, analytics, `localStorage`에 기록하지 않는다. 토큰 갱신 시 주문 조회키로 `/orders/{order_reference}/push-token`을 호출한다.

### 6. 입금자명·은행 등록

```http
POST /orders/{order_reference}/depositor
X-Order-Token: <order_token>
```

```json
{
  "depositor_name": "홍길동",
  "bank_name": "국민은행"
}
```

응답 `data`:

```ts
type PaymentMatchData = {
  status: string;
  expected_amount: number;
  paid_amount: number;
  difference: number;
  courier: {
    provider: string;
    display_name: string;
    tracking_url: string;
  };
};
```

버튼 문구는 “입금 완료 처리”가 아니라 “입금정보 등록 및 확인”으로 한다. 프런트가 결제 완료를 확정하는 것처럼 표현하지 않는다.

### 7. 주문 상태 조회

```http
GET /orders/{order_reference}/status
X-Order-Token: <order_token>
```

```ts
type OrderStatusData = {
  order_reference: string;
  status: string;
  created_at: string;
  buyer_name: string;
  phone: string;
  address: string;
  expected_amount: number;
  paid_amount: number;
  difference: number;
  items: Array<{
    product_name: string;
    quantity: number;
    price: number;
    status: string;
    cancellation_reason: string;
    tracking_number: string;
  }>;
};
```

잘못된 주문번호와 잘못된 조회키는 모두 같은 `404`다. 어떤 값이 틀렸는지 추측하는 메시지를 표시하지 않는다.

### 8. 관리자 상품 목록

```http
GET /admin/api/products
X-Admin-API-Key: <admin_key>
```

판매 중지 상품을 포함한 전체 상품을 반환한다.

### 9. 관리자 상품 저장

```http
PUT /admin/api/products
X-Admin-API-Key: <admin_key>
Content-Type: application/json
```

```json
{
  "product_name": "상품A",
  "unit_price": 12000,
  "stock_limit": 100,
  "active": true,
  "display_order": 1
}
```

예약수량보다 총 재고를 작게 줄이면 `409`다.

## 대기실 UX

랜딩 시 대기표를 한 번만 발급한다. React Strict Mode effect 중복 실행으로 두 장이 발급되지 않도록 `useRef` 또는 명시적 사용자 시작 이벤트로 보호한다.

대기 화면:

- 큰 숫자로 “현재 N번째로 기다리고 있습니다” 표시
- 서버가 반환한 `retry_after_seconds` 사용
- 진행 중임을 알리는 접근 가능한 progress/status 영역
- “새로고침하지 않아도 자동으로 연결됩니다” 안내
- 대기 토큰은 메모리 또는 `sessionStorage`에만 보관
- `document.visibilityState === 'hidden'`이면 폴링 간격을 최소 2배로 낮춘다.
- 네트워크 오류는 즉시 대기표를 새로 발급하지 않고 지수 백오프한다.
- `expired`일 때만 사용자 동의 또는 명확한 안내 후 새 대기표를 발급한다.
- `ready`가 되면 입장 제한시간 안내와 함께 구매 화면으로 이동한다.
- 언마운트 시 timeout과 fetch를 취소한다.

대기표 토큰을 URL query, hash, localStorage, console, analytics에 넣지 않는다.

## 상품·주문 폼 UX

상품 카드:

- 상품명, 단가, 구매 가능 수량, 품절 상태
- 수량 stepper와 직접 숫자 입력
- 0~서버 구매 가능 수량의 클라이언트 편의 검증
- 상품명은 text node로 렌더링하고 HTML로 주입하지 않는다.

주문자 폼:

- 주문자명
- 전화번호
- 배송주소
- 재고 부족 처리 정책
- 개인정보 수집·이용 동의 필수 체크
- 주문/취소 정책 확인 필수 체크

검증 메시지는 각 필드와 `aria-describedby`로 연결한다. 전화번호는 표시 중 편의상 하이픈을 허용하되 서버에 임의 변환 규칙을 강제하지 않는다.

견적 확인 후 상품 수량, 주소, 정책이 바뀌면 기존 견적을 즉시 무효화한다. 견적이 무효인 상태에서는 주문 확정 버튼을 활성화하지 않는다.

## Turnstile

- `next/script`로 Cloudflare Turnstile 공식 스크립트를 로드한다.
- 전역 타입을 별도 `types/turnstile.d.ts`에 선언한다.
- 사이트 키만 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`로 사용한다.
- 비밀 키는 프런트에 존재하면 안 된다.
- 위젯은 최종 견적 확인 단계에서만 표시한다.
- 토큰을 React state에 잠시 보관하고 주문 성공·실패·만료 후 즉시 폐기/reset한다.
- Turnstile 실패를 결제 실패로 표현하지 않는다.
- CSP에 `https://challenges.cloudflare.com`의 필요한 script/frame/connect만 허용한다.

## 주문 완료와 조회키 보관

주문 성공 직후 다음을 한 화면에 명확하게 표시한다.

- 주문번호
- 비밀 조회키
- 실제 입금 예정액
- 확보/취소 상품 수
- 조회키 분실 시 주문내역을 온라인으로 확인하기 어렵다는 안내

보관 기능:

- 주문번호와 조회키 각각 복사
- 둘을 함께 복사
- 사용자가 클릭하면 로컬 텍스트 파일로 저장
- 인쇄 전용 스타일
- QR 코드는 URL에 토큰이 포함될 위험 때문에 만들지 않는다.

기본 보관은 탭 메모리다. 현재 탭 복구를 위해 `sessionStorage`를 사용할 수 있지만 다음을 지킨다.

- `localStorage`, 쿠키, IndexedDB에 영구 저장하지 않는다.
- 주문 완료 페이지에서 명시적으로만 저장한다.
- 주문 조회가 끝나거나 사용자가 “이 기기에서 지우기”를 누르면 즉시 삭제한다.
- analytics와 오류 수집 도구의 breadcrumb에 포함되지 않게 한다.

## 입금 상태 표시

상태별 안내를 구현한다.

- `결제대기`: 입금 예정액과 등록한 입금정보 확인
- `입금부족`: `difference`만큼 추가 입금 필요
- `입금초과`: 자동 완료가 아니며 관리자 확인 필요
- `입금자불일치`: 입금자명 또는 은행 불일치 가능, 고객지원 안내
- `결제완료`: 완료 배지와 상품 상태
- `주문만료`: 입금하지 말라는 경고
- `재고취소`: 취소 사유와 입금 대상 제외 안내
- `배송준비`: 운송장번호가 있으면 표시
- `배송완료`: 배송 완료 안내. 개인정보 보관기간이 지나면 조회키도 파기되어 이후 조회는 404가 될 수 있다.
- `환불완료`: 환불 완료 안내

양수 `difference`는 부족액, 음수는 초과액, 0은 금액 일치로 표시하되 최종 상태는 반드시 서버 `status`를 우선한다.

입금 상태 자동 조회는 사용자가 켠 경우에만 제한적으로 수행하고 과도한 폴링을 하지 않는다. 페이지 기본값은 “현재 상태 확인” 버튼이다. `429`는 Retry-After를 표시한다.

## 관리자 상품 화면

- 일반 구매 내비게이션에 관리자 링크를 노출하지 않는다.
- 관리자 키 입력 필드는 password type과 autocomplete 설정을 사용한다.
- 키는 React state에만 두며 URL, localStorage, cookie, env에 저장하지 않는다.
- 키 확인 후 전체 상품 테이블을 표시한다.
- 테이블 열: 상품명, 단가, 총 재고, 예약, 구매 가능, 판매 여부, 표시순서
- 행 선택으로 편집 폼을 채운다.
- 저장 전 변경 내용을 요약한 확인 다이얼로그를 표시한다.
- 예약수량보다 재고를 낮출 수 없음을 화면에서도 안내하지만 서버 `409`를 최종 판정으로 사용한다.
- 관리자 키 오류는 일반화해서 표시하며 키를 응답/로그에 출력하지 않는다.

현재 백엔드에는 상품 조회·저장 API만 있으므로 환불, 주문 검색, 상태 강제 변경 UI를 가짜로 구현하지 않는다.

## 디자인 시스템

한국어 모바일 우선 라이브커머스 UI로 만든다.

- 밝은 중성 배경, 흰색 카드, 충분한 대비
- 기본 강조색 한 가지와 성공·경고·오류 상태색
- 최대 본문 폭 약 720~960px
- 모바일 하단에 현재 합계/다음 단계 sticky action 영역
- 버튼 최소 높이 44px
- 단계를 “대기 → 상품 → 정보 → 금액 확인 → 입금”으로 표시
- 애니메이션은 짧고 절제하며 `prefers-reduced-motion`을 존중
- skeleton, empty, sold-out, offline, rate-limited 상태를 모두 디자인
- 색만으로 상태를 구분하지 않고 아이콘과 텍스트를 함께 사용
- 다이얼로그 focus trap, Escape, 초기 focus, 복귀 focus를 구현
- 모든 입력과 버튼은 키보드로 조작 가능해야 한다.

브랜드 로고나 실제 상품 이미지가 없으므로 임의의 외부 이미지를 hotlink하지 않는다. 텍스트와 단순 CSS 그래픽으로 완성도 있게 구성하고, 추후 이미지 URL 필드가 API에 추가될 때 확장 가능한 컴포넌트로 만든다.

## 보안 헤더와 Next.js 설정

`next.config.ts`의 `headers()`로 최소 다음을 설정한다.

- `Content-Security-Policy`
- `Referrer-Policy: no-referrer`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` 또는 CSP `frame-ancestors 'none'`
- `Permissions-Policy`에서 불필요한 camera, microphone, geolocation 차단

CSP 규칙:

- 기본 self
- Turnstile에 필요한 Cloudflare script/frame/connect만 추가
- `unsafe-eval`을 production에서 허용하지 않는다.
- 가능한 경우 nonce 기반 script 정책을 사용한다.
- API connect-src에 `NEXT_PUBLIC_ORDER_API_BASE_URL`의 Origin만 추가한다.
- 임의의 와일드카드 Origin을 사용하지 않는다.

추가 보안:

- `dangerouslySetInnerHTML` 금지
- 사용자/상품/API 문자열은 항상 React text escaping 사용
- 민감 데이터를 포함한 페이지는 검색엔진 색인 금지 metadata 적용
- 주문 완료·조회·관리자 페이지는 `robots: noindex, nofollow`
- Service Worker/PWA 캐시에 주문·PII 응답을 넣지 않는다.
- 서드파티 analytics는 기본 제외한다. 추가할 경우 주문·관리자 경로와 민감 필드를 완전히 배제한다.

## 권장 디렉터리 구조

```text
src/
  app/
    layout.tsx
    page.tsx
    purchase/page.tsx
    purchase/complete/page.tsx
    orders/lookup/page.tsx
    admin/products/page.tsx
    privacy/page.tsx
    terms/page.tsx
    error.tsx
    not-found.tsx
    globals.css
  components/
    waiting-room/
    products/
    purchase/
    payment/
    orders/
    admin/
    ui/
  hooks/
    use-waiting-room.ts
    use-purchase-machine.ts
    use-page-visibility.ts
  lib/
    api/
    env.ts
    format.ts
    validation.ts
    secure-session.ts
  types/
    turnstile.d.ts
tests/
  unit/
  components/
  e2e/
docs/
  backend-api.md
```

컴포넌트를 지나치게 잘게 나누지 말고, 도메인 단위로 응집한다.

## 테스트 요구사항

### 단위 테스트

- API 성공/오류 envelope 파싱
- Content-Type이 JSON이 아닐 때 거부
- Retry-After 파싱
- 금액·날짜·차액 표시
- 구매 reducer의 허용/금지 상태 전이
- 견적 후 입력 변경 시 견적 무효화
- 민감 데이터 sessionStorage 삭제

### 컴포넌트 테스트

- 대기 순번과 ready 전환
- hidden tab에서 폴링 간격 완화
- 품절/부분취소/전체취소 견적 표시
- 더블클릭 주문 제출 1회 보장
- Turnstile reset
- 부족·초과·불일치·완료 상태 안내
- 관리자 재고 409 표시
- 키보드·aria label·focus 이동

### Playwright E2E

백엔드를 실제 호출하지 않고 네트워크를 route mock한다.

1. 대기 3회 → ready → 상품 로드
2. 상품 선택 → partial 견적에서 한 줄 취소 → 사용자 확인
3. Turnstile mock → 주문 성공 → 주문번호/조회키 복사
4. 견적 변경 `409` → 이전 견적 폐기 → 재견적
5. 주문 timeout → 자동 재전송하지 않음
6. 입금부족 → 추가입금 안내 → 결제완료
7. 잘못된 조회키 `404`의 일반화 메시지
8. `429` Retry-After와 버튼 잠금
9. 대기표 expired 후 재발급
10. 관리자 상품 수정과 예약수량 이하 재고 `409`

E2E fixture와 screenshot에 실제 이름, 전화번호, 주소, 토큰을 사용하지 않는다.

다음 명령이 모두 성공해야 한다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## README 요구사항

README에 다음을 포함한다.

- 프로젝트 목적과 아키텍처 그림
- Google Form/Sheets가 구매 경로가 아니라는 설명
- FastAPI 직접 브라우저 호출 이유
- 로컬 실행 방법
- 환경변수 표
- FastAPI CORS 설정 예
- Turnstile 로컬/운영 설정
- 대기실 상태 흐름
- 주문 조회키 보안 주의사항
- Vercel Production/Preview 환경변수 설정
- 배포 후 smoke test 체크리스트
- 지원하지 않는 기능: 프런트 자체 결제완료, 환불 송금, 주문 강제변경

## Vercel 배포 체크리스트

- Production 도메인을 먼저 결정한다.
- FastAPI `FRONTEND_ALLOWED_ORIGINS`에 정확한 Production Origin을 등록한다.
- Vercel에 공개 환경변수 두 개(API URL, Turnstile site key)만 설정한다.
- Preview 환경은 별도 테스트 API Origin을 사용한다.
- Production build에서 source map과 로그에 민감 데이터가 포함되지 않는지 확인한다.
- 실제 모바일 브라우저에서 대기 중 화면 잠금/복귀를 확인한다.
- FastAPI/Redis와 함께 부하 테스트하여 대기실 capacity를 결정한다.
- CSP report-only로 먼저 확인한 뒤 enforcement를 적용한다.

## 완료 조건

다음 조건을 모두 만족해야 완료다.

1. 저장소를 새로 clone한 사람이 README만 보고 로컬 실행할 수 있다.
2. 백엔드 API가 mock일 때 전체 구매·입금·조회·상품관리 흐름이 작동한다.
3. 대기실 ready 전에는 상품·견적·주문 API가 호출되지 않는다.
4. 주문 확정 요청은 한 번만 전송된다.
5. 금액과 재고는 서버 응답만 신뢰한다.
6. 주문번호와 조회키가 URL·로그·영구 저장소에 남지 않는다.
7. 관리자 키가 빌드 결과와 저장소에 포함되지 않는다.
8. 모바일, 키보드, 스크린리더 기본 흐름이 동작한다.
9. lint, typecheck, unit, component, E2E, production build가 모두 통과한다.
10. Vercel 배포 후 FastAPI CORS, Turnstile, Redis 대기실을 포함한 smoke test 절차가 문서화되어 있다.

## 구현 결과 보고 형식

작업을 마치면 다음 형식으로 보고하라.

```text
- 구현한 페이지와 핵심 흐름
- 선택한 패키지와 선택 이유
- 보안상 중요한 결정
- API mock 및 테스트 범위
- 실행한 검증 명령과 결과
- Vercel 배포에 필요한 사용자 설정
- 백엔드 계약상 구현하지 않은 기능
```

프런트에서 백엔드의 재고·가격·입금 판정을 복제하거나 임의 API를 추가하는 방식으로 요구사항을 우회하지 마라.

---
