// =========================================================================
// 도담 — 가족 상황 입력 폼 옵션 & 추천 요청 계약
// 정책추천 폼 / 입력 요약 / 지원 가능성 분석에서 공유.
// =========================================================================

export const FAMILY_PROFILE_KEY = "dodam_family_profile";

export const FAMILY_OPTIONS = {
  stage: [
    { value: "pregnant", label: "임신 준비·임신 중" },
    { value: "newborn", label: "출산 직후·신생아" },
    { value: "infant", label: "영유아" },
    { value: "child", label: "아동" },
    { value: "teen", label: "청소년" },
  ],
  childAge: [
    { value: "preborn", label: "출생 전" },
    { value: "0", label: "0세 (12개월 미만)" },
    { value: "1", label: "1세" },
    { value: "2-5", label: "2~5세" },
    { value: "6-12", label: "6~12세" },
    { value: "13+", label: "13세 이상" },
  ],
  income: [
    { value: "low", label: "중위소득 50% 이하" },
    { value: "mid1", label: "중위소득 51~100%" },
    { value: "mid2", label: "중위소득 101~150%" },
    { value: "high", label: "중위소득 150% 초과" },
    { value: "unknown", label: "잘 모르겠어요" },
  ],
  region: [
    { value: "seoul", label: "서울" },
    { value: "busan", label: "부산" },
    { value: "daegu", label: "대구" },
    { value: "incheon", label: "인천" },
    { value: "gwangju", label: "광주" },
    { value: "daejeon", label: "대전" },
    { value: "ulsan", label: "울산" },
    { value: "sejong", label: "세종" },
    { value: "gyeonggi", label: "경기" },
    { value: "gangwon", label: "강원" },
    { value: "chungbuk", label: "충북" },
    { value: "chungnam", label: "충남" },
    { value: "jeonbuk", label: "전북" },
    { value: "jeonnam", label: "전남" },
    { value: "gyeongbuk", label: "경북" },
    { value: "gyeongnam", label: "경남" },
    { value: "jeju", label: "제주" },
  ],
  special: [
    { value: "single", label: "한부모·조손 가정" },
    { value: "multi", label: "다문화·탈북민 가정" },
    { value: "disabled", label: "장애인 가구" },
    { value: "many", label: "다자녀 가정(2명 이상)" },
    { value: "dual", label: "저소득 가구" },
  ],
};

export const FAMILY_ENUM_VALUES = Object.fromEntries(
  Object.entries(FAMILY_OPTIONS).map(([key, options]) => [
    key,
    options.map(({ value }) => value),
  ])
);

// 데모 기본 입력값 (요약·분석에서 사용)
export const DEFAULT_FAMILY = {
  name: "보호자",
  stage: "newborn",
  childAge: "0",
  childrenAges: ["0"],
  income: "mid1",
  region: "seoul",
  special: [],
};

export function normalizeFamilyProfile(family = {}) {
  const childAge =
    family.childAge ||
    (Array.isArray(family.childrenAges) && family.childrenAges[0]) ||
    DEFAULT_FAMILY.childAge;

  return {
    ...DEFAULT_FAMILY,
    ...family,
    childAge,
    // 기존 화면·로컬스토리지 호환용 파생값. API 계약은 단일 childAge를 사용한다.
    childrenAges: [childAge],
    special: Array.isArray(family.special)
      ? family.special
      : DEFAULT_FAMILY.special,
  };
}

export function createRecommendationPayload(family = DEFAULT_FAMILY) {
  if (
    Object.prototype.hasOwnProperty.call(family, "special") &&
    !Array.isArray(family.special)
  ) {
    throw new Error("Invalid family profile value: special must be an array");
  }

  const profile = normalizeFamilyProfile(family);
  const payload = {
    stage: profile.stage,
    childAge: profile.childAge,
    income: profile.income,
    region: profile.region,
    special: [...profile.special],
  };

  for (const [key, value] of Object.entries(payload)) {
    const values = Array.isArray(value) ? value : [value];
    const allowedValues = FAMILY_ENUM_VALUES[key] || [];
    const invalidValue = values.find((item) => !allowedValues.includes(item));

    if (invalidValue) {
      throw new Error(`Invalid family profile value: ${key}=${invalidValue}`);
    }
  }

  return payload;
}

// value -> label 변환
export function labelOf(group, value) {
  const found = (FAMILY_OPTIONS[group] || []).find((o) => o.value === value);
  return found ? found.label : value;
}

// 입력 요약을 표 형태 행으로
export function familyRows(family = DEFAULT_FAMILY) {
  const profile = normalizeFamilyProfile(family);

  return [
    { label: "가족 구성", value: labelOf("stage", profile.stage) },
    {
      label: "자녀 연령대",
      value: labelOf("childAge", profile.childAge),
    },
    { label: "가구 소득", value: labelOf("income", profile.income) },
    { label: "거주 지역", value: labelOf("region", profile.region) },
    {
      label: "특수 상황",
      value:
        profile.special && profile.special.length
          ? profile.special.map((s) => labelOf("special", s)).join(", ")
          : "해당 없음",
    },
  ];
}
