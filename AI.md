# AI.md - Live Broadcast Assist Frontend 개발 내역

이 문서는 AI 및 개발자가 프론트엔드 프로젝트(`Live_Broadcast_Assist_Front`)의 전체 개발 맥락과 변경 내역을 파악하고, 추후 기능 추가 및 유지보수 시 참고할 수 있도록 작성된 문서입니다.

## 📌 주요 변경 내역 (Git History 요약)

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

---

## 🚀 향후 개발 시 참고 (가이드라인)

1. **API 계약 준수 원칙**  
   프론트엔드에서 API 스키마(`Zod` 등)를 변경해야 할 경우, 반드시 `docs/api_contract.md` 문서를 먼저 업데이트하고 백엔드 팀과 모델 동기화 여부를 확인하세요.

2. **UI/UX 개발 기조 (Vanilla CSS & Semantic HTML)**  
   현재 프로젝트는 트래픽 대응 성능 향상과 세밀한 디자인 제어를 위해 무거운 외부 프레임워크나 유틸리티 클래스(`TailwindCSS` 등) 없이, 시맨틱 태그(`form`, `section` 등)와 `className` 위주의 바닐라 CSS로 구축되어 있습니다. 향후 컴포넌트 라이브러리 도입이 필요해지면 논의 후 일괄 마이그레이션을 검토합니다.

3. **결제/주문 로직의 상태 관리**  
   복잡한 주문 및 결제 흐름은 여러 컴포넌트 간의 꼬임을 막기 위해 `hooks/use-purchase-machine.ts`에서 상태 머신(State Machine) 패턴으로 관리됩니다. 결제 정책이 변경되면 반드시 이 훅의 상태 전이(`Reducer`) 로직을 우선 검토하세요.
