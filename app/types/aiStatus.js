export const REQUEST_STATUSES = Object.freeze([
  "READY",
  "PROCESSING",
  "COMPLETED",
  "FOLLOW_UP_REQUIRED",
  "FAILED",
]);

export const USER_STATUSES = Object.freeze([
  "RECOMMENDABLE",
  "NEEDS_CONFIRMATION",
  "DIFFICULT_TO_RECOMMEND",
]);

export const ASSESSMENT_STATUSES = Object.freeze([
  "LIKELY_MATCH",
  "NEEDS_MORE_INFO",
  "NOT_MATCH",
  "INSUFFICIENT_PROFILE",
  "CONFLICTING_PROFILE",
]);

export const AI_STATUS_UI_VARIANTS = Object.freeze([
  "idle",
  "loading",
  "success",
  "warning",
  "error",
]);

export const REQUEST_STATUS_UI = Object.freeze({
  READY: {
    label: "준비 중",
    description: "요청을 준비하고 있어요.",
    variant: "idle",
  },
  PROCESSING: {
    label: "정리 중",
    description: "정책 내용을 정리하고 있어요.",
    variant: "loading",
  },
  COMPLETED: {
    label: "정리됨",
    description: "이해하기 쉽게 정리했어요.",
    variant: "success",
  },
  FOLLOW_UP_REQUIRED: {
    label: "확인 필요",
    description: "정확한 안내를 위해 추가 확인이 필요해요.",
    variant: "warning",
  },
  FAILED: {
    label: "불러오지 못함",
    description: "요청을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
    variant: "error",
  },
});

export const USER_STATUS_UI = Object.freeze({
  RECOMMENDABLE: {
    label: "추천 가능",
    description: "현재 정보 기준으로 추천 가능성이 높아요.",
    variant: "success",
  },
  NEEDS_CONFIRMATION: {
    label: "추가 확인 필요",
    description: "정확한 판단을 위해 추가 정보 확인이 필요해요.",
    variant: "warning",
  },
  DIFFICULT_TO_RECOMMEND: {
    label: "추천 어려움",
    description: "현재 정보 기준으로는 추천이 어려울 수 있어요.",
    variant: "error",
  },
});

export const AI_STATUS_VARIANT_PILL_CLASS = Object.freeze({
  idle: "dd-pill-stone",
  loading: "dd-pill-blue",
  success: "dd-pill-green",
  warning: "dd-pill-amber",
  error: "dd-pill-coral",
});

const UNKNOWN_REQUEST_STATUS_UI = Object.freeze({
  label: "확인 필요",
  description: "요청 상태를 확인할 수 없어요.",
  variant: "warning",
});

const UNKNOWN_USER_STATUS_UI = Object.freeze({
  label: "확인 필요",
  description: "판단 결과를 확인할 수 없어요.",
  variant: "warning",
});

export function isRequestStatus(status) {
  return REQUEST_STATUSES.includes(status);
}

export function isUserStatus(status) {
  return USER_STATUSES.includes(status);
}

export function isAssessmentStatus(status) {
  return ASSESSMENT_STATUSES.includes(status);
}

export function getRequestStatusUi(status) {
  return REQUEST_STATUS_UI[status] || UNKNOWN_REQUEST_STATUS_UI;
}

export function getUserStatusUi(status) {
  return USER_STATUS_UI[status] || UNKNOWN_USER_STATUS_UI;
}

export function getAiStatusPillClass(variant) {
  const className = AI_STATUS_VARIANT_PILL_CLASS[variant];
  if (!className) {
    console.warn(`[aiStatus] Unknown variant: ${variant}`);
  }
  return className || AI_STATUS_VARIANT_PILL_CLASS.idle;
}
