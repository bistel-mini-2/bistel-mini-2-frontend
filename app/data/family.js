// =========================================================================
// 도담 — 가족 상황 입력 폼 옵션 & 기본값 (더미)
// 정책추천 폼 / 입력 요약 / 지원 가능성 분석에서 공유.
// =========================================================================

export const FAMILY_PROFILE_KEY = "dodam_family_profile";

export const FAMILY_OPTIONS = {
  stage: [
    { value: "pregnant", label: "임신 준비·임신 중" },
    { value: "newborn", label: "출산 직후 (0~1세)" },
    { value: "infant", label: "영유아 (2~5세)" },
    { value: "child", label: "아동 (6~12세)" },
    { value: "teen", label: "청소년 (13세 이상)" },
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
    { value: "gyeonggi", label: "경기·인천" },
    { value: "metro", label: "광역시" },
    { value: "etc", label: "그 외 지역" },
  ],
  special: [
    { value: "single", label: "한부모·조손 가정" },
    { value: "multi", label: "다문화 가정" },
    { value: "disabled", label: "장애아동 양육" },
    { value: "many", label: "다자녀 가정(2명 이상)" },
    { value: "dual", label: "맞벌이 가정" },
  ],
};

// 데모 기본 입력값 (요약·분석에서 사용)
export const DEFAULT_FAMILY = {
  name: "보호자",
  stage: "newborn",
  childAge: "0",
  childrenAges: ["0"],
  income: "mid1",
  region: "seoul",
  special: ["dual"],
};

export function normalizeFamilyProfile(family = {}) {
  const childrenAges =
    Array.isArray(family.childrenAges) && family.childrenAges.length
      ? family.childrenAges
      : [family.childAge || DEFAULT_FAMILY.childAge];

  return {
    ...DEFAULT_FAMILY,
    ...family,
    childAge: childrenAges[0],
    childrenAges,
    special: Array.isArray(family.special)
      ? family.special
      : DEFAULT_FAMILY.special,
  };
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
      value: profile.childrenAges.map((age) => labelOf("childAge", age)).join(", "),
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
