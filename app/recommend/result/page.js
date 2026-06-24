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
import { getRecommendationResult } from "@/apis/recommendationApi";
import eligibilityApi from "@/apis/eligibilityApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import {
  DEFAULT_FAMILY,
  FAMILY_PROFILE_KEY,
  RECOMMENDATION_INPUT_KEY,
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

const firstText = (...values) =>
  values.find((value) => typeof value === "string" && value.trim())?.trim();

const firstValue = (...values) =>
  values.find((value) => value !== null && value !== undefined && value !== "");

const truncateText = (text, maxLength = 110) => {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength).trimEnd() + "...";
};

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

const getEvidenceText = (evidence) => {
  if (typeof evidence === "string") {
    return truncateText(evidence.trim());
  }

  if (!evidence || typeof evidence !== "object") {
    return "";
  }

  const text = firstText(
    evidence.snippet,
    evidence.content,
    evidence.text,
    evidence.quote,
    evidence.reason,
    evidence.summary
  );
  const source = firstText(
    evidence.source_title,
    evidence.sourceTitle,
    evidence.title,
    evidence.source
  );

  return truncateText([text, source ? `출처: ${source}` : ""].filter(Boolean).join(" · "));
};

const normalizeEvidence = (recommendation) => {
  // raw_evidences는 원문/debug 성격이라 카드에 노출하지 않는다.
  // 표시는 정제된 evidences > evidence 순서만 사용한다.
  const rawEvidence = firstValue(
    recommendation?.evidences,
    recommendation?.evidence,
    recommendation?.evidence_list,
    recommendation?.evidenceList
  );
  const evidenceItems = Array.isArray(rawEvidence) ? rawEvidence : [rawEvidence];

  return evidenceItems
    .map(getEvidenceText)
    .filter(Boolean)
    .slice(0, 2);
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
  // 추천 이유(카드 본문): why_recommended를 최우선으로 사용한다.
  // 상세 지원대상/지원내용 같은 긴 본문은 카드에 싣지 않고 '자세히 보기'로 유도한다.
  // summary와 중복 노출되지 않도록 reason fallback에는 summary를 넣지 않는다.
  const reason =
    firstText(
      recommendation?.why_recommended,
      recommendation?.whyRecommended,
      recommendation?.recommendation_reason,
      recommendation?.recommendationReason,
      recommendation?.reason_summary,
      recommendation?.reasonSummary,
      recommendation?.reason
    ) || "입력하신 조건과 관련성이 높은 정책이에요.";
  // 신청 전 확인사항(보조 1줄): 값이 없으면 빈 문자열로 두어 카드에서 해당 줄을 숨긴다.
  // 모든 카드에 동일한 고정 fallback 문구가 반복되지 않도록 fallback을 두지 않는다.
  const checkBeforeApply =
    firstText(
      recommendation?.check_before_apply,
      recommendation?.checkBeforeApply,
      recommendation?.application_method,
      recommendation?.applicationMethod
    ) || "";

  return {
    key: `${id}-${index}`,
    detailHref,
    // 사용자 표시 점수: priority_score > match_score > confidence_score 순.
    // retrieval_score는 내부 검색 점수라 표시용으로 쓰지 않는다.
    match: normalizeMatchScore(
      firstValue(
        recommendation?.priority_score,
        recommendation?.priorityScore,
        recommendation?.match_score,
        recommendation?.matchScore,
        recommendation?.confidence_score,
        recommendation?.confidenceScore,
        recommendation?.score,
        recommendation?.match
      )
    ),
    evidence: normalizeEvidence(recommendation),
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
      tag:
        firstText(
          recommendation?.category,
          recommendation?.benefit_type,
          recommendation?.benefitType,
          recommendation?.region
        ) || "맞춤 추천",
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

function EvidenceList({ evidence }) {
  // 근거가 없으면 박스 자체를 렌더링하지 않는다(placeholder 문구도 띄우지 않음).
  if (!evidence.length) {
    return null;
  }

  const evidenceRows = evidence.slice(0, 2);

  return (
    <div
      className="w-100 dd-card-soft mt-3"
      style={{
        padding: "10px 12px",
        maxHeight: 116,
        overflow: "hidden",
      }}
    >
      <div className="d-flex align-items-center gap-2 mb-2">
        <Icon name="FileText" size={13} style={{ color: "var(--dd-coral)" }} />
        <strong style={{ fontSize: 12 }}>추천 근거</strong>
      </div>
      <ul
        className="mb-0 ps-3 d-flex flex-column gap-1"
        style={{ fontSize: 12.5, color: "var(--dd-stone-600)", lineHeight: 1.5 }}
      >
        {evidenceRows.map((item) => (
          <li key={item} style={lineClampStyle(2)}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecommendationCard({ item, onAnalyze, analyzing, analyzeDisabled }) {
  const { policy, match, evidence, detailHref, rank } = item;
  const hasPolicyDetail = policy.id && !policy.id.startsWith("recommendation-");

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
            <span className={"dd-pill dd-pill-" + policy.tagTone}>{policy.tag}</span>
            {match != null && (
              <span className="dd-badge-match">
                <Icon name="Star" size={12} fill="currentColor" />
                {match}%
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

      {/* 추천 이유 2줄 */}
      <p
        className="mt-2 mb-0"
        style={{
          fontSize: 14,
          color: "var(--dd-stone-600)",
          lineHeight: 1.6,
          ...lineClampStyle(2),
        }}
      >
        {policy.reason}
      </p>

      {/* 보조: 신청 전 확인사항 1줄 (값이 없으면 줄 자체를 숨김) */}
      {policy.checkBeforeApply && (
        <div
          className="d-flex align-items-start gap-2 mt-3"
          style={{ fontSize: 13, color: "var(--dd-stone-600)" }}
        >
          <Icon
            name="CircleAlert"
            size={14}
            style={{ color: "var(--dd-coral)", marginTop: 2, flex: "none" }}
          />
          <span style={{ lineHeight: 1.5, ...lineClampStyle(1) }}>
            {policy.checkBeforeApply}
          </span>
        </div>
      )}

      {/* 근거 박스: evidence 1~2개, 각 2줄 (없으면 렌더링 안 함) */}
      <EvidenceList evidence={evidence} />

      {/* 하단 버튼: 항상 카드 맨 아래 고정 */}
      <div className="d-flex flex-wrap gap-2" style={{ marginTop: "auto", paddingTop: 16 }}>
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
      </div>
    </article>
  );
}

function RecommendationGrid({ recommendations, onAnalyze, pendingPolicyId }) {
  return (
    <div className="row g-4 mt-1 align-items-stretch">
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
        <StepIndicator current={2} />

        {!requestId && (
          <ErrorState
            message="추천 요청 ID가 없습니다. 추천 조건을 다시 입력해주세요."
            requestId=""
            statusCode={null}
            onRetry={() => setRetryKey((current) => current + 1)}
          />
        )}

        {requestId && viewState.status === "loading" && <LoadingState />}

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
                  {viewState.result?.reasonSummary ||
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
