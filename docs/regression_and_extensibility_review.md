# 프런트엔드 회귀 테스트·확장성 점검

기준: API 계약 1.7.0, 2026-07-16

## 1. 우선순위 기반 회귀 테스트

### P0 — 배포 차단

금액·재고·토큰·주문 생성·응답 envelope·개인정보 저장 경계를 검증한다.

- 모든 공개 계약 schema의 정상 fixture와 위험 경계값
- 성공/error envelope, 비 JSON·잘못된 JSON·schema 불일치
- 404 조회키 정보 은닉, `Retry-After` 숫자·날짜·오류값
- 대기표·견적·주문 토큰의 `sessionStorage` 저장/삭제와 손상 복구
- 구매자 동의·쿠폰·필수 개인정보 입력 검증
- 주문 버튼 연타 1회 전송, timeout 자동 재전송 금지, 409/422 견적 폐기

실행:

```bash
pnpm test:p0
```

### P1 — 핵심 연동

API 모듈의 전체 공개 함수를 실제 `fetch` 경계에서 검증한다.

- 대기실 발급·조회와 ready/expired 전이
- 상품 조회, 경매 제안·결과 조회
- 견적·주문·입금자·주문 상태
- 결제수단·결제 시작·푸시 토큰 갱신
- 방송, 채팅 세션·cursor 조회·작성·신고
- 관리자 상품 조회·저장과 관리자 키 비노출
- 경로 파라미터 인코딩, 고정 인증 헤더, 요청 body

실행:

```bash
pnpm test:p1
```

### P2 — 공용 UI와 표시

- 금액·날짜·차액·class 병합
- 공개 환경변수와 개발/운영 CSP
- 페이지 visibility, 구매 reducer/hook
- UI primitive, dialog 키보드·backdrop, 단계 표시
- 고정가 수량 조작과 경매의 고정가 견적 차단
- 입금 부족·초과·불일치·완료 및 배송 링크
- 개발 Turnstile fallback과 Provider 합성

실행:

```bash
pnpm test:p2
```

전체 회귀와 coverage:

```bash
pnpm test:regression
pnpm test:coverage
pnpm test:e2e
```

Coverage 차단선은 재사용 가능한 도메인·API·훅·공용 UI에 적용한다. 페이지 orchestration은
브라우저 E2E로 검증한다. 이 둘을 섞어 전체 줄 수 비율만 높이면 핵심 결제 경계의 누락을 숨길 수 있다.

## 2. 공개 함수 검증 범위

| 영역 | 검증 방식 |
|---|---|
| `lib/api/*` 전체 공개 함수 | P1 fetch contract test |
| `lib/api/contracts`, errors, client | P0 schema/error test |
| `secure-session`, validation, env, CSP, push, format, utils | P0/P2 unit test |
| 구매 reducer, visibility, waiting-room hook | P1/P2 hook test |
| UI primitive, 상품, 결제 상태 | P2 component test |
| Purchase/Review/Order/Admin/Broadcast orchestration | Playwright E2E |

새 공개 함수는 동일 우선순위 파일에 최소 정상 1건과 오류 또는 경계 1건을 추가한다. API 함수는
URL, method, 인증 헤더, body, 응답 schema를 함께 검증한다.

## 3. 컴포넌트 확장성 판정

### 양호

- `lib/api`가 전송과 schema를 UI에서 분리한다.
- `components/ui` primitive는 도메인에 의존하지 않는다.
- 서버 계산 금액을 UI가 재계산하지 않는다.
- 상품·결제 표시 컴포넌트는 typed props를 사용한다.
- 공통 fixture factory가 Product/Quote/Order 계약 확장 비용을 한 곳으로 모은다.

### 개선 필요

1. `ProductsAdminClient`가 폼 schema, Product→Form 변환, API input 변환, 표와 편집 UI를 한 파일에서 담당한다.
   다음 변경에서는 `admin-product-form-schema.ts`, `admin-product-mapper.ts`, 목록/편집 컴포넌트로 분리한다.
2. `PurchaseClient`와 `ReviewClient`에 storage, router, toast, mutation, 화면 렌더링이 결합돼 있다.
   checkout domain hook과 presentational section을 분리해야 결제수단/경매 흐름을 추가하기 쉽다.
3. `usePurchaseMachine`의 주문 제출 이후 상태는 Review/Complete 화면에서 실제로 사용되지 않는다.
   상태 머신을 전체 checkout에 적용하거나 상품·견적까지만 책임지도록 범위를 줄여야 한다.
4. 상품 식별자가 `product_name`에 의존한다. 이름 변경·동명이인 상품 확장을 위해 안정적인
   `product_id` 또는 variant SKU를 API와 UI key로 사용해야 한다.
5. 주문·결제 상태가 자유 문자열이다. 백엔드와 공유하는 enum/code를 추가하고 한글은 표시 mapper에서 관리해야 한다.
6. 결제/경매 API 계층은 준비됐지만 화면 orchestration은 없다. 기존 Purchase 컴포넌트에 조건문을 계속 추가하지 말고
   `CheckoutFlow`와 `OfferFlow`를 독립 feature로 구성한다.

## 4. 권장 목표 구조

```text
src/features/
  checkout/   domain.ts, api.ts, hooks.ts, components/
  offers/     domain.ts, api.ts, hooks.ts, components/
  orders/     domain.ts, api.ts, components/
  broadcast/  domain.ts, api.ts, components/
  admin-products/ schema.ts, mapper.ts, api.ts, components/
src/components/ui/
src/lib/http/
```

기능 간 공유는 schema 전체가 아니라 안정적인 ID·금액·토큰 credential 타입으로 제한한다.
각 feature의 orchestration component는 API 호출과 상태 전이만 담당하고, 표시 컴포넌트는 props와 callback만 받는다.

## 5. 적용 결과 (2026-07-16)

- `admin-products/form-model.ts`로 관리자 상품 schema, 기본값, Product↔Form 변환 및 정렬을 분리했다.
- `checkout/domain.ts`로 구매자 폼 복원, 수량 복원·정규화, 견적 초안 생성을 분리했다.
- 고정가 구매는 `CheckoutFlow`, 경매·역경매 등 제안 상품은 `OfferFlow`로 표시 경계를 분리했다.
- 구매 상태 머신의 책임을 상품 로드부터 견적 확정 전까지로 축소하고, 실제 사용하지 않던 주문 생성 이후 상태를 제거했다.
- 비활성·삭제·제안 상품의 저장 수량이 고정가 견적에 포함되지 않도록 정규화하고 재고 수량을 상한으로 적용했다.
- feature 도메인 회귀 테스트를 P1에 추가했다.

API 계약 2.0.0 반영 후 다음 항목도 완료했다.

- 상품명의 변경과 무관한 `product_id`를 상품 카드, 저장 초안, 견적, 주문, 제안 key로 사용
- 주문·결제·품목의 `status_code`를 로직 분기 기준으로 사용하고 표시 문구와 분리
- preferences feature에 typed locale 사전과 `system`/`light`/`dark` 테마 토큰을 추가
