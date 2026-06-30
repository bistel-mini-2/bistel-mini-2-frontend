"use client";

// =========================================================================
// 도담 — 추천 결과 (/recommend/result)
// 의도: 추천 요청 ID를 기준으로 AI 추천 결과를 polling하고 결과 카드를 표시하며,
//       각 정책의 "지원 가능성 분석" 요청을 생성해 분석 페이지로 이동시킨다.
// 구성: 스텝 인디케이터(2단계) · 상태별 결과 영역 · 추천 카드 · 후속 질문.
// =========================================================================
import { Suspense, startTransition, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getRecommendationResult,
  submitRecommendationAnswers,
} from "@/apis/recommendationApi";
import eligibilityApi from "@/apis/eligibilityApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import SimilarPolicies from "@/app/components/SimilarPolicies";
import {
  DEFAULT_FAMILY,
  FAMILY_PROFILE_KEY,
  RECOMMENDATION_INPUT_KEY,
  createRecommendationPayload,
  normalizeFamilyProfile,
} from "@/app/data/family";
import {
  getAiStatusPillClass,
  getRequestStatusUi,
  isRequestStatus,
} from "@/app/types/aiStatus";

const POLLING_DELAY_MS = 2000;

const FALLBACK_RESULT_ERROR_MESSAGE =
  "추천 결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";

const ELIGIBILITY_ERROR_MESSAGE = "지원 가능성 분석 요청을 시작하지 못했어요.";

const VIEW_TO_REQUEST_STATUS = {
  loading: "PROCESSING",
  done: "COMPLETED",
  error: "FAILED",
};

// 카드 상태 배지 메타. 키는 후보 필터 단계의 candidate_status 기준이지만,
// 표시는 최종 판정(user_status)을 우선 사용한다(아래 normalizeBadgeStatus 참고).
const CANDIDATE_STATUS_META = {
  CANDIDATE: { label: "잘 맞는 정책", pill: "dd-pill-green", icon: "CircleCheck" },
  UNCERTAIN: { label: "확인해 볼 정책", pill: "dd-pill-amber", icon: "CircleAlert" },
  EXCLUDED: { label: "조건 확인 필요", pill: "dd-pill-coral", icon: "X" },
};

// 최종 사용자 판정(user_status) → 배지 키 매핑.
// candidate_status는 후보 필터 단계 값이라, assessment에서 핵심 정보 부족 등으로
// 판정이 바뀐 경우(예: 후보 CANDIDATE → 판정 NEEDS_CONFIRMATION)를 반영하지 못한다.
// 따라서 user_status를 우선 사용하고, 없을 때만 candidate_status로 fallback한다.
const USER_STATUS_TO_BADGE = {
  RECOMMENDABLE: "CANDIDATE",
  NEEDS_CONFIRMATION: "UNCERTAIN",
  DIFFICULT_TO_RECOMMEND: "EXCLUDED",
};

// "잘 맞는 점"은 장황한 사유 문장 대신 짧은 매칭 조건 라벨(생애주기·자녀 나이 등)만
// 칩으로 노출한다. 너무 길어지지 않게 최대 개수만 보여주고 나머지는 "외 n개"로 축약한다.
const MATCHED_LABEL_LIMIT = 4;

// 카드 배지 상태: 최종 판정(user_status) 우선, 없으면 candidate_status로 fallback.
const normalizeBadgeStatus = (recommendation) => {
  const userStatus = String(
    recommendation?.user_status ?? recommendation?.userStatus ?? ""
  )
    .trim()
    .toUpperCase();
  if (USER_STATUS_TO_BADGE[userStatus]) {
    return USER_STATUS_TO_BADGE[userStatus];
  }

  const candidateStatus = String(
    recommendation?.candidate_status ?? recommendation?.candidateStatus ?? ""
  )
    .trim()
    .toUpperCase();
  return CANDIDATE_STATUS_META[candidateStatus] ? candidateStatus : "";
};

// 백엔드에서 드물게 내부 토큰(대문자 SNAKE_CASE 규칙 코드 등)이 문장에 섞여
// 내려올 수 있어, 사용자 카드에는 일반 문장으로 치환하는 안전장치를 둔다.
// 예: "REFUGEE_APPLICATION_PENDING_EXCLUDED",
//     "FOSTERCAREPARTICIPATIONNOTMODELED"(언더스코어 없이 길게 이어진 대문자) →
//     "자동으로 확인하기 어려운 세부 자격이 있어요".
const INTERNAL_TOKEN_PATTERN =
  /\b(?:[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[A-Z][A-Z0-9]{11,})\b/g;
const INTERNAL_TOKEN_FALLBACK = "자동으로 확인하기 어려운 세부 자격이 있어요";

// 사유 칩 등 짧은 문구에서 통째로 걸러낼 내부 신호 패턴(DB/RAG·검색 단계·규칙 코드 등).
const INTERNAL_JARGON_PATTERNS = [
  /\bDB\b/i,
  /\bRAG\b/i,
  /후보\s*검색/,
  /검색\s*단계/,
  /policy[_\s]?rule/i,
  /hard[_\s]?rule/i,
];

// 한글이 없고 영문 대문자/숫자/구분기호로만 이뤄진 값은 내부 토큰으로 본다.
// (예: "FOSTERCAREPARTICIPATIONNOTMODELED" — 언더스코어가 없어도 잡는다.)
const looksLikeInternalToken = (text) =>
  !/[가-힣]/.test(text) && /[A-Z]/.test(text) && /^[A-Z0-9_./\s-]+$/.test(text);

const sanitizeDisplayText = (text) => {
  const value = typeof text === "string" ? text.trim() : "";
  if (!value) {
    return value;
  }

  return value
    .replace(INTERNAL_TOKEN_PATTERN, INTERNAL_TOKEN_FALLBACK)
    .replace(/\s+/g, " ")
    .trim();
};

// 사유 칩 전용: 내부 신호/토큰이면 generic 문구로 치환하지 않고 통째로 버린다.
// (치환하면 "자동으로 확인하기 어려운 세부 자격이 있어요"가 반복 노출되는 문제가 생긴다.)
const sanitizeReason = (reason) => {
  const value = typeof reason === "string" ? reason.trim() : "";
  if (!value) {
    return "";
  }

  if (looksLikeInternalToken(value)) {
    return "";
  }

  if (INTERNAL_JARGON_PATTERNS.some((pattern) => pattern.test(value))) {
    return "";
  }

  // 문장 중간에 SNAKE_CASE 토큰만 섞인 경우는 일반 표현으로 치환해 살린다.
  return sanitizeDisplayText(value);
};

// reasons 객체에서 매칭 조건 라벨(matched_labels)만 추출·정제한다.
const extractMatchedLabels = (reasons) => {
  if (!reasons || typeof reasons !== "object") {
    return [];
  }

  const rawLabels = Array.isArray(reasons.matched_labels)
    ? reasons.matched_labels
    : Array.isArray(reasons.matchedLabels)
      ? reasons.matchedLabels
      : [];

  const labels = [];
  rawLabels.forEach((label) => {
    const value = sanitizeReason(label);
    if (value && !labels.includes(value)) {
      labels.push(value);
    }
  });
  return labels;
};

// "잘 맞는 점" 칩: 백엔드가 정리한 매칭 조건 라벨을 사용한다.
// top-level reasons를 우선 보되, 캐시/구버전 응답 대비로
// filter_match_json.reasons도 fallback으로 확인한다.
// 내부 신호/지역은 백엔드에서 이미 제외되며, 프론트에서 한 번 더 정제한다.
const normalizeMatchedLabels = (recommendation) => {
  const reasonSources = [
    recommendation?.reasons,
    recommendation?.filter_match_json?.reasons,
    recommendation?.filterMatchJson?.reasons,
  ];

  for (const reasons of reasonSources) {
    const labels = extractMatchedLabels(reasons);
    if (labels.length > 0) {
      return labels;
    }
  }
  return [];
};

const firstText = (...values) =>
  values.find((value) => typeof value === "string" && value.trim())?.trim();

const firstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const lineClampStyle = (lineCount) => ({
  display: "-webkit-box",
  WebkitLineClamp: lineCount,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const normalizeMatchScore = (score) => {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return null;
  }

  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

const getPolicyIdentifier = (recommendation) =>
  firstValue(
    recommendation?.slug,
    recommendation?.policy_slug,
    recommendation?.policySlug,
    recommendation?.policy_id,
    recommendation?.policyId,
    recommendation?.id
  );

const mapRecommendationToPolicyCardProps = (recommendation, index) => {
  const identifier = getPolicyIdentifier(recommendation);
  const id = identifier ? String(identifier) : `recommendation-${index + 1}`;
  const detailHref = identifier
    ? `/policies/${encodeURIComponent(String(identifier))}`
    : "/policies";
  // 카드 핵심 정보: 지원 대상(누가) + 혜택(무엇을). 사용자에게 가장 와닿는 두 줄.
  // 백엔드에서 각 최대 180자로 정리되어 내려오며, 비어 있으면 줄을 숨긴다.
  const targetDescription = firstText(
    recommendation?.target_description,
    recommendation?.targetDescription
  );
  const benefitDescription = firstText(
    recommendation?.benefit_description,
    recommendation?.benefitDescription,
    recommendation?.benefit_summary,
    recommendation?.benefitSummary
  );
  // 지원 대상/혜택이 둘 다 비었을 때만 쓰는 한 줄 설명 fallback.
  const summary = firstText(
    recommendation?.summary,
    recommendation?.easy_summary,
    recommendation?.easySummary
  );
  // 추천 이유(카드 본문): "사용자 조건과 정책이 왜 맞는지"를 자연어로 설명하는
  // LLM rerank의 why_recommended를 최우선으로 쓴다. 없으면 reason_summary >
  // recommendation_reason > reason 순으로 대체한다.
  // 상세 지원대상/지원내용 같은 긴 본문은 카드에 싣지 않고 '자세히 보기'로 유도한다.
  // summary와 중복 노출되지 않도록 reason fallback에는 summary를 넣지 않는다.
  const reason =
    sanitizeDisplayText(
      firstText(
        recommendation?.why_recommended,
        recommendation?.whyRecommended,
        recommendation?.reason_summary,
        recommendation?.reasonSummary,
        recommendation?.recommendation_reason,
        recommendation?.recommendationReason,
        recommendation?.reason
      )
    ) || "입력하신 조건과 관련성이 높은 정책이에요.";
  // 확인하면 좋은 점(AI 코멘트의 보조 줄): 값이 없으면 빈 문자열로 두어 줄을 숨긴다.
  // 내부 토큰(예: "FOSTERCAREPARTICIPATIONNOTMODELED")이 새어 들어오면 버린다.
  const checkBeforeApply =
    sanitizeReason(
      firstText(
        recommendation?.check_before_apply,
        recommendation?.checkBeforeApply,
        recommendation?.application_method,
        recommendation?.applicationMethod
      )
    ) || "";

  return {
    key: `${id}-${index}`,
    detailHref,
    // 표시용 적합도: 백엔드 판정(assessment) 기반의 표시 전용 점수만 쓴다.
    // condition_match_score(표시 전용 별칭) → confidence_score 순.
    // priority_score(순위 합성값)/match_score(룰 매칭)는 표시용이 아니므로 쓰지 않고,
    // 둘 다 없으면(캐시/구버전/예외 응답) match=null → 점수 배지를 숨긴다.
    match: normalizeMatchScore(
      firstValue(
        recommendation?.condition_match_score,
        recommendation?.conditionMatchScore,
        recommendation?.confidence_score,
        recommendation?.confidenceScore
      )
    ),
    // 지원 가능성 배지: 최종 판정(user_status) 우선, 없으면 candidate_status.
    candidateStatus: normalizeBadgeStatus(recommendation),
    // "잘 맞는 점" 칩: 매칭 조건 라벨만 짧게. top-level reasons가 우선이지만
    // 캐시/구버전 응답 대비로 filter_match_json.reasons도 fallback으로 본다.
    matchedLabels: normalizeMatchedLabels(recommendation),
    policy: {
      id,
      name:
        firstText(
          recommendation?.policy_name,
          recommendation?.policyName,
          recommendation?.title,
          recommendation?.name
        ) || "추천 정책",
      icon: "Sparkles",
      // 분류 태그: 백엔드가 category/benefit_type 등을 줄 때만 노출한다.
      // 값이 없을 때 모든 카드에 똑같이 "맞춤 추천"이 박히면 정보가 없으므로,
      // fallback 없이 빈 값으로 두고 카드에서 조건부 렌더링한다.
      tag:
        firstText(
          recommendation?.category,
          recommendation?.benefit_type,
          recommendation?.benefitType,
          recommendation?.region
        ) || "",
      tagTone: "coral",
      targetDescription,
      benefitDescription,
      summary,
      reason,
      checkBeforeApply,
    },
  };
};

const getRequestStatusForDisplay = (result, viewStatus) => {
  const rawStatus = String(result?.rawStatus || "").trim().toUpperCase();

  if (isRequestStatus(rawStatus)) {
    return rawStatus;
  }

  return VIEW_TO_REQUEST_STATUS[viewStatus] || "PROCESSING";
};

const getResultErrorMessage = (error) => {
  if (error?.status === 401) {
    return "로그인이 필요해요. 로그인 후 추천 결과를 다시 확인해주세요.";
  }

  if (error?.status === 404) {
    return "추천 요청을 찾을 수 없습니다. 새로 추천을 요청해주세요.";
  }

  return getApiErrorMessage(error, FALLBACK_RESULT_ERROR_MESSAGE);
};

function RecommendResultFallback() {
  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <StepIndicator current={2} />
        <LoadingState />
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="dd-card dd-card-lg mt-4 text-center" style={{ padding: "44px 24px" }}>
      <div className="spinner-border text-danger" role="status" aria-label="추천 결과 분석 중" />
      <span className="dd-pill dd-pill-blue mt-3">
        <Icon name="Sparkles" size={14} /> 분석 중
      </span>
      <h1 className="dd-title mt-3" style={{ fontSize: 28 }}>
        AI가 추천 정책을 분석 중입니다...
      </h1>
      <p className="mb-0 mt-2" style={{ color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
        결과가 준비되면 자동으로 보여드릴게요. 보통 잠시만 기다리면 완료됩니다.
      </p>
    </div>
  );
}

function FollowUpGate({ questions, onSubmit, onSkip, submitting }) {
  const visibleQuestions = questions.slice(0, 2);
  const [answers, setAnswers] = useState({});

  // 답변을 하나라도 입력했는지(빈 답변으로 "다시 추천" 누르면 건너뛰기와 같아지는 혼란 방지).
  const hasAnyAnswer = visibleQuestions.some(
    (question) => (answers[question] || "").trim()
  );

  // follow_up 상태인데 질문이 비어 있는 예외 상황: 빈 화면 대신 결과로 진행할 수 있게 안내.
  if (visibleQuestions.length === 0) {
    return (
      <div className="dd-card dd-card-lg mt-4 text-center" style={{ padding: "44px 24px" }}>
        <span className="dd-icon-tile dd-tile-rose mx-auto">
          <Icon name="Sparkles" size={24} />
        </span>
        <h1 className="dd-title mt-3" style={{ fontSize: 26 }}>
          추천 결과를 보여드릴게요
        </h1>
        <p className="mb-0 mt-2" style={{ color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
          추가로 확인할 정보가 없어요. 바로 결과를 확인해 주세요.
        </p>
        <button
          type="button"
          className="dd-btn dd-btn-coral mt-4"
          onClick={onSkip}
          disabled={submitting}
        >
          <Icon name={submitting ? "LoaderCircle" : "ArrowRight"} size={16} /> 결과 보기
        </button>
      </div>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    const payload = visibleQuestions
      .map((question) => ({
        question_text: question,
        answer: (answers[question] || "").trim(),
      }))
      .filter((item) => item.answer);
    onSubmit(payload);
  };

  return (
    <form
      className="dd-card dd-card-lg mt-4"
      style={{ padding: "40px 28px" }}
      onSubmit={handleSubmit}
    >
      <span className="dd-pill dd-pill-amber">
        <Icon name="MessageCircle" size={14} /> 추가 정보가 필요해요
      </span>
      <h1 className="dd-title mt-3" style={{ fontSize: 26 }}>
        몇 가지만 확인하면 더 정확해져요
      </h1>
      <p className="mt-2 mb-0" style={{ color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
        아래에 답해주시면 그 정보를 반영해 다시 추천해드릴게요. 건너뛰어도 결과는 볼 수 있어요.
      </p>

      <div className="d-flex flex-column gap-3 mt-4">
        {visibleQuestions.map((question) => (
          <label key={question} className="d-flex flex-column gap-2">
            <span className="fw-semibold" style={{ color: "var(--dd-ink)" }}>
              {question}
            </span>
            <input
              type="text"
              className="dd-input"
              value={answers[question] || ""}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [question]: event.target.value,
                }))
              }
              placeholder="답변을 입력해주세요"
              disabled={submitting}
            />
          </label>
        ))}
      </div>

      <div className="d-flex flex-wrap gap-2 mt-4">
        <button
          type="submit"
          className="dd-btn dd-btn-coral"
          disabled={submitting || !hasAnyAnswer}
        >
          <Icon name={submitting ? "LoaderCircle" : "ArrowRight"} size={16} />
          {submitting ? "반영 중..." : "답변 반영하고 다시 추천"}
        </button>
        <button
          type="button"
          className="dd-btn dd-btn-ghost"
          onClick={onSkip}
          disabled={submitting}
        >
          그냥 결과 보기
        </button>
      </div>
      {!hasAnyAnswer && (
        <p className="dd-subtle mt-2 mb-0" style={{ fontSize: 13 }}>
          답변을 입력하면 반영해 다시 추천해드려요. 그냥 보려면 아래 &lsquo;그냥 결과 보기&rsquo;를 눌러주세요.
        </p>
      )}
    </form>
  );
}

function ErrorState({ message, requestId, onRetry, statusCode }) {
  const loginHref = `/login?redirect=${encodeURIComponent(
    requestId ? `/recommend/result?requestId=${requestId}` : "/recommend"
  )}`;

  return (
    <div className="dd-card dd-card-lg mt-4 text-center" style={{ padding: "44px 24px" }}>
      <span className="dd-icon-tile dd-tile-rose mx-auto">
        <Icon name="CircleAlert" size={24} />
      </span>
      <span className="dd-pill dd-pill-coral mt-3">
        <Icon name="CircleAlert" size={14} /> 결과 확인 실패
      </span>
      <h1 className="dd-title mt-3" style={{ fontSize: 28 }}>
        추천 결과를 확인하지 못했어요
      </h1>
      <p className="mb-0 mt-2" style={{ color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
        {message}
      </p>
      <div className="d-flex justify-content-center flex-wrap gap-2 mt-4">
        {requestId && statusCode !== 401 && (
          <button type="button" className="dd-btn dd-btn-coral" onClick={onRetry}>
            <Icon name="Repeat" size={16} /> 다시 시도
          </button>
        )}
        {statusCode === 401 && (
          <Link href={loginHref} className="dd-btn dd-btn-coral">
            <Icon name="User" size={16} /> 로그인하기
          </Link>
        )}
        <Link href="/recommend" className="dd-btn dd-btn-ghost">
          <Icon name="ArrowLeft" size={16} /> 다시 입력하기
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="dd-card dd-card-lg mt-4 text-center" style={{ padding: "44px 24px" }}>
      <span className="dd-icon-tile dd-tile-rose mx-auto">
        <Icon name="CircleHelp" size={24} />
      </span>
      <h2 className="dd-title mt-3" style={{ fontSize: 24 }}>
        조건에 맞는 추천 결과를 찾지 못했어요
      </h2>
      <p className="mb-0 mt-2" style={{ color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
        가족 상황이나 궁금한 내용을 조금 더 자세히 입력해 다시 추천을 받아보세요.
      </p>
      <Link href="/recommend" className="dd-btn dd-btn-coral mt-4">
        새로 추천 받기 <Icon name="ArrowRight" size={17} />
      </Link>
    </div>
  );
}

function FollowUpQuestions({ questions }) {
  const visibleQuestions = questions.slice(0, 2);

  if (visibleQuestions.length === 0) {
    return null;
  }

  return (
    <div className="dd-card-soft mt-4" style={{ padding: 20 }}>
      <div className="d-flex align-items-center gap-2 mb-3">
        <Icon name="MessageCircle" size={18} style={{ color: "var(--dd-coral)" }} />
        <strong>더 정확히 알아볼까요?</strong>
      </div>
      <div className="d-flex flex-wrap gap-2">
        {visibleQuestions.map((question) => (
          <Link
            key={question}
            href={`/chat?question=${encodeURIComponent(question)}`}
            className="dd-btn dd-btn-ghost dd-btn-sm"
          >
            {question} <Icon name="ArrowRight" size={14} />
          </Link>
        ))}
      </div>
    </div>
  );
}

function CandidateStatusBadge({ status }) {
  const meta = CANDIDATE_STATUS_META[status];

  if (!meta) {
    return null;
  }

  return (
    <span className={"dd-pill " + meta.pill}>
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}

function MatchedLabels({ labels }) {
  // "잘 맞는 점": 매칭된 조건 라벨(생애주기·자녀 나이 등)만 짧은 칩으로 노출한다.
  if (!labels.length) {
    return null;
  }

  const visible = labels.slice(0, MATCHED_LABEL_LIMIT);
  const restCount = labels.length - visible.length;

  return (
    <div className="mt-3 d-flex align-items-start gap-2" style={{ fontSize: 12.5 }}>
      <span
        className="d-inline-flex align-items-center gap-1 fw-semibold"
        style={{ color: "var(--dd-green)", flex: "none", marginTop: 3 }}
      >
        <Icon name="Check" size={13} />
        잘 맞는 점
      </span>
      <span className="d-flex flex-wrap gap-1">
        {visible.map((label) => (
          <span key={label} className="dd-pill dd-pill-green" style={{ padding: "3px 9px" }}>
            {label}
          </span>
        ))}
        {restCount > 0 && (
          <span
            className="d-inline-flex align-items-center"
            style={{ color: "var(--dd-stone-600)" }}
          >
            외 {restCount}개
          </span>
        )}
      </span>
    </div>
  );
}

function CheckTip({ text }) {
  // "확인하면 좋아요": 확인해 볼 정책에서 무엇을 확인하면 좋은지(check_before_apply).
  // 잘 맞는 점 칩 바로 아래에, 같은 레이아웃(라벨 + 내용)으로 둔다.
  if (!text) {
    return null;
  }

  return (
    <div className="mt-2 d-flex align-items-start gap-2" style={{ fontSize: 12.5 }}>
      <span
        className="d-inline-flex align-items-center gap-1 fw-semibold"
        style={{ color: "var(--dd-amber)", flex: "none", marginTop: 3 }}
      >
        <Icon name="CircleAlert" size={13} />
        확인하면 좋아요
      </span>
      <span
        style={{
          color: "var(--dd-stone-600)",
          lineHeight: 1.5,
          ...lineClampStyle(2),
        }}
      >
        {text}
      </span>
    </div>
  );
}

function AiComment({ comment }) {
  // 제거한 "근거" 박스 자리를 AI 코멘트로 대체한다.
  // 사용자 조건과 정책이 왜 맞는지(why_recommended)를 2~3문장으로 보여준다.
  if (!comment) {
    return null;
  }

  return (
    <div className="dd-card-soft mt-3" style={{ padding: "12px 14px" }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <Icon name="Sparkles" size={14} style={{ color: "var(--dd-coral)" }} />
        <strong style={{ fontSize: 12.5 }}>AI 코멘트</strong>
      </div>
      <p
        className="mb-0"
        style={{
          fontSize: 13.5,
          color: "var(--dd-stone-700)",
          lineHeight: 1.6,
          ...lineClampStyle(5),
        }}
      >
        {comment}
      </p>
    </div>
  );
}

function RecommendationCard({ item, onAnalyze, analyzing, analyzeDisabled }) {
  const { policy, match, detailHref, rank, candidateStatus, matchedLabels } = item;
  const hasPolicyDetail = policy.id && !policy.id.startsWith("recommendation-");
  // 유사 정책은 사용자가 버튼을 눌렀을 때만 로드한다(카드 4개 동시 LLM 호출 방지).
  const [showSimilar, setShowSimilar] = useState(false);

  return (
    <article
      className="dd-card dd-card-hover d-flex flex-column"
      style={{ padding: 22, height: "100%", overflow: "hidden" }}
    >
      {/* 헤더: 아이콘 / 순위 / 정책명 / 점수 */}
      <div className="d-flex align-items-start gap-3">
        <span
          className="dd-icon-tile dd-tile-rose"
          style={{ width: 56, height: 56, borderRadius: 16, flex: "none" }}
        >
          <Icon name={policy.icon} size={26} />
        </span>
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span
              className="dd-badge-match"
              style={{ background: "var(--dd-coral-50)", color: "var(--dd-coral)" }}
            >
              {rank}순위
            </span>
            <Link
              href={detailHref}
              className="fw-bold text-decoration-none"
              style={{
                color: "var(--dd-ink)",
                fontSize: 17,
                lineHeight: 1.35,
                maxWidth: "100%",
                overflowWrap: "anywhere",
                ...lineClampStyle(2),
              }}
            >
              {policy.name}
            </Link>
          </div>
          <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
            <CandidateStatusBadge status={candidateStatus} />
            {policy.tag && (
              <span className={"dd-pill dd-pill-" + policy.tagTone}>{policy.tag}</span>
            )}
            {match != null && (
              <span
                className="dd-badge-match"
                title="입력 조건과의 AI 적합도"
              >
                <Icon name="Star" size={12} fill="currentColor" />
                적합도 {match}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 핵심 정보: 혜택 → 지원 대상 (각 값 있을 때만, 없으면 summary 한 줄로 대체) */}
      {(policy.benefitDescription || policy.targetDescription) ? (
        <div className="mt-3 d-flex flex-column gap-2" style={{ fontSize: 13.5 }}>
          {policy.benefitDescription && (
            <div
              className="d-flex align-items-start gap-2"
              style={{ color: "var(--dd-stone-700)" }}
            >
              <Icon name="Wallet" size={14} style={{ color: "var(--dd-coral)", marginTop: 3, flex: "none" }} />
              <span style={{ lineHeight: 1.5, ...lineClampStyle(2) }}>
                <strong style={{ color: "var(--dd-ink)" }}>혜택 </strong>
                {policy.benefitDescription}
              </span>
            </div>
          )}
          {policy.targetDescription && (
            <div
              className="d-flex align-items-start gap-2"
              style={{ color: "var(--dd-stone-700)" }}
            >
              <Icon name="Users" size={14} style={{ color: "var(--dd-coral)", marginTop: 3, flex: "none" }} />
              <span style={{ lineHeight: 1.5, ...lineClampStyle(2) }}>
                <strong style={{ color: "var(--dd-ink)" }}>지원 대상 </strong>
                {policy.targetDescription}
              </span>
            </div>
          )}
        </div>
      ) : (
        policy.summary && (
          <p
            className="mt-3 mb-0 fw-semibold"
            style={{ fontSize: 14.5, color: "var(--dd-ink)", lineHeight: 1.5, ...lineClampStyle(2) }}
          >
            {policy.summary}
          </p>
        )
      )}

      {/* 잘 맞는 점: 매칭 조건 라벨 칩 (없으면 렌더링 안 함) */}
      <MatchedLabels labels={matchedLabels} />

      {/* 확인하면 좋아요: 잘 맞는 점 바로 아래 (없으면 렌더링 안 함) */}
      <CheckTip text={policy.checkBeforeApply} />

      {/* AI 코멘트 + 버튼을 한 묶음으로 카드 하단에 고정해 카드마다 위치가 일정하다 */}
      <div className="d-flex flex-column" style={{ marginTop: "auto" }}>
        {/* AI 코멘트: 왜 맞는지 2~3문장 */}
        <AiComment comment={policy.reason} />

        {/* 하단 버튼 */}
        <div className="d-flex flex-wrap gap-2" style={{ paddingTop: 16 }}>
          <Link href={detailHref} className="dd-btn dd-btn-ghost dd-btn-sm">
            <Icon name="FileText" size={15} /> 자세히 보기
          </Link>
          {hasPolicyDetail && (
            <button
              type="button"
              className="dd-btn dd-btn-blue dd-btn-sm"
              onClick={() => onAnalyze?.(policy.id)}
              disabled={analyzeDisabled}
              aria-busy={analyzing}
            >
              <Icon name={analyzing ? "LoaderCircle" : "ShieldCheck"} size={15} />
              {analyzing ? "분석 요청 중..." : "지원 가능성 분석"}
            </button>
          )}
          {hasPolicyDetail && (
            <button
              type="button"
              className="dd-btn dd-btn-ghost dd-btn-sm"
              onClick={() => setShowSimilar((current) => !current)}
              aria-expanded={showSimilar}
            >
              <Icon name={showSimilar ? "ChevronUp" : "Sparkles"} size={15} />
              유사 정책
            </button>
          )}
        </div>

        {/* 유사 정책: 버튼 토글 시에만 마운트되어 그때 로드된다. */}
        {hasPolicyDetail && showSimilar && (
          <div className="mt-3">
            <SimilarPolicies
              policySlug={policy.id}
              limit={3}
              layout="sidebar"
              sticky={false}
              showEmpty
              title="이 정책과 비슷한 정책"
            />
          </div>
        )}
      </div>
    </article>
  );
}

function RecommendationGrid({ recommendations, onAnalyze, pendingPolicyId }) {
  return (
    // align-items-start: 같은 줄 카드의 높이를 묶지 않는다. 한 카드에서 '유사 정책'을
    // 펼쳐도 짝 카드가 빈 공간으로 늘어나지 않도록(각 카드는 자기 콘텐츠 높이만).
    <div className="row g-4 mt-1 align-items-start">
      {recommendations.map((item) => (
        <div className="col-12 col-md-6" key={item.key}>
          <RecommendationCard
            item={item}
            onAnalyze={onAnalyze}
            analyzing={pendingPolicyId === item.policy.id}
            analyzeDisabled={Boolean(pendingPolicyId)}
          />
        </div>
      ))}
    </div>
  );
}

function RecommendResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId =
    searchParams.get("requestId")?.trim() ||
    searchParams.get("request_id")?.trim() ||
    "";
  const [retryKey, setRetryKey] = useState(0);
  const [viewState, setViewState] = useState({
    status: "loading",
    result: null,
    errorMessage: "",
    errorStatus: null,
  });
  // 분석 요청에 전달할 입력 조건(가족 상황)과 분석 요청 진행 상태.
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [recommendationInput, setRecommendationInput] = useState(null);
  const [pendingPolicyId, setPendingPolicyId] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [submittingAnswers, setSubmittingAnswers] = useState(false);

  // 추천 요청 결과 polling.
  useEffect(() => {
    if (!requestId) {
      return undefined;
    }

    let isActive = true;
    let timerId = null;

    const clearPollingTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };

    const fetchResult = async () => {
      clearPollingTimer();

      if (!isActive) {
        return;
      }

      setViewState((current) => ({
        ...current,
        status: "loading",
        errorMessage: "",
        errorStatus: null,
      }));

      try {
        const result = await getRecommendationResult(requestId);

        if (!isActive) {
          return;
        }

        if (result.status === "loading") {
          setViewState({
            status: "loading",
            result,
            errorMessage: "",
            errorStatus: null,
          });
          timerId = window.setTimeout(fetchResult, POLLING_DELAY_MS);
          return;
        }

        if (result.status === "error") {
          setViewState({
            status: "error",
            result,
            errorMessage: result.errorMessage || FALLBACK_RESULT_ERROR_MESSAGE,
            errorStatus: null,
          });
          return;
        }

        if (result.selectedConditions) {
          startTransition(() => {
            setRecommendationInput((current) => ({
              ...(current || {}),
              requestId: result.requestId || requestId,
              rawQuery: current?.rawQuery || result.rawQuery || "",
              selectedConditions: result.selectedConditions,
            }));
          });
        }

        // 추가질문 게이트: 결과 대신 답변 폼을 띄운다.
        if (result.status === "follow_up") {
          setViewState({
            status: "follow_up",
            result,
            errorMessage: "",
            errorStatus: null,
          });
          return;
        }

        setViewState({
          status: "done",
          result,
          errorMessage: "",
          errorStatus: null,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setViewState({
          status: "error",
          result: null,
          errorMessage: getResultErrorMessage(error),
          errorStatus: error?.status || null,
        });
      }
    };

    fetchResult();

    return () => {
      isActive = false;
      clearPollingTimer();
    };
  }, [requestId, retryKey]);

  // 분석 요청 출처/입력 조건: 추천 요청 시 저장한 입력값을 우선 사용하고,
  // 없으면 가족 프로필을 fallback으로 사용한다.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedInput = window.localStorage.getItem(RECOMMENDATION_INPUT_KEY);

    if (storedInput) {
      try {
        const parsedInput = JSON.parse(storedInput);
        const isSameRecommendation =
          !requestId || String(parsedInput.requestId) === String(requestId);

        if (isSameRecommendation) {
          const nextFamily = normalizeFamilyProfile(parsedInput.family);
          startTransition(() => {
            setFamily(nextFamily);
            setRecommendationInput({ ...parsedInput, family: nextFamily });
          });
          return;
        }
      } catch {
        window.localStorage.removeItem(RECOMMENDATION_INPUT_KEY);
      }
    }

    const storedFamily = window.localStorage.getItem(FAMILY_PROFILE_KEY);
    if (!storedFamily) {
      return;
    }

    try {
      const nextFamily = normalizeFamilyProfile(JSON.parse(storedFamily));
      startTransition(() => setFamily(nextFamily));
    } catch {
      window.localStorage.removeItem(FAMILY_PROFILE_KEY);
    }
  }, [requestId]);

  // "지원 가능성 분석" 클릭 시: 분석 요청을 생성(출처=RECOMMENDATION_RESULT)하고
  // 발급된 requestId를 들고 분석 페이지로 이동한다.
  const startEligibilityRequest = async (policyId) => {
    if (!policyId || pendingPolicyId) {
      return;
    }

    setPendingPolicyId(policyId);
    setEligibilityError("");

    try {
      const userConditions =
        recommendationInput?.selectedConditions || createRecommendationPayload(family);
      const response = await eligibilityApi.createRequest({
        policyId,
        userConditions,
        sourceType: "RECOMMENDATION_RESULT",
        sourceRefId: recommendationInput?.requestId || requestId || policyId,
        rawQuery: recommendationInput?.rawQuery,
      });
      const eligibilityRequestId = response?.request_id || response?.requestId;

      if (!eligibilityRequestId) {
        throw new Error("분석 요청 번호를 받지 못했어요.");
      }

      const params = new URLSearchParams({
        requestId: String(eligibilityRequestId),
        source: "recommendation",
      });

      if (requestId) {
        params.set("recommendationRequestId", String(requestId));
      }

      router.push(
        `/policies/${encodeURIComponent(policyId)}/eligibility?${params.toString()}`
      );
    } catch (error) {
      if (error?.status === 401) {
        const params = new URLSearchParams({
          next: `/recommend/result${requestId ? `?requestId=${requestId}` : ""}`,
        });
        router.push(`/login?${params.toString()}`);
        return;
      }

      setEligibilityError(getApiErrorMessage(error, ELIGIBILITY_ERROR_MESSAGE));
    } finally {
      setPendingPolicyId("");
    }
  };

  // 추가질문 답변(또는 건너뛰기) 제출 → 재실행 → 결과 폴링 재개.
  const submitAnswers = async (answers) => {
    if (submittingAnswers) {
      return;
    }

    setSubmittingAnswers(true);
    try {
      await submitRecommendationAnswers(requestId, answers);
      setViewState((current) => ({ ...current, status: "loading" }));
      setRetryKey((current) => current + 1);
    } catch (error) {
      if (error?.status === 401) {
        const params = new URLSearchParams({
          next: `/recommend/result${requestId ? `?requestId=${requestId}` : ""}`,
        });
        router.push(`/login?${params.toString()}`);
        return;
      }
      setViewState({
        status: "error",
        result: null,
        errorMessage: getResultErrorMessage(error),
        errorStatus: error?.status || null,
      });
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const recommendations = useMemo(
    () =>
      (viewState.result?.recommendations || []).map((recommendation, index) =>
        ({
          ...mapRecommendationToPolicyCardProps(recommendation, index),
          rank: index + 1,
        })
      ),
    [viewState.result]
  );
  const displayRequestStatus = getRequestStatusForDisplay(
    viewState.result,
    viewState.status
  );
  const statusUi = getRequestStatusUi(displayRequestStatus);

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <StepIndicator current={viewState.status === "done" ? 3 : 2} />

        {!requestId && (
          <ErrorState
            message="추천 요청 ID가 없습니다. 추천 조건을 다시 입력해주세요."
            requestId=""
            statusCode={null}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        )}

        {requestId && viewState.status === "loading" && <LoadingState />}

        {requestId && viewState.status === "follow_up" && (
          <FollowUpGate
            questions={viewState.result?.followUpQuestions || []}
            onSubmit={submitAnswers}
            onSkip={() => submitAnswers([])}
            submitting={submittingAnswers}
          />
        )}

        {requestId && viewState.status === "error" && (
          <ErrorState
            message={viewState.errorMessage}
            requestId={requestId}
            statusCode={viewState.errorStatus}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        )}

        {requestId && viewState.status === "done" && (
          <>
            <div className="mt-4 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
              <div>
                <span className={"dd-pill " + getAiStatusPillClass(statusUi.variant)}>
                  <Icon name="Sparkles" size={14} /> {statusUi.label}
                </span>
                <h1 className="dd-title mt-2" style={{ fontSize: 30 }}>
                  AI가 찾은 맞춤 추천 결과예요
                </h1>
                <p className="mt-2 mb-0" style={{ fontSize: 16, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
                  {sanitizeDisplayText(viewState.result?.reasonSummary) ||
                    "입력하신 가족 상황과 가장 잘 맞는 순서로 정리했어요."}
                </p>
              </div>
              <Link href="/recommend" className="dd-btn dd-btn-ghost" style={{ flex: "none" }}>
                새로 추천 받기 <Icon name="ArrowRight" size={17} />
              </Link>
            </div>

            {eligibilityError && (
              <p
                className="dd-disclaimer mt-3 mb-0"
                role="alert"
                style={{ color: "var(--dd-coral)" }}
              >
                <Icon name="CircleAlert" size={13} /> {eligibilityError}
              </p>
            )}

            <FollowUpQuestions questions={viewState.result?.followUpQuestions || []} />

            {recommendations.length === 0 ? (
              <EmptyState />
            ) : (
              <RecommendationGrid
                recommendations={recommendations}
                onAnalyze={startEligibilityRequest}
                pendingPolicyId={pendingPolicyId}
              />
            )}

            <div className="mt-4 d-flex flex-column align-items-center gap-3 text-center">
              <DisclaimerNote />
              <Link href="/policies" className="dd-btn dd-btn-ghost">
                더 많은 정책 보기 <Icon name="ArrowRight" size={17} />
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function RecommendResultPage() {
  return (
    <Suspense fallback={<RecommendResultFallback />}>
      <RecommendResultContent />
    </Suspense>
  );
}
