# Live Broadcast Assist Front

라이브커머스 구매자가 Redis 대기실을 거쳐 서버 견적을 확인하고 계좌이체 주문을 만든 뒤, 비밀 조회키로 입금·배송 상태를 확인하는 Next.js 구매 프런트엔드입니다. 상품 관리자는 화면에 직접 입력한 API 키로 상품 조회·저장만 할 수 있습니다.

> 가격, 재고, 주문 상태와 입금 완료 여부의 원본은 FastAPI/MySQL 백엔드입니다. Google Form/Sheets는 구매 제출 경로로 사용하지 않습니다.

## 아키텍처

```text
구매자 브라우저 ── HTTPS/CORS ──> FastAPI ──> MySQL
       │                              │
       │                              └──────> Redis 대기실
       └── 요청별 nonce 적용 UI/RSC 수신 ──> Vercel / Next.js
```

주문·입금·조회 요청은 Next.js Route Handler, Server Action, Middleware 또는 Vercel Function을 통과하지 않습니다. 브라우저가 FastAPI를 직접 호출해야 실제 사용자 IP가 대기표 발급 제한에 전달되고, 개인정보와 조회키가 Vercel 로그에 복제되지 않습니다.

## 로컬 실행

Node.js 22 LTS와 Corepack을 권장합니다(Next.js 최소 Node.js 20.9).

```bash
corepack enable
corepack install
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

FastAPI는 기본 `http://localhost:8000`, 화면은 `http://localhost:3000`입니다. 로컬 Turnstile 키를 비워 두면 개발 전용 검증 버튼이 표시됩니다. 실제 통합 테스트에는 Cloudflare의 공개 테스트 site key 또는 개발 호스트에 등록한 site key를 사용하세요. secret key는 이 저장소나 Vercel에 넣지 않습니다.

## 환경변수

| 변수 | 공개 | 설명 |
|---|---:|---|
| `NEXT_PUBLIC_ORDER_API_BASE_URL` | 예 | FastAPI base URL. 끝 `/`는 제거됩니다. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 예 | Cloudflare Turnstile site key |
| `NEXT_PUBLIC_BRAND_NAME` | 예 | 화면 브랜드명 |
| `NEXT_PUBLIC_SUPPORT_CONTACT` | 예 | 고객지원 표시값 |

production에서 API URL 또는 Turnstile site key가 비어 있으면 설정 오류 화면을 표시합니다. 관리자 키, Turnstile secret, Redis URL, DB URL은 프런트 환경변수가 아닙니다.

## FastAPI CORS

운영 도메인을 먼저 확정하고 정확한 HTTPS Origin을 별도로 등록합니다.

```env
FRONTEND_ALLOWED_ORIGINS=https://buy.example.com
```

Vercel Preview 전체를 와일드카드로 허용하지 마세요. Preview는 별도 테스트 API와 명시적으로 승인한 Preview Origin을 사용합니다. FastAPI가 `Content-Type`, `X-Waiting-Room-Ticket`, `X-Waiting-Room-Token`, `X-Order-Token`, `X-Admin-API-Key` 요청 헤더를 허용하고 `Retry-After` 응답 헤더를 CORS에 노출해야 합니다.

## 주요 흐름과 보안

```text
booting → issuingTicket → waiting → ready → loadingProducts
→ editingOrder → quoting → quoteReady → reviewingOrder → submittingOrder
→ orderCreated → registeringDepositor/checkingPayment → completed
```

- hidden 탭은 서버 간격의 최소 2배로 폴링하고, 네트워크 오류에는 지수 백오프를 적용합니다.
- 견적 후 `/purchase/review`에서 서버가 계산한 품목별 금액·제외 품목·수령인·전체 주소·`CU(롯데택배)` 배송을 확인하고 한 번만 확정합니다.
- 대기 토큰, `quote_token`, 푸시 토큰과 주문 조회키는 URL, 쿠키, localStorage, IndexedDB, console, analytics에 넣지 않습니다.
- 탭 복구용 `sessionStorage`만 사용합니다. 견적은 수정·만료·`409`/관련 `422`·주문 성공 시 폐기하며, 주문 조회키는 완료 화면의 “이 기기에서 지우기” 또는 조회 완료 시 삭제합니다.
- 주문 timeout은 결과가 불명확하므로 자동 재전송하지 않습니다.
- `expires_at`이 지나면 확정 버튼을 잠그고 새 견적을 받도록 안내합니다. `409` 또는 견적 토큰 누락 `422`도 같은 방식으로 기존 견적을 폐기합니다.
- Turnstile은 최종 확인 단계에서만 로드하고 성공·실패·만료 뒤 토큰을 reset합니다.
- 알림 권한은 검토 화면에서 사용자가 요청한 뒤에만 확인합니다. 푸시 토큰 연동부는 `live-purchase:request-push-token` 이벤트에 외부 푸시 SDK가 `live-purchase:push-token` 이벤트로 응답하는 방식이며, 푸시는 상태 변경 신호일 뿐 실제 상태는 조회 API로 다시 확인합니다.
- 완료·조회·관리자 페이지는 `noindex, nofollow`입니다. 요청별 nonce와 `strict-dynamic`을 사용하는 CSP, `no-referrer`, `nosniff`, HSTS, frame 차단과 Permissions Policy를 설정했습니다. nonce 적용을 위해 페이지는 요청 시 동적으로 렌더링됩니다.
- Service Worker와 analytics는 포함하지 않습니다.

API 계약 전체는 [docs/backend-api.md](docs/backend-api.md)를 참고하세요.

## 테스트

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
```

Vitest는 API envelope, 오류/Content-Type/Retry-After, 금액/차액, reducer 전이, 견적 무효화, 민감 세션 삭제와 주요 UI 상태를 검증합니다. Playwright는 FastAPI를 실제 호출하지 않고 route mock으로 대기→구매→입금→조회→관리자 시나리오를 검증하며 fixture에는 실제 개인정보나 토큰을 쓰지 않습니다.

## Vercel 배포

1. Production 도메인을 확정합니다.
2. FastAPI `FRONTEND_ALLOWED_ORIGINS`에 그 Origin을 등록합니다.
3. Vercel Production에 HTTPS API URL과 Turnstile site key를 설정합니다. 브랜드/지원값은 선택이며, HTTP API URL은 운영 모드에서 거부됩니다.
4. Preview에는 별도 테스트 API URL과 해당 호스트용 site key를 설정합니다.
5. Turnstile에 Production 호스트를 등록합니다.
6. CSP를 처음 변경할 때는 report-only 환경에서 위반을 확인한 후 enforcement를 배포합니다.

배포 후 smoke test:

- 모바일에서 대기표 1회 발급, 화면 잠금/복귀, ready 입장을 확인
- ready 전 상품·견적·주문 API가 호출되지 않는지 확인
- partial/all-or-nothing 견적, `quote_token` 원문 전송, 만료 및 `409`/`422` 재견적 확인
- 주문 버튼 연타 시 POST 1회, `push_token` 필드 전송, timeout 시 자동 재전송 없음 확인
- Turnstile 성공/실패/만료 reset과 FastAPI 검증 확인
- 입금 부족·초과·불일치·완료, `404`, `429 Retry-After`, 서버가 준 CU 운송장 HTTPS 링크 확인
- 관리자 키가 Network URL, 저장소, 빌드 결과, 로그에 없는지 확인
- source map과 Vercel/FastAPI 로그에 개인정보·토큰이 없는지 확인
- FastAPI/Redis와 함께 부하 테스트해 queue capacity 결정

## 지원하지 않는 기능

프런트 자체 결제완료 판정, 환불 송금, 주문 검색/강제 상태 변경은 백엔드 계약에 없으므로 구현하지 않습니다. 관리자 화면도 상품 조회·저장만 제공합니다.
