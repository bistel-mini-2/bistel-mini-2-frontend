// =========================================================================
// 도담 — 전역 상수 (네비게이션, "다음 액션" 메타)
// =========================================================================

// 헤더 네비게이션 (전 페이지 공통)
export const NAV_ITEMS = [
  { label: "홈", href: "/" },
  { label: "정책추천", href: "/recommend" },
  { label: "정책리스트", href: "/policies" },
  { label: "챗봇", href: "/chat" },
  { label: "마이페이지", href: "/mypage" },
];

// "다음 행동" 액션 버튼 메타 — ActionButtons 에서 사용
// variant 는 globals.css 의 dd-btn-* 톤과 매핑
export const ACTION_META = {
  eligibility: { key: "eligibility", label: "지원 가능성 분석", icon: "ShieldCheck", variant: "blue" },
  compare: { key: "compare", label: "유사 정책 비교", icon: "GitCompare", variant: "amber" },
  apply: { key: "apply", label: "신청 준비 체크리스트", icon: "HandHeart", variant: "green" },
  chat: { key: "chat", label: "AI 챗봇에 질문하기", icon: "MessageCircle", variant: "coral" },
  recommend: { key: "recommend", label: "맞춤 정책 추천", icon: "Target", variant: "coral" },
};

// 면책 공통 문구
export const DISCLAIMER_TEXT =
  "최종 신청 가능 여부는 공식 기관 확인이 필요합니다.";
