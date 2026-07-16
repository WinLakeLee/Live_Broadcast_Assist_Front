# AI.md - Live Broadcast Assist Frontend 개발 내역

이 문서는 AI 및 개발자가 프론트엔드 프로젝트(`Live_Broadcast_Assist_Front`)의 전체 개발 맥락과 변경 내역을 파악하고, 추후 기능 추가 및 유지보수 시 참고할 수 있도록 작성된 문서입니다.

## 📌 주요 변경 내역 (Git History 요약)

### 2026-07-16 — 마켓플레이스형 상품 관리자와 구매 이용조건

- API 계약 1.7.0에 맞춰 카탈로그 상품, 변형 SKU, 판매자 리스팅, 브랜드/제조사,
  옵션·속성·이미지, 창고별 재고와 입고예정수량을 검증한다.
- 상품 관리자 화면에서 상세 카탈로그 필드와 JSON 옵션/속성, HTTPS 이미지 URL을 입력한다.
- 네이버 공식 약관의 주제 구성을 참고하되 문구를 복사하지 않은 구매 및 서비스 이용조건을
  가격·재고·경매·결제·쿠폰·배송·청약철회·채팅 기능에 맞춰 게시한다.

### 1. 프로젝트 초기화 및 기초 UI 구축 (`46c93e9`, `3526809`)
- Next.js (App Router) 기반의 프론트엔드 기초 환경 세팅
- 주문, 상태 조회, 대기실, 관리자 페이지 등의 핵심 페이지 뼈대 구축
- 결제 및 구매 흐름(Purchase Flow) 제어를 위한 상태 머신 훅(`usePurchaseMachine`) 설계
- `Zod`를 활용한 폼 검증과 시맨틱 HTML(Vanilla CSS) 기반의 접근성 높은 UI 구성

### 2. 실제 백엔드 API 연동 (`206ed9a`)
- 기존 Mock 데이터 구조에서 실제 백엔드와 통신하도록 API 클라이언트 로직 수정 (`client.ts`, `contracts.ts`, `orders.ts` 등)
- 웹 푸시 알림 수신 동의 기능 도입
- 브라우저 스토리지(`sessionStorage`, `localStorage`)를 안전하게 다루기 위한 보안 로직(`secure-session.ts`) 추가

### 3. API 계약(Contract) 단일 문서화 (`9a7c2d0`, `254ec2a`)
- 프론트엔드와 백엔드의 단일 진실 공급원인 `docs/api_contract.md` 문서 통합
- 계약 버전을 통해 응답 스키마와 Mock, 프론트 Zod 검증이 완전히 일치하도록 규칙 확립

### 4. 보안 취약점 보완 및 결제 엣지 케이스(Edge Cases) 처리 (`01cecdf`, `ab72c5a`)
- **견적 만료 및 Race Condition 대응**: 결제 리뷰 중(`review-client.tsx`) 만료 시간이 지났거나, 타 사용자로 인해 재고가 부족해질 때(409/422 상태) 사용자에게 재견적을 유도하는 로직 적용
- **중복 요청 방지 (Idempotency)**: 버튼 다중 클릭 방지를 위해 진행 중 UI 락 설정
- **초과/과소 입금 대응**: `difference` 필드를 해석하여 결제 부족/초과 여부를 명확히 화면에 표시 (`payment-status.tsx`)
- **결제 상태 폴링 어뷰징 방지 (Rate Limit Lockout)**: 사용자가 주문 상태를 반복 새로고침할 때 백엔드에서 `429 Too Many Requests` (retryAfter)를 내려주면, 해당 시간 동안 버튼을 비활성화하는 타이머 로직 적용 (`order-complete-client.tsx`, `order-lookup-client.tsx`)

### 5. 코드 가독성 개선 (Prettier 도입) (`ab72c5a`)
- JSX 코드가 미니파이(압축)되어 한 줄로 작성되어 유지보수가 불가능했던 문제를 해결
- 전체 `.tsx`, `.ts` 파일들에 대해 Prettier를 적용하여 들여쓰기 및 줄바꿈을 사람과 AI가 모두 읽기 편하도록 재정렬 완료

### 6. 프론트엔드 모던화 리팩토링 (Shadcn UI, TailwindCSS, React Query)
- **UI 라이브러리 교체**: 기존의 Vanilla CSS(globals.css)를 완전히 제거하고 TailwindCSS(v4)로 교체했습니다. 디자인 일관성을 위해 `Shadcn UI` 컴포넌트(Button, Card, Input, Label 등)를 도입했습니다.
- **데이터 패칭 및 상태 관리 분리**: 수동으로 `useEffect`와 `AbortController`를 사용하던 API 요청 로직을 `@tanstack/react-query`의 `useQuery`와 `useMutation`으로 마이그레이션했습니다. 이를 통해 상태 머신(`usePurchaseMachine`)은 순수 '흐름 제어'에만 집중하고 데이터의 캐싱, 재시도, 취소는 React Query가 전담하도록 책임을 명확히 분리했습니다.
- **에러 및 알림 개선**: 에러 메시지 처리를 로컬 상태 대신 `sonner` 토스트(Toast) 메시지로 일괄 교체하여 직관적인 피드백을 제공합니다.
- **폼 입력 포맷팅 적용**: 전화번호 등 사용자의 입력(react-hook-form) 편의성을 높이기 위해 자동 하이픈 추가 등의 포맷팅 로직을 적용했습니다.
- **SEO 및 메타 태그 개선**: `layout.tsx` 파일에 오픈그래프(OG) 등 SEO 관련 설정을 추가하여 웹 접근성과 노출도를 향상했습니다.

### 7. YouTube 영상·채팅 사이트 내 동기화
- `GET /api/broadcast`의 공급자 중립 응답을 Zod로 검증하고 랜딩에서 영상과 공식 라이브 채팅 iframe을 함께 표시합니다.
- 영상과 채팅의 `video_id`가 다르면 응답을 거부하며, CSP는 YouTube와 YouTube nocookie 프레임만 추가 허용합니다.
- YouTube 공식 채팅 iframe이 지원되지 않는 모바일 웹에서는 `watch_url`을 새 창으로 여는 대체 동선을 제공합니다.
- 백엔드 공통 API 계약 1.4.0과 프런트 계약 사본을 동기화했습니다.

### 8. 쿠폰·상품 상세·가명 통계·모바일 채팅 확장
- 구매 폼에 선택형 쿠폰 코드를 추가하고 서버가 반환한 할인 전 금액·할인액·최종 금액을 검토 화면에 그대로 표시합니다. 쿠폰과 금액은 클라이언트가 계산하지 않으며 주문 시 서명 견적과 함께 재전송합니다.
- 상품 Zod 계약과 관리자 폼에 SKU, 대분류·소분류·상세분류, 입고예정일·실입고일을 추가하고 상품 카드에 분류·입고예정을 표시합니다.
- 개인정보 안내에 분석 전용 가명키, 소규모 집단 억제, 재식별 금지, 처리기록·파기 원칙을 명시했습니다. 관리자 가명 통계·프로모션의 정확한 응답은 공통 계약 1.5.0을 따릅니다.
- 모바일 YouTube 채팅은 현재 공식 `watch_url` 동선을 사용합니다. 시청자별 Google OAuth와 공식 `streamList`/`insert` 중계가 배포되어 `custom_api_available=true`가 된 뒤에만 앱 내부 채팅 UI를 활성화합니다.

### 9. 모바일 자체 채팅 + YouTube 읽기 통합
- 모바일과 데스크톱에 `UnifiedChat`을 추가해 자체 채팅 작성 메시지와 공식 API로 수신한 YouTube 메시지를 하나의 피드에 표시합니다. 모든 메시지에는 `자체`/`YouTube` 출처 배지를 붙입니다.
- 자체 채팅은 24시간 익명 세션을 `sessionStorage`에만 보관하고 300자 제한·서버 도배 제한을 따릅니다. YouTube 메시지는 읽기 전용이며 자체 글을 YouTube로 재전송하지 않습니다.
- 자체 메시지 신고 UI를 추가했고 세션 만료·차단 시 로컬 토큰을 삭제합니다. 개인정보 안내와 이용약관에 채팅 보관기간, YouTube API 사용, Google 개인정보처리방침과 YouTube 약관 링크를 반영했습니다.
- 위 8번의 외부 `watch_url` 동선은 자체 통합 채팅이 꺼졌을 때의 fallback으로만 남습니다.

---

## 🚀 향후 개발 시 참고 (가이드라인)

1. **API 계약 준수 원칙**  
   프론트엔드에서 API 스키마(`Zod` 등)를 변경해야 할 경우, 반드시 `docs/api_contract.md` 문서를 먼저 업데이트하고 백엔드 팀과 모델 동기화 여부를 확인하세요.

2. **UI/UX 개발 기조 (Tailwind & Shadcn UI)**  
   현재 프로젝트는 TailwindCSS와 Shadcn UI를 주력 UI 프레임워크로 사용합니다. 새로운 UI를 구성할 때에는 `components/ui/` 디렉토리에 있는 재사용 가능한 Shadcn 컴포넌트(Button, Card, Input 등)를 적극적으로 활용하세요. 상태 메시지나 알림은 `sonner` 패키지를 활용합니다.

3. **결제/주문 로직의 상태 관리**  
   복잡한 주문 및 결제 흐름은 여러 컴포넌트 간의 꼬임을 막기 위해 `hooks/use-purchase-machine.ts`에서 상태 머신(State Machine) 패턴으로 관리됩니다. 단, 데이터 패칭(API 호출)은 `usePurchaseMachine` 외부 컴포넌트 레벨에서 `React Query`로 처리하며, 훅은 오직 성공 시 다음 단계로의 **상태 전이(State Transition)** 역할에만 집중합니다.

4. **개인정보·통계 경계**
   주문자명·전화번호·주소·조회 토큰을 analytics나 console에 보내지 않습니다. 분석 화면을 추가할 때도 백엔드가 제공한 가명·집계 응답만 사용하며 운영 주문 식별자와 결합하거나 재식별 기능을 만들지 않습니다.
