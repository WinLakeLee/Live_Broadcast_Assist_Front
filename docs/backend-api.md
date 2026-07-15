# FastAPI 브라우저 계약

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

대기실이 켜진 경우 상품·견적·주문 요청에는 `X-Waiting-Room-Ticket`과 `X-Waiting-Room-Token`을 모두 보냅니다. `429`/`503`의 `Retry-After`를 우선하며, `403`은 Turnstile/입장권 재확인, `409`는 기존 견적 폐기, 주문 timeout은 고객지원 확인으로 처리합니다. 잘못된 주문번호와 조회키는 동일한 `404`로 응답해야 합니다.

프런트는 상품명/수량을 보낼 뿐 단가나 가용 재고를 확정하지 않습니다. `quoted_amount`는 바로 전 서버 견적의 금액이며 서버가 다시 검증합니다. 입금 차액 표시는 서버 `status`를 우선합니다.
