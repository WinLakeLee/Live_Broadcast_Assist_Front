# FastAPI 브라우저 계약

> 계약 버전과 endpoint별 정확한 JSON 구조는 [공통 API 계약](api_contract.md)이 단일 원본입니다. 이 문서는 프런트 구현 요약이며 충돌 시 공통 계약을 먼저 갱신합니다.

모든 성공/오류 응답은 `{ status, code, message, data }` JSON envelope입니다. 클라이언트는 `credentials: omit`, `cache: no-store`, `Accept: application/json`을 사용합니다.

| 메서드 | 경로 | 인증 헤더 | 용도 |
|---|---|---|---|
| POST | `/waiting-room/tickets` | 없음 | 대기표 발급 |
| GET | `/waiting-room/tickets/{ticket_id}` | `X-Waiting-Room-Token` | 대기 상태 |
| GET | `/api/products` | 대기표 2개 헤더 | 판매 상품 |
| POST | `/orders/quote` | 대기표 2개 헤더 | 서버 견적 |
| POST | `/orders` | 대기표 2개 헤더 | 주문 확정 |
| POST | `/orders/{reference}/depositor` | `X-Order-Token` | 입금정보 등록/대조 |
| GET | `/orders/{reference}/status` | `X-Order-Token` | 마스킹 주문 상태 |
| GET | `/admin/api/products` | `X-Admin-API-Key` | 전체 상품 |
| PUT | `/admin/api/products` | `X-Admin-API-Key` | 상품 저장 |

대기실이 켜진 경우 상품·견적·주문 요청에는 `X-Waiting-Room-Ticket`과 `X-Waiting-Room-Token`을 모두 보냅니다. `429`/`503`의 `Retry-After`를 우선하며, `403`은 Turnstile/입장권 재확인, `409`는 만료·변조·품목 불일치로 보고 기존 견적을 폐기합니다. 주문 시 `quote_token` 누락으로 받은 `422`도 재견적 대상으로 처리합니다. 주문 timeout은 결과가 불명확하므로 자동 재전송하지 않습니다. 잘못된 주문번호와 조회키는 동일한 `404`로 응답해야 합니다.

프런트는 상품명/수량을 보낼 뿐 단가나 가용 재고를 확정하지 않습니다. 견적 응답의 `quote_token`, `expires_at`, 품목별 `line_amount`를 그대로 보관·표시하고 브라우저에서 금액을 다시 계산하지 않습니다. 주문 확정 요청은 바로 전 견적의 `quoted_amount`와 `quote_token`, 사용자 동의 후 얻은 `push_token`을 함께 보내며 서버가 모두 다시 검증합니다. 푸시 토큰이 없으면 빈 문자열을 보냅니다.

입금 차액 표시는 서버 `status`를 우선합니다. 입금 대조 및 주문 상태 응답의 `courier`는 `{ provider: "cu_lotte", display_name: "CU(롯데택배)", tracking_url }` 형식이며, 프런트는 서버가 제공한 HTTPS `tracking_url`만 외부 운송장 링크로 노출합니다. 푸시 알림은 상태 변경 신호로만 취급하고 표시할 상태는 `/orders/{reference}/status`에서 다시 조회합니다.
