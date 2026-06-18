# AI Status UI Mapping

프론트는 AI 응답 상태를 화면마다 임의로 해석하지 않고 `app/types/aiStatus.js`의 공통 타입/헬퍼를 사용한다.

## RequestStatus

API 응답의 `status` 필드로 내려오는 비동기 요청 생명주기 상태다.

| API 값 | UI 기준 | variant |
| --- | --- | --- |
| `READY` | 요청 준비 또는 초기 상태 | `idle` |
| `PROCESSING` | 로딩/스피너 표시 | `loading` |
| `COMPLETED` | 결과 화면 표시 | `success` |
| `FOLLOW_UP_REQUIRED` | 후속 질문 또는 추가 정보 입력 UI 표시 | `warning` |
| `FAILED` | 에러 UI 표시 | `error` |

`loading`, `success`, `warning`, `error` 등은 API 값이 아니라 프론트 UI variant다. API `status` 값으로 `loading`, `done`, `error`, `PENDING`, `PARTIAL`을 기대하지 않는다.

## UserStatus

API 응답의 `user_status` 필드로 내려오는 사용자 노출 판단 결과다.

| API 값 | UI 기준 | variant |
| --- | --- | --- |
| `RECOMMENDABLE` | 추천 가능 | `success` |
| `NEEDS_CONFIRMATION` | 추가 확인 필요 | `warning` |
| `DIFFICULT_TO_RECOMMEND` | 추천 어려움 | `error` |

사용자 판단 결과는 `user_status`의 `UserStatus`를 기준으로 표시한다.

## AssessmentStatus

`AssessmentStatus`는 백엔드 내부 판단 상태이며 사용자 UI 기준으로 직접 사용하지 않는다.

허용 값은 `LIKELY_MATCH`, `NEEDS_MORE_INFO`, `NOT_MATCH`, `INSUFFICIENT_PROFILE`, `CONFLICTING_PROFILE`이다. API 응답에 포함되더라도 화면 표시 기준은 `user_status`를 우선 사용한다.

## Frontend Helper

- `getRequestStatusUi(status)`는 `RequestStatus`를 `{ label, description, variant }`로 매핑한다.
- `getUserStatusUi(status)`는 `UserStatus`를 `{ label, description, variant }`로 매핑한다.
- `getAiStatusPillClass(variant)`는 기존 `dd-pill-*` CSS 클래스와 UI variant를 연결한다.

추천 결과, 정책 상세 AI 요약, 지원 가능성 분석 화면은 이 공통 helper를 재사용한다.
