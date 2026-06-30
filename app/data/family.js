export const FAMILY_PROFILE_KEY = "dodam_family_profile";
export const RECOMMENDATION_INPUT_KEY = "dodam_recommendation_input";

const SUPPORTED_SPECIAL_VALUES = ["single", "multi", "disabled", "many", "dual"];

export const FAMILY_OPTIONS = {
  stage: [
    { value: "pregnant", label: "임신·출산" },
    { value: "newborn", label: "신생아" },
    { value: "infant", label: "영유아" },
    { value: "child", label: "아동" },
    { value: "teen", label: "청소년" },
  ],
  childAge: [
    { value: "preborn", label: "출생 전" },
    { value: "0", label: "0세(12개월 미만)" },
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
    { value: "single", label: "한부모 가족" },
    { value: "multi", label: "다문화·조손 가족" },
    { value: "disabled", label: "장애인 가구" },
    { value: "many", label: "다자녀 가구(2명 이상)" },
    { value: "dual", label: "맞벌이" },
  ],
};

export const FAMILY_ENUM_VALUES = Object.fromEntries(
  Object.entries(FAMILY_OPTIONS).map(([key, options]) => [
    key,
    options.map(({ value }) => value),
  ])
);

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
    childrenAges: [childAge],
    special: Array.isArray(family.special)
      ? family.special.filter((item) => SUPPORTED_SPECIAL_VALUES.includes(item))
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

export function createFamilyProfilePayload(family = DEFAULT_FAMILY) {
  return createRecommendationPayload(family);
}

export function labelOf(group, value) {
  const found = (FAMILY_OPTIONS[group] || []).find((option) => option.value === value);
  return found ? found.label : value;
}

export function familyRows(family = DEFAULT_FAMILY) {
  const profile = normalizeFamilyProfile(family);

  return [
    { label: "가족 구성", value: labelOf("stage", profile.stage) },
    { label: "자녀 연령대", value: labelOf("childAge", profile.childAge) },
    { label: "가구 소득", value: labelOf("income", profile.income) },
    { label: "거주 지역", value: labelOf("region", profile.region) },
    {
      label: "특수 상황",
      value:
        profile.special && profile.special.length
          ? profile.special.map((item) => labelOf("special", item)).join(", ")
          : "해당 없음",
    },
  ];
}
