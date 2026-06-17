// =========================================================================
// 도담 — 정책 더미 데이터
// 실제 API(axios) 대신 사용하는 정적 데이터. 모든 페이지/모달이 공유한다.
// 출처 표기는 학습/데모용 안내이며 실제 신청 정보는 공식 기관 확인 필요.
// =========================================================================
import { normalizeFamilyProfile } from "@/app/data/family";

// 분야(카테고리) 필터용
export const CATEGORIES = [
  { key: "all", label: "전체" },
  { key: "cash", label: "양육비·수당" },
  { key: "voucher", label: "바우처" },
  { key: "care", label: "돌봄" },
  { key: "health", label: "건강·의료" },
  { key: "house", label: "주거" },
];

export const POLICIES = [
  {
    id: "parent-allowance",
    name: "부모급여",
    icon: "Wallet",
    category: "cash",
    tag: "양육비",
    tagTone: "coral",
    summary: "0~1세 아이를 키우는 가정에 매달 현금을 지원해요.",
    amount: "월 35만~100만원",
    period: "상시 신청 (출생일 포함 60일 이내 권장)",
    agency: "보건복지부 · 주민센터",
    type: "현금 지원",
    voucher: "아니오",
    region: "전국",
    status: "신청 가능",
    contact: "보건복지상담센터 129",
    url: "https://www.bokjiro.go.kr",
    easySummary:
      "0세 아이는 매달 100만원, 1세 아이는 매달 50만원을 현금으로 받을 수 있어요(2024년 기준). 소득과 관계없이 신청할 수 있어 받을 가능성이 높은 편이에요. 어린이집을 다니면 보육료를 뺀 차액이 지급돼요.",
    detail: {
      target:
        "만 0~1세(0~23개월) 아동을 키우는 가정. 소득·재산 기준 없이 누구나 신청할 수 있어요.",
      content:
        "0세(0~11개월)는 월 100만원, 1세(12~23개월)는 월 50만원을 매달 25일 지급해요. 어린이집·종일제 아이돌봄을 이용하면 해당 비용을 뺀 차액을 현금으로 받아요.",
      method:
        "출생신고와 함께 주민센터를 방문하거나, 정부24·복지로에서 온라인으로 신청해요. '행복출산 원스톱 서비스'로 여러 지원을 한 번에 신청할 수 있어요.",
      periodText:
        "상시 신청. 출생일을 포함해 60일 이내에 신청하면 출생월부터 소급 지급돼요.",
      documents: ["신청자 신분증", "아동 출생 정보(출생신고 시 자동 연계)", "지급받을 통장 사본"],
      cautions: [
        "60일이 지나 신청하면 소급 적용이 안 되고 신청한 달부터 지급돼요.",
        "부모가 아닌 보호자가 신청할 때는 별도 서류가 필요할 수 있어요.",
      ],
    },
    eligibility: {
      level: "high",
      summary: "소득 조건이 없어 받을 가능성이 높아요.",
      criteria: [
        { label: "지원대상(연령)", status: "ok", note: "만 0~1세 — 충족" },
        { label: "소득 기준", status: "ok", note: "소득 무관 — 충족" },
        { label: "거주지", status: "ok", note: "국내 거주 — 충족" },
        { label: "중복 수급", status: "check", note: "어린이집 이용 시 차액 지급으로 조정" },
      ],
    },
    related: ["first-meet", "child-allowance", "care-service"],
  },
  {
    id: "first-meet",
    name: "첫만남이용권",
    icon: "Gift",
    category: "voucher",
    tag: "바우처",
    tagTone: "amber",
    summary: "출산 가정에 바우처로 초기 양육 비용을 보태드려요.",
    amount: "첫째 200만원 / 둘째 이상 300만원",
    period: "출생일로부터 1년 이내 신청",
    agency: "보건복지부 · 주민센터",
    type: "바우처(국민행복카드)",
    voucher: "예",
    region: "전국",
    status: "신청 가능",
    contact: "보건복지상담센터 129",
    url: "https://www.bokjiro.go.kr",
    easySummary:
      "출산하면 아이 한 명당 200만원(둘째부터 300만원)을 국민행복카드 포인트로 받아요. 소득과 관계없이 받을 수 있고, 유흥·사행업종 등 일부를 빼면 자유롭게 쓸 수 있어요.",
    detail: {
      target:
        "출생신고가 된 모든 출생아. 소득·재산 기준 없이 출산 가정 누구나 받을 수 있어요.",
      content:
        "출생아 1인당 첫째는 200만원, 둘째 이상은 300만원을 국민행복카드 바우처 포인트로 지급해요. 사용 기한은 보통 아동 출생일로부터 1년이에요.",
      method:
        "주민센터 방문 또는 정부24·복지로에서 온라인 신청. 출생신고와 함께 행복출산 원스톱으로 신청하면 편해요.",
      periodText: "아동 출생일로부터 1년 이내 신청, 지급일로부터 약 1년간 사용 가능.",
      documents: ["신청자 신분증", "국민행복카드(없으면 카드사에서 발급)", "출생신고 정보"],
      cautions: [
        "사용 기한이 지나면 잔액이 소멸돼요.",
        "유흥·사행·레저 등 일부 업종에서는 사용이 제한돼요.",
      ],
    },
    eligibility: {
      level: "high",
      summary: "출산 가정이면 소득과 무관하게 받을 가능성이 높아요.",
      criteria: [
        { label: "지원대상", status: "ok", note: "출생신고 아동 — 충족" },
        { label: "소득 기준", status: "ok", note: "소득 무관 — 충족" },
        { label: "신청기간", status: "check", note: "출생 후 1년 이내 신청 필요" },
        { label: "거주지", status: "ok", note: "국내 거주 — 충족" },
      ],
    },
    related: ["parent-allowance", "postnatal-care"],
  },
  {
    id: "care-service",
    name: "아이돌봄서비스",
    icon: "HandHeart",
    category: "care",
    tag: "돌봄",
    tagTone: "green",
    summary: "돌봄 공백 시간에 전문 돌보미가 아이를 돌봐드려요.",
    amount: "소득별 시간당 1,500~5,000원 본인부담",
    period: "상시 신청 (이용 전 정부지원 판정)",
    agency: "여성가족부 · 아이돌봄 지원사업",
    type: "돌봄 서비스(시간제/종일제)",
    voucher: "예",
    region: "전국(지역별 운영기관)",
    status: "신청 가능",
    contact: "아이돌봄 1577-2514",
    url: "https://idolbom.go.kr",
    easySummary:
      "맞벌이 등으로 돌봄이 어려운 시간에 돌보미가 집으로 와서 아이를 돌봐줘요. 가구 소득에 따라 정부가 비용의 일부~대부분을 지원해서 본인부담이 줄어들어요.",
    detail: {
      target:
        "만 3개월~12세 아동을 둔 맞벌이·다자녀·취업준비 등 돌봄 공백이 있는 가정. 가구 소득에 따라 정부지원 비율이 달라져요.",
      content:
        "시간제(필요한 시간만)·종일제(영아 종일 돌봄) 서비스를 제공해요. 소득 유형(가~라형)에 따라 정부가 이용요금의 일부를 지원해 본인부담이 낮아져요.",
      method:
        "복지로에서 '정부지원 판정' 신청 → 소득 확인 후 아이돌봄 누리집/앱에서 돌보미를 연계 신청해요.",
      periodText: "상시 신청. 정부지원 판정에는 영업일 기준 며칠이 걸릴 수 있어요.",
      documents: ["가족관계 확인 서류", "맞벌이 등 증빙(재직증명 등)", "건강보험료 납부확인서"],
      cautions: [
        "정부지원 판정 전에 이용하면 전액 본인부담이 될 수 있어요.",
        "지역·시기에 따라 돌보미 연계가 대기될 수 있어요.",
      ],
    },
    eligibility: {
      level: "mid",
      summary: "돌봄 공백 사유와 소득 확인이 필요해 '보통'이에요.",
      criteria: [
        { label: "지원대상(연령)", status: "ok", note: "만 3개월~12세 — 충족" },
        { label: "돌봄 공백 사유", status: "check", note: "맞벌이 등 증빙 필요" },
        { label: "소득 기준", status: "check", note: "소득 유형별 지원율 차등" },
        { label: "중복 수급", status: "check", note: "보육료 등과 시간 조정 필요" },
      ],
    },
    related: ["parent-allowance", "child-allowance"],
  },
  {
    id: "postnatal-care",
    name: "산모·신생아 건강관리",
    icon: "Stethoscope",
    category: "health",
    tag: "건강",
    tagTone: "blue",
    summary: "출산 직후 건강관리사가 산모와 아기를 방문 케어해요.",
    amount: "바우처 지원 (소득·태아수별 차등)",
    period: "출산 예정 40일 전 ~ 출산 후 30일 이내",
    agency: "보건복지부 · 보건소",
    type: "바우처(국민행복카드)",
    voucher: "예",
    region: "전국(보건소)",
    status: "신청 가능",
    contact: "보건복지상담센터 129",
    url: "https://www.bokjiro.go.kr",
    easySummary:
      "출산 후 전문 건강관리사가 집으로 와서 산모 회복과 신생아 돌봄을 도와줘요. 소득 기준에 따라 바우처로 비용을 지원하고, 지역에 따라 기준이 더 넓은 곳도 있어요.",
    detail: {
      target:
        "기준중위소득 150% 이하 출산 가정(지자체별 기준 확대 가능). 출산 예정이거나 출산한 산모.",
      content:
        "건강관리사가 방문해 산모 영양·체조, 신생아 돌봄, 가사 지원 등을 제공해요. 태아 수, 출산 순위, 서비스 기간에 따라 지원 금액이 달라져요.",
      method:
        "관할 보건소 방문 또는 복지로 온라인으로 신청해요. 국민행복카드로 본인부담금을 결제해요.",
      periodText: "출산 예정일 40일 전부터 출산일로부터 30일 이내 신청.",
      documents: ["산모 신분증", "임신·출산 확인 서류", "건강보험증·소득 확인 서류"],
      cautions: [
        "신청 기한(출산 후 30일)을 놓치면 지원이 어려울 수 있어요.",
        "지역별로 소득 기준·지원 일수가 다를 수 있어요.",
      ],
    },
    eligibility: {
      level: "mid",
      summary: "소득 기준 확인이 필요해 '추가 확인'이 필요해요.",
      criteria: [
        { label: "지원대상", status: "ok", note: "출산 산모 — 충족" },
        { label: "소득 기준", status: "check", note: "중위소득 150% 이하 확인 필요" },
        { label: "신청기간", status: "check", note: "출산 후 30일 이내" },
        { label: "거주지", status: "ok", note: "관할 보건소 신청 — 충족" },
      ],
    },
    related: ["first-meet", "parent-allowance"],
  },
  {
    id: "child-allowance",
    name: "아동수당",
    icon: "Coins",
    category: "cash",
    tag: "수당",
    tagTone: "coral",
    summary: "8세 미만 아동에게 매월 일정 금액을 지원해요.",
    amount: "월 10만원",
    period: "상시 신청",
    agency: "보건복지부 · 주민센터",
    type: "현금 지원",
    voucher: "아니오",
    region: "전국",
    status: "신청 가능",
    contact: "보건복지상담센터 129",
    url: "https://www.bokjiro.go.kr",
    easySummary:
      "만 8세가 되기 전(0~95개월)까지 모든 아동에게 매달 10만원을 줘요. 소득과 관계없이 받을 수 있고, 부모급여·양육수당과 함께 받을 수 있어요.",
    detail: {
      target: "대한민국 국적의 만 8세 미만(0~95개월) 아동. 소득·재산 기준 없음.",
      content: "아동 1인당 매월 10만원을 현금으로 지급해요. 만 8세 생일이 속한 달의 전달까지 받아요.",
      method: "주민센터 방문 또는 정부24·복지로 온라인 신청. 출생신고와 함께 신청하면 편해요.",
      periodText: "상시 신청. 신청한 달부터 지급되므로 빨리 신청할수록 좋아요.",
      documents: ["신청자 신분증", "지급 통장 사본", "출생신고 정보"],
      cautions: ["신청월부터 지급되어 늦게 신청하면 소급이 제한돼요."],
    },
    eligibility: {
      level: "high",
      summary: "8세 미만이면 소득과 무관하게 받을 가능성이 높아요.",
      criteria: [
        { label: "지원대상(연령)", status: "ok", note: "만 8세 미만 — 충족" },
        { label: "소득 기준", status: "ok", note: "소득 무관 — 충족" },
        { label: "국적·거주", status: "ok", note: "국내 거주 아동 — 충족" },
        { label: "중복 수급", status: "ok", note: "부모급여와 병행 가능" },
      ],
    },
    related: ["parent-allowance", "care-service"],
  },
  {
    id: "single-parent",
    name: "한부모가족 아동양육비",
    icon: "Heart",
    category: "cash",
    tag: "한부모",
    tagTone: "green",
    summary: "한부모·조손가정의 아동 양육을 매월 지원해요.",
    amount: "자녀 1인당 월 21만원~",
    period: "상시 신청",
    agency: "여성가족부 · 주민센터",
    type: "현금 지원",
    voucher: "아니오",
    region: "전국",
    status: "신청 가능",
    contact: "한부모상담 1644-6621",
    url: "https://www.bokjiro.go.kr",
    easySummary:
      "한부모·조손가정에서 18세 미만 자녀를 키우면 매달 양육비를 지원해요. 소득 기준을 충족해야 하고, 청소년 한부모는 더 많은 지원을 받을 수 있어요.",
    detail: {
      target:
        "기준중위소득 63% 이하의 한부모·조손가정으로 만 18세 미만(취학 시 22세 미만) 자녀를 양육하는 경우.",
      content:
        "자녀 1인당 월 21만원의 아동양육비를 지원해요. 추가 아동양육비, 학용품비, 생활보조금 등이 더해질 수 있어요.",
      method: "주민센터 방문 또는 복지로 온라인으로 한부모가족 지원을 신청해요.",
      periodText: "상시 신청. 자격 확인(소득·가구) 후 다음 달부터 지급돼요.",
      documents: ["신청자 신분증", "가족관계증명서", "소득·재산 확인 서류"],
      cautions: [
        "소득 기준(중위소득 63% 이하) 확인이 꼭 필요해요.",
        "다른 복지 급여와 중복 시 조정될 수 있어요.",
      ],
    },
    eligibility: {
      level: "mid",
      summary: "소득 기준 확인이 필요해 '추가 확인'이 필요해요.",
      criteria: [
        { label: "가구 유형", status: "ok", note: "한부모·조손 — 해당 시 충족" },
        { label: "자녀 연령", status: "ok", note: "만 18세 미만 — 충족" },
        { label: "소득 기준", status: "check", note: "중위소득 63% 이하 확인 필요" },
        { label: "중복 수급", status: "check", note: "타 급여와 조정 가능" },
      ],
    },
    related: ["child-allowance", "care-service"],
  },
];

// ---- 조회 헬퍼 ----
export function getPolicy(id) {
  return POLICIES.find((p) => p.id === id) || null;
}
export function getPolicies(ids = []) {
  return ids.map(getPolicy).filter(Boolean);
}
export function getRelated(id) {
  const p = getPolicy(id);
  return p ? getPolicies(p.related) : [];
}

// 추천 결과(맞춤) — match 점수 부여한 더미
export const RECOMMENDED = [
  { id: "parent-allowance", match: 96 },
  { id: "first-meet", match: 92 },
  { id: "care-service", match: 88 },
  { id: "child-allowance", match: 85 },
  { id: "postnatal-care", match: 81 },
  { id: "single-parent", match: 76 },
];

const RECOMMEND_RULES = {
  "parent-allowance": { ages: ["0", "1"] },
  "first-meet": { ages: ["preborn", "0"] },
  "care-service": { ages: ["0", "1", "2-5", "6-12"], special: ["dual", "many"] },
  "postnatal-care": { ages: ["preborn", "0"], incomeSensitive: true },
  "child-allowance": { ages: ["0", "1", "2-5", "6-12"] },
  "single-parent": { ages: ["0", "1", "2-5", "6-12", "13+"], special: ["single"] },
};

const BASE_MATCH = RECOMMENDED.reduce(
  (acc, item) => ({ ...acc, [item.id]: item.match }),
  {}
);

const clampMatch = (score) => Math.max(45, Math.min(99, score));

export function getRecommended(family) {
  const profile = normalizeFamilyProfile(family);
  const selectedAges = profile.childrenAges;

  return POLICIES.map((policy) => {
    const rule = RECOMMEND_RULES[policy.id] || {};
    const hasAgeMatch =
      !rule.ages || selectedAges.some((age) => rule.ages.includes(age));
    const hasSpecialMatch =
      rule.special && profile.special.some((item) => rule.special.includes(item));
    const hasIncomeMatch =
      rule.incomeSensitive && ["low", "mid1", "mid2", "unknown"].includes(profile.income);

    let match = BASE_MATCH[policy.id] || 74;

    if (rule.ages) {
      match += hasAgeMatch ? 8 : -18;
    }
    if (hasSpecialMatch) {
      match += 8;
    }
    if (hasIncomeMatch) {
      match += 4;
    }

    return { ...policy, match: clampMatch(match) };
  }).sort((a, b) => b.match - a.match);
}

// 지원 가능성 레벨 메타
export const ELIGIBILITY_LEVELS = {
  high: { label: "지원 가능성이 높아요", tone: "high", icon: "CircleCheck", desc: "조건 대부분을 충족해요. 신청 준비를 시작해보세요." },
  mid: { label: "추가 확인이 필요해요", tone: "mid", icon: "CircleAlert", desc: "일부 조건은 공식 기관에서 한 번 더 확인하면 좋아요." },
  low: { label: "지원 가능성이 낮아요", tone: "low", icon: "CircleHelp", desc: "현재 조건으로는 어려울 수 있어요. 비슷한 다른 정책을 살펴보세요." },
};

// 신청 준비 체크리스트(정책 공용 기본 항목 + 정책별 서류)
export function getChecklist(id) {
  const p = getPolicy(id);
  const docs = p ? p.detail.documents : [];
  return [
    { id: "elig", label: "지원 가능성 분석으로 자격 확인하기" },
    ...docs.map((d, i) => ({ id: "doc" + i, label: d + " 준비하기" })),
    { id: "channel", label: (p ? p.detail.method.split(".")[0] : "신청 방법") + " 확인하기" },
    { id: "submit", label: "신청 기간 내 접수하기" },
  ];
}
