// =========================================================================
// 도담 — AI 상태 공통 타입/표시 메타
// 백엔드 API의 상태 값과 프론트 UI variant를 분리해서 관리한다.
// =========================================================================

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

/**
 * @typedef {"READY" | "PROCESSING" | "COMPLETED" | "FOLLOW_UP_REQUIRED" | "FAILED"} RequestStatus
 */

/**
 * 백엔드 내부 판단 상태이며 사용자 UI 기준으로 직접 사용하지 않음.
 * 화면 표시 기준은 API 응답의 user_status(UserStatus)를 우선 사용한다.
 *
 * @typedef {"LIKELY_MATCH" | "NEEDS_MORE_INFO" | "NOT_MATCH" | "INSUFFICIENT_PROFILE" | "CONFLICTING_PROFILE"} AssessmentStatus
 */

/**
 * @typedef {"RECOMMENDABLE" | "NEEDS_CONFIRMATION" | "DIFFICULT_TO_RECOMMEND"} UserStatus
 */

/**
 * API 상태 값이 아니라 프론트 표시용 variant다.
 *
 * @typedef {"idle" | "loading" | "success" | "warning" | "error"} AiStatusUiVariant
 */

/**
 * @typedef {Object} AiStatusUi
 * @property {string} label
 * @property {string} description
 * @property {AiStatusUiVariant} variant
 */

/** @type {Record<RequestStatus, AiStatusUi>} */
export const REQUEST_STATUS_UI = Object.freeze({
  READY: {
    label: "준비 중",
    description: "AI 요청을 준비하고 있습니다.",
    variant: "idle",
  },
  PROCESSING: {
    label: "분석 중",
    description: "AI가 정보를 분석하고 있습니다.",
    variant: "loading",
  },
  COMPLETED: {
    label: "완료",
    description: "AI 분석이 완료되었습니다.",
    variant: "success",
  },
  FOLLOW_UP_REQUIRED: {
    label: "추가 정보 필요",
    description: "정확한 분석을 위해 추가 정보가 필요합니다.",
    variant: "warning",
  },
  FAILED: {
    label: "오류",
    description: "AI 처리 중 문제가 발생했습니다.",
    variant: "error",
  },
});

/** @type {Record<UserStatus, AiStatusUi>} */
export const USER_STATUS_UI = Object.freeze({
  RECOMMENDABLE: {
    label: "추천 가능",
    description: "현재 정보 기준으로 추천 가능성이 높습니다.",
    variant: "success",
  },
  NEEDS_CONFIRMATION: {
    label: "추가 확인 필요",
    description: "정확한 판단을 위해 추가 정보 확인이 필요합니다.",
    variant: "warning",
  },
  DIFFICULT_TO_RECOMMEND: {
    label: "추천 어려움",
    description: "현재 정보 기준으로 추천이 어려울 수 있습니다.",
    variant: "error",
  },
});

/** @type {Record<AiStatusUiVariant, string>} */
export const AI_STATUS_VARIANT_PILL_CLASS = Object.freeze({
  idle: "dd-pill-stone",
  loading: "dd-pill-blue",
  success: "dd-pill-green",
  warning: "dd-pill-amber",
  error: "dd-pill-coral",
});

const UNKNOWN_REQUEST_STATUS_UI = Object.freeze({
  label: "상태 확인 필요",
  description: "AI 요청 상태를 확인할 수 없습니다.",
  variant: "warning",
});

const UNKNOWN_USER_STATUS_UI = Object.freeze({
  label: "판단 확인 필요",
  description: "AI 판단 결과를 확인할 수 없습니다.",
  variant: "warning",
});

/**
 * @param {unknown} status
 * @returns {status is RequestStatus}
 */
export function isRequestStatus(status) {
  return REQUEST_STATUSES.includes(status);
}

/**
 * @param {unknown} status
 * @returns {status is UserStatus}
 */
export function isUserStatus(status) {
  return USER_STATUSES.includes(status);
}

/**
 * @param {unknown} status
 * @returns {status is AssessmentStatus}
 */
export function isAssessmentStatus(status) {
  return ASSESSMENT_STATUSES.includes(status);
}

/**
 * @param {RequestStatus} status
 * @returns {AiStatusUi}
 */
export function getRequestStatusUi(status) {
  return REQUEST_STATUS_UI[status] || UNKNOWN_REQUEST_STATUS_UI;
}

/**
 * @param {UserStatus} status
 * @returns {AiStatusUi}
 */
export function getUserStatusUi(status) {
  return USER_STATUS_UI[status] || UNKNOWN_USER_STATUS_UI;
}

/**
 * @param {AiStatusUiVariant} variant
 * @returns {string}
 */
export function getAiStatusPillClass(variant) {
  const className = AI_STATUS_VARIANT_PILL_CLASS[variant];
  if (!className) {
    console.warn(`[aiStatus] Unknown variant: ${variant}`);
  }
  return className || AI_STATUS_VARIANT_PILL_CLASS.idle;
}
