# 정책 식별자 및 추천 입력 필드 매핑

이 문서는 프론트엔드의 정책 식별자와 추천 조건 값을 백엔드 계약에 맞춰 사용하는 기준입니다.

- 프론트 기준 파일: `app/data/family.js`, `app/recommend/page.js`
- 백엔드 기준 파일: `docs/FIELD_MAPPING.md`, `app/common/policy_types.py`
- DB 검증 기준일: 2026-06-18

실제 `dodam` PostgreSQL을 읽기 전용으로 확인한 결과:

- `policy_raw_import`: 77건, 상세 적재 상태 77건 모두 `COMPLETED`
- `policy`: 0건
- `policy_rule`: 0건

따라서 현재 enum의 데이터 근거는 정규화 전 원본인 `policy_raw_import.list_json`과
`policy_raw_import.detail_json`입니다. 정규화 테이블 적재 후에는 같은 규칙으로 다시 검증합니다.

## 1. 정책 식별자

정책은 외부 노출용 `slug`와 DB 내부용 숫자 PK를 구분합니다.

| 용도 | 명칭 | 값 예시 | 프론트 사용 여부 |
| --- | --- | --- | --- |
| URL, API 요청, API 응답 | `slug` | `WLF00004657` | 사용 |
| 원본 적재 테이블 | `policy_raw_import.serv_id` | `WLF00004657` | API의 `slug`로 변환 |
| 정규화 정책 테이블 | `policy.policy_code` | `WLF00004657` | 원본 `serv_id`와 같은 값 |
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

현재 `app/data/policies.js`의 `parent-allowance` 같은 `id`는 화면 개발용 임시 slug입니다.
실제 API 데이터로 전환할 때는 응답의 `slug`로 교체합니다.

DB에서 확인된 예시:

| 정책 | slug |
| --- | --- |
| 부모급여 지원 | `WLF00004657` |
| 첫만남이용권 | `WLF00004656` |
| 아이돌봄서비스 | `WLF00000024` |
| 아동수당 지급 | `WLF00001171` |
| 산모·신생아 건강관리 지원사업 | `WLF00001188` |

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

현재 API 계약은 단일 `childAge`입니다. 추천·회원가입·마이페이지 화면도 한 항목만
선택하도록 맞춥니다. `childrenAges`는 기존 화면과 로컬스토리지 호환을 위해
`[childAge]` 형태로만 유지하며 API payload에는 포함하지 않습니다.

`createRecommendationPayload()`가 화면 상태에서 API 필드만 추출하고 enum을 검증합니다.

## 3. 필드별 허용 값

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
| `unknown` | 미입력/모름 | `null` |

### region

허용 값:

```text
national, seoul, busan, daegu, incheon, gwangju, daejeon, ulsan, sejong,
gyeonggi, gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk,
gyeongnam, jeju
```

현재 적재된 중앙정부 정책 원본에는 지역 코드가 없고 정규화 `policy` 테이블도 0건이라
정책 지역 필터는 아직 DB 데이터로 검증할 수 없습니다. 사용자 거주지는 백엔드
`RegionCode`와 동일한 17개 시·도 코드로 입력합니다. `national`은 정책 범위 값이므로
사용자 거주지 옵션에서는 제외합니다.

### special

백엔드 실행 코드(`SpecialCondition`)와 DB 원본 `trgterIndvdlArray`를 기준으로 다음
5개 값을 허용합니다.

| 값 | 백엔드 의미 | 정책 데이터 매칭 값 |
| --- | --- | --- |
| `single` | 한부모·조손 가족 | `한부모·조손` |
| `multi` | 다문화·탈북민 | `다문화·탈북민` |
| `disabled` | 장애인 | `장애인` |
| `many` | 다자녀 가구 | `다자녀` |
| `dual` | 저소득 가구 | `저소득` |

DB 77건에서 확인된 대상 조건은 `한부모·조손`, `다문화·탈북민`, `장애인`, `다자녀`,
`저소득`입니다. 현재 백엔드 호환을 위해 요청 값 `dual`은 **저소득 가구** 의미로만
사용합니다. 맞벌이는 DB enum이 아니며 아이돌봄서비스 등의 상세 조건 텍스트에만
등장하므로 별도 추천 규칙이 정의되기 전에는 `special` 값으로 전송하지 않습니다.

`veteran`은 현재 실행 enum에도 없고 적재된 77건의 대상 조건에서도 확인되지 않아
허용하지 않습니다.

## 4. 연동 체크리스트

- 정책 링크와 API 요청에 숫자 PK 대신 slug를 사용합니다.
- 요청 전에 모든 값이 이 문서의 enum에 포함되는지 검증합니다.
- `unknown` 소득은 DB에 빈 문자열이 아닌 `null`로 저장합니다.
- 사용자 지역에 `metro`, `etc`, `national`을 보내지 않습니다.
- `dual`은 맞벌이가 아니라 저소득 의미로만 사용합니다.
- API payload에 프론트 전용 `name`, `childrenAges`를 포함하지 않습니다.
- 백엔드 enum이 변경되면 이 문서와 `app/data/family.js`를 같은 PR에서 갱신합니다.
