# 정책 식별자 및 추천 입력 필드 매핑

이 문서는 프론트엔드의 정책 식별자와 추천 조건 값을 백엔드 계약에 맞춰 사용하는 기준입니다.

- 프론트 기준 파일: `app/data/family.js`, `app/recommend/page.js`
- 백엔드 기준 파일: `docs/FIELD_MAPPING.md`, `app/common/policy_types.py`
- 기준 확인일: 2026-06-18

## 1. 정책 식별자

정책은 외부 노출용 `slug`와 DB 내부용 숫자 PK를 구분합니다.

| 용도 | 명칭 | 값 예시 | 프론트 사용 여부 |
| --- | --- | --- | --- |
| URL, API 요청, API 응답 | `slug` | `WLF00004611` | 사용 |
| 정책 DB 원본 컬럼 | `policy_code` | `WLF00004611` | API의 `slug`와 같은 값 |
| DB PK/FK | `policy_id` | `1`, `42` | 라우팅에 사용하지 않음 |

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

현재 `app/data/policies.js`의 `parent-allowance` 같은 `id`는 화면 개발용 임시 slug입니다. 실제 API 데이터로 전환할 때는 응답의 `slug`로 교체합니다.

## 2. 추천 입력 필드 매핑

프론트 상태와 요청 payload는 camelCase를 사용하고, 백엔드가 내부 변수 및 DB 값으로 변환합니다.

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

프론트의 `childrenAges`는 여러 자녀 연령을 보관하기 위한 화면 상태입니다. 현재 API 계약의 `childAge`는 단일 값이므로 `normalizeFamilyProfile()`이 첫 번째 선택값을 `childAge`에 반영합니다. 복수 연령 전송은 별도 API 계약 변경 후 적용합니다.

## 3. 필드별 허용 값

### stage

| 값 | 의미 | 정부 API 코드 |
| --- | --- | --- |
| `pregnant` | 임신 준비·임신 중 | `007` |
| `newborn` | 신생아(0~12개월) | `001` |
| `infant` | 영유아(1~6세) | `001` |
| `child` | 아동(7~12세) | `002` |
| `teen` | 청소년(13~18세) | `003` |

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
| `unknown` | 미입력/모름 | `null` |

### region

허용 값:

```text
national, seoul, busan, daegu, incheon, gwangju, daejeon, ulsan, sejong,
gyeonggi, gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk,
gyeongnam, jeju
```

현재 적재된 중앙정부 정책은 지역 정보가 없으므로 `national`로 취급합니다. 프론트의 기존 그룹 값 `metro`, `etc`는 백엔드 enum이 아니며 API payload로 보내지 않습니다. 시·도 단위 옵션으로 바꾸는 작업은 프론트 이슈 #41에서 처리합니다.

### special

백엔드 실행 코드(`SpecialCondition`)를 기준으로 다음 5개 값을 허용합니다.

| 값 | 백엔드 의미 | 정책 데이터 매칭 값 |
| --- | --- | --- |
| `single` | 한부모·조손 가족 | `한부모·조손` |
| `multi` | 다문화·탈북민 | `다문화·탈북민` |
| `disabled` | 장애인 | `장애인` |
| `many` | 다자녀 가구 | `다자녀` |
| `dual` | 저소득 가구 | `저소득` |

주의: 현재 프론트는 `dual`을 “맞벌이 가정”으로 표시하지만 백엔드는 “저소득 가구”로 해석합니다. 의미가 다른 상태로 API에 전송하면 안 되며, 옵션 수정 전까지 `dual` 전송을 보류합니다. 백엔드 문서에만 있는 `veteran`은 실행 enum에 없으므로 허용하지 않습니다.

## 4. 연동 체크리스트

- 정책 링크와 API 요청에 숫자 PK 대신 slug를 사용합니다.
- 요청 전에 모든 값이 이 문서의 enum에 포함되는지 검증합니다.
- `unknown` 소득은 DB에 빈 문자열이 아닌 `null`로 저장합니다.
- `metro`, `etc`, 현재 의미의 `dual`을 API로 보내지 않습니다.
- 백엔드 enum이 변경되면 이 문서와 `app/data/family.js`를 같은 PR에서 갱신합니다.
