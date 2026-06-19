# 정책 식별자 및 추천 입력 필드 매핑

이 문서는 프론트엔드의 정책 식별자와 추천 조건 값을 백엔드 계약에 맞춰 사용하는 기준입니다.

- 프론트 기준 파일: `app/data/family.js`, `app/recommend/page.js`
- 백엔드 실행 코드 기준: `app/common/policy_types.py`
- 백엔드 문서 기준: `docs/FIELD_MAPPING.md`
- 대조 기준: 백엔드 `origin/chore/21-backend-policy-identifier-mapping`
  브랜치의 `d3eefe0` 커밋 (2026-06-18 확인)

백엔드 `develop`에는 아직 추천 API와 위 매핑 파일이 병합되지 않았습니다. 따라서 이 문서의
요청 형태는 백엔드 매핑 브랜치와 합의하기 위한 **연동 초안**이며, 실제 API가 구현될 때
요청 스키마와 함께 다시 검증해야 합니다.

## 1. 정책 식별자

정책은 외부 노출용 `slug`와 DB 내부용 숫자 PK를 구분합니다.

| 용도 | 명칭 | 값 예시 | 프론트 사용 여부 |
| --- | --- | --- | --- |
| URL, API 요청, API 응답 | `slug` | `WLF00004657` | 사용 |
| 현재 구현된 원본 적재 테이블 | `policy_raw_import.serv_id` | `WLF00004657` | 향후 API의 `slug`로 변환 |
| 백엔드 문서상 정규화 필드 | `policy.policy_code` | `WLF00004657` | 원본 `serv_id`와 같은 값 |
| 백엔드 문서상 DB PK/FK | `policy_id` | `1`, `42` | 라우팅에 사용하지 않음 |

### slug 생성 규칙

- 공공데이터 API의 `servId`를 변경 없이 사용합니다.
- 형식은 대문자 `WLF`와 숫자 8자리이며 정규식은 `^WLF[0-9]{8}$`입니다.
- 생성 후에는 정책명이나 표시 문구가 바뀌어도 slug를 변경하지 않습니다.
- 프론트 라우트와 API 경로에는 숫자 PK가 아닌 slug를 사용합니다.

```text
/policies/WLF00000024
/policies/WLF00000024/eligibility
/policies/WLF00000024/apply
```

샘플:

- `WLF00000024`
- `WLF00000028`
- `WLF00000030`
- `WLF00000037`
- `WLF00000040`
- `WLF00001121`

현재 `app/data/policies.js`의 `parent-allowance` 같은 `id`는 화면 개발용 임시 slug입니다.
실제 API 데이터로 전환할 때는 응답의 `slug`로 교체합니다.

백엔드의 현재 실행 코드에는 공개 정책 조회 API나 정규화 `policy` 모델이 아직 없습니다.
백엔드 문서가 제안한 API 경로는 `/api/v1/policies/{policy_code}`이며, 프론트 화면 경로는
`/policies/{slug}`를 사용합니다.

## 2. `POST /recommendations` 요청 초안

프론트 상태와 요청 payload는 camelCase를 사용하고, 백엔드가 내부 변수 및 DB 값으로 변환합니다.
백엔드에는 아직 이 엔드포인트가 없으므로 프론트도 네트워크 요청을 보내지 않고, 현재는
`createRecommendationPayload()`로 동일한 형태를 생성·검증합니다.

| 프론트/payload 필드 | 백엔드 내부 변수 | 타입 | DB 연관 |
| --- | --- | --- | --- |
| `stage` | `target_stage` | `LifeStage` | `family_member.life_stage` |
| `childAge` | `child_age` | `ChildAge` | `family_member.birth_year`에서 파생 |
| `income` | `income_level` | `IncomeLevel` | `user_profile.income_bracket` |
| `region` | `region_code` | `RegionCode` | `user_profile.region_code`, `policy.region_code` |
| `special` | `special_conditions` | `SpecialCondition[]` | 정책 대상 조건과 매칭 |

`special[]`은 문서에서 배열임을 나타내는 표기이며, 실제 JSON 키는 `special`입니다.

```json
{
  "stage": "newborn",
  "childAge": "0",
  "income": "mid1",
  "region": "seoul",
  "special": ["many"]
}
```

요청은 `Content-Type: application/json`을 사용하며 위 다섯 필드만 전송합니다. 프론트 전용
`name`, 호환용 `childrenAges` 및 그 밖의 화면 상태는 요청에서 제외합니다.

현재 API 계약은 단일 `childAge`입니다. 추천·회원가입·마이페이지 화면도 한 항목만
선택하도록 맞춥니다. `childrenAges`는 기존 화면과 로컬스토리지 호환을 위해
`[childAge]` 형태로만 유지하며 API payload에는 포함하지 않습니다.

`createRecommendationPayload()`가 화면 상태에서 API 필드만 추출하고 enum을 검증합니다.

## 3. 가족 프로필 저장 API

가족 상황은 계정 요약 API(`GET /api/v1/users/me`)에 섞지 않고 별도 도메인 API로 저장합니다.

```text
GET /api/v1/family-profiles/me
PUT /api/v1/family-profiles/me
```

`PUT /api/v1/family-profiles/me` 요청은 프론트 가족 상황 모델과 같은 필드를 사용합니다.
백엔드는 이 값을 내부 저장 모델(`region_code`, `income_bracket`, `family_members` 등)로 변환합니다.

```json
{
  "stage": "newborn",
  "childAge": "0",
  "income": "mid1",
  "region": "seoul",
  "special": ["many"]
}
```

응답은 공통 `ApiResponse` 래퍼의 `data.family_profile`에 저장된 가족 프로필을 반환합니다.

```json
{
  "success": true,
  "data": {
    "family_profile": {
      "stage": "newborn",
      "childAge": "0",
      "income": "mid1",
      "region": "seoul",
      "special": ["many"],
      "updated_at": "2026-06-18T00:00:00Z"
    }
  },
  "error": null,
  "meta": {}
}
```

`users/me`는 `user_id`, `email`, `nickname`, `role` 같은 계정 요약만 반환하고 가족 상황을 포함하지 않습니다.
닉네임 수정은 `PATCH /api/v1/users/me`에 `{ "nickname": "새 닉네임" }`을 보내며, 이메일 변경은 지원하지 않습니다.
마이페이지 계정 정보에서 이메일은 보기 전용으로만 표시하고, `role`은 일반 사용자에게 노출하지 않습니다.
비밀번호 변경은 `PUT /api/v1/users/me/password`에 `current_password`, `new_password`를 보내 처리합니다.
`new_password`는 `current_password`와 달라야 합니다.

회원가입 온보딩에서 `가족 상황 입력하기`를 누를 때는 `POST /api/v1/auth/signup/validate`로
`email`, `password`, `nickname`을 보내 계정 생성 없이 입력값과 중복 여부를 먼저 확인합니다.
실제 계정 생성, access token 저장, 가족 프로필 저장은 마지막 `가입하고 시작하기`에서
`POST /api/v1/auth/signup` 성공 후 `PUT /api/v1/family-profiles/me` 순서로 처리합니다.

## 4. 필드별 허용 값

### stage

| 값 | 의미 | 정부 API 코드 |
| --- | --- | --- |
| `pregnant` | 임신 준비·임신 중 | `007` |
| `newborn` | 신생아(0~12개월) | `001` |
| `infant` | 영유아(1~6세) | `001` |
| `child` | 아동(7~12세) | `002` |
| `teen` | 청소년(13~18세) | `003` |

DB의 `lifeArray`에는 실제로 `임신 · 출산`, `영유아`, `아동`, `청소년`, `청년`,
`중장년`, `노년`이 저장되어 있습니다. `newborn`과 `infant`는 모두 `영유아`로
매핑되므로 세부 연령 판정에는 `childAge`와 정책 상세 조건을 함께 사용해야 합니다.

### childAge

| 값 | 의미 |
| --- | --- |
| `preborn` | 출생 전 |
| `0` | 0세 |
| `1` | 1세 |
| `2-5` | 2~5세 |
| `6-12` | 6~12세 |
| `13+` | 13세 이상 |

### income

| 값 | 의미 | DB `income_bracket` |
| --- | --- | --- |
| `low` | 기준 중위소득 50% 이하 | `"50"` |
| `mid1` | 50% 초과~100% 이하 | `"100"` |
| `mid2` | 100% 초과~150% 이하 | `"150"` |
| `high` | 150% 초과 | `"200"` |
| `unknown` | 미입력/모름 | 백엔드 실행 코드 `""`, 백엔드 문서 `null` |

프론트 요청 값은 두 경우 모두 `unknown`입니다. 저장값의 빈 문자열/`null` 불일치는
백엔드 구현 시 하나로 확정해야 하며, 프론트가 임의로 변환하지 않습니다.

### region

허용 값:

```text
national, seoul, busan, daegu, incheon, gwangju, daejeon, ulsan, sejong,
gyeonggi, gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk,
gyeongnam, jeju
```

사용자 거주지는 백엔드 `RegionCode`와 동일한 17개 시·도 코드로 입력합니다.
`national`은 정책 범위 값이므로 사용자 거주지 옵션에서는 제외합니다.

### special

백엔드 실행 코드(`SpecialCondition`, `SPECIAL_CONDITION_TO_DB`)를 기준으로 다음
5개 값을 허용합니다.

| 값 | 백엔드 의미 | 백엔드 변환 값 |
| --- | --- | --- |
| `single` | 한부모·조손 가족 | `한부모·조손` |
| `multi` | 다문화·탈북민 | `다문화·탈북민` |
| `disabled` | 장애인 | `장애인` |
| `many` | 다자녀 가구 | `다자녀` |
| `dual` | 맞벌이 가구 | `맞벌이` |

백엔드 문서에는 `veteran`이 있지만 실행 enum과 변환 맵에는 없습니다. 런타임 검증을
우선하여 프론트에서는 허용하지 않으며, 백엔드가 실행 enum을 추가한 뒤 함께 반영합니다.

## 5. 백엔드 대조 결과

| 항목 | 프론트 상태 | 백엔드 대조 결과 |
| --- | --- | --- |
| `stage` | 임신~청소년 5개 | 실행 enum의 가족 정책 관련 부분집합. 성인 3개 값은 현재 화면 범위에서 제외 |
| `childAge` | 6개, 단일 선택 | 실행 enum과 일치 |
| `income` | 5개 | 요청 enum은 일치. `unknown` 저장값은 백엔드 문서/코드 불일치 |
| `region` | 17개 시·도 | 실행 enum과 일치. 정책 범위용 `national`만 사용자 입력에서 제외 |
| `special` | 5개 | 실행 enum과 일치. 백엔드 문서의 `veteran`은 실행 코드에 없음 |
| 정책 slug | `WLF` + 숫자 8자리 | 백엔드 문서 규칙 및 원본 `serv_id` 사용 방식과 일치 |
| 추천 API | payload 생성만 구현 | 백엔드 엔드포인트·Pydantic 요청 스키마 미구현 |

## 6. 연동 체크리스트

- 정책 링크와 API 요청에 숫자 PK 대신 slug를 사용합니다.
- 요청 전에 모든 값이 이 문서의 enum에 포함되는지 검증합니다.
- 소득을 모르는 경우 프론트는 `unknown`을 전송하고 저장값 변환은 백엔드가 담당합니다.
- 사용자 지역에 `metro`, `etc`, `national`을 보내지 않습니다.
- API payload에 프론트 전용 `name`, `childrenAges`를 포함하지 않습니다.
- 가족 상황 저장은 `/api/v1/family-profiles/me`를 사용하고, `users/me`에 가족 조건을 섞지 않습니다.
- 백엔드가 `POST /recommendations`를 구현하면 실제 Pydantic 스키마로 계약 테스트를 추가합니다.
- 백엔드 enum이 변경되면 이 문서와 `app/data/family.js`를 같은 PR에서 갱신합니다.
