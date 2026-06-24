"use client";

// =========================================================================
// 도담 — 지원 가능성 분석 결과 (내용 컴포넌트)
// /policies/[id]/eligibility 페이지와 상세 모달이 함께 사용한다.
// 결과 배너 + 분석 표(충족/추가확인 배지) + 입력 요약 + 다시 분석하기 +
// 하단 액션(비교/신청준비) + 면책 문구.
// =========================================================================
import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import eligibilityApi from "@/apis/eligibilityApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import ActionButtons from "@/app/components/ActionButtons";
import { getPolicy, ELIGIBILITY_LEVELS } from "@/app/data/policies";
import {
  DEFAULT_FAMILY,
  FAMILY_PROFILE_KEY,
  RECOMMENDATION_INPUT_KEY,
  createRecommendationPayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";
import { AuthContext } from "@/contexts/AuthContext";

const ENTRY_SOURCE = {
  POLICY_DETAIL: "policy-detail",
  RECOMMENDATION: "recommendation",
};

const SOURCE_TYPE = {
  POLICY_DETAIL: "POLICY_DETAIL",
  RECOMMENDATION_RESULT: "RECOMMENDATION_RESULT",
};

const STATUS_META = {
  ok: { label: "충족", pill: "dd-pill-green", icon: "Check" },
  check: { label: "추가 확인", pill: "dd-pill-amber", icon: "CircleAlert" },
  missing: { label: "추가 확인", pill: "dd-pill-amber", icon: "CircleAlert" },
  conflict: { label: "입력 충돌", pill: "dd-pill-amber", icon: "CircleAlert" },
  no: { label: "미충족", pill: "dd-pill-coral", icon: "X" },
};

const REQUEST_STATUS = {
  READY: "READY",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FOLLOW_UP_REQUIRED: "FOLLOW_UP_REQUIRED",
  FAILED: "FAILED",
};

const POLLING_STATUSES = new Set([
  REQUEST_STATUS.READY,
  REQUEST_STATUS.PROCESSING,
]);

const EVIDENCE_ROLE_LABELS = {
  SUMMARY: "요약 근거",
  TARGET: "대상 조건",
  BENEFIT: "지원 내용",
  APPLICATION: "신청 안내",
  CAUTION: "유의 사항",
};

const normalizeBannerLevel = (level, status) => {
  if (status === REQUEST_STATUS.FAILED) {
    return "low";
  }

  if (status === REQUEST_STATUS.FOLLOW_UP_REQUIRED) {
    return "mid";
  }

  if (level === "medium") {
    return "mid";
  }

  return level || "mid";
};

const normalizeCriteria = (result) => {
  if (Array.isArray(result?.criteria) && result.criteria.length > 0) {
    return result.criteria;
  }

  const note = result?.summary || result?.error_message;

  if (!note) {
    return [];
  }

  return [
    {
      label: "판정 결과",
      status: result.status === REQUEST_STATUS.FAILED ? "no" : "check",
      note,
    },
  ];
};

const CONDITION_LABELS = {
  lifeArray: "대상 상황",
  trgterIndvdlArray: "대상 특성",
  intrsThemaArray: "관심 주제",
  target_description: "지원대상",
  support_target: "지원대상",
  selection_criteria: "선정기준",
  income: "소득 기준",
  income_level: "소득 기준",
  special: "대상 특성",
  stage: "대상 상황",
  childAge: "자녀 연령",
  child_age: "자녀 연령",
  region: "거주 지역",
};

const stripInternalPrefix = (value) => {
  const text = String(value || "").trim();
  const match = text.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.+)$/);

  if (!match) {
    return text;
  }

  const [, fieldName, content] = match;
  const label = CONDITION_LABELS[fieldName];

  return label ? `${label}: ${content.trim()}` : content.trim();
};

const formatCriterionText = (value) =>
  stripInternalPrefix(value)
    .replace(/\blifeArray\b/g, "대상 상황")
    .replace(/\btrgterIndvdlArray\b/g, "대상 특성")
    .replace(/\bintrsThemaArray\b/g, "관심 주제")
    .replace(/\btarget_description\b/g, "지원대상")
    .replace(/\bselection_criteria\b/g, "선정기준")
    .replace(/\bsupport_target\b/g, "지원대상");

const formatCriteriaForDisplay = (criteria) =>
  criteria.map((item) => ({
    ...item,
    label: formatCriterionText(item.label),
    note: formatCriterionText(item.note),
  }));

const normalizeInputSummary = (inputSummary, fallbackFamily) => {
  if (!inputSummary) {
    return fallbackFamily;
  }

  return normalizeFamilyProfile({
    ...fallbackFamily,
    ...inputSummary,
    childAge: inputSummary.childAge || inputSummary.child_age || fallbackFamily.childAge,
  });
};

const normalizeEvidenceText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const getEvidences = (result) => {
  const rawEvidences = Array.isArray(result?.evidences)
    ? result.evidences
    : Array.isArray(result?.evidence)
      ? result.evidence
      : [];
  const seen = new Set();
  let hasSummaryEvidence = false;

  return rawEvidences.filter((evidence) => {
    if (!evidence || typeof evidence !== "object") {
      return false;
    }

    const role = String(evidence.evidence_role || "").toUpperCase();
    if (role === "SUMMARY") {
      if (hasSummaryEvidence) {
        return false;
      }
      hasSummaryEvidence = true;
    }

    const key = [
      role,
      normalizeEvidenceText(evidence.snippet),
      normalizeEvidenceText(evidence.source_title),
      normalizeEvidenceText(evidence.source_url),
    ].join("|");

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const getQuestions = (result) => {
  if (Array.isArray(result?.follow_up_questions) && result.follow_up_questions.length > 0) {
    return result.follow_up_questions;
  }

  if (Array.isArray(result?.questions)) {
    return result.questions;
  }

  return [];
};

const dedupeCriteria = (criteria) => {
  const seen = new Set();
  return criteria.filter((item) => {
    const key = `${item.label || ""}|${item.status || ""}|${item.note || ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const readStoredFamily = () => {
  if (typeof window === "undefined") {
    return DEFAULT_FAMILY;
  }

  const storedFamily = window.localStorage.getItem(FAMILY_PROFILE_KEY);
  if (!storedFamily) {
    return DEFAULT_FAMILY;
  }

  try {
    return normalizeFamilyProfile(JSON.parse(storedFamily));
  } catch {
    window.localStorage.removeItem(FAMILY_PROFILE_KEY);
    return DEFAULT_FAMILY;
  }
};

const readRecommendationInput = (recommendationRequestId) => {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(RECOMMENDATION_INPUT_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    const isSameRequest =
      !recommendationRequestId ||
      String(parsed.requestId) === String(recommendationRequestId);

    if (!isSameRequest) {
      return null;
    }

    return {
      ...parsed,
      family: normalizeFamilyProfile(parsed.family),
    };
  } catch {
    window.localStorage.removeItem(RECOMMENDATION_INPUT_KEY);
    return null;
  }
};

function AnalysisProgress({
  authLoading,
  creatingRequest,
  loadingResult,
  isWaiting,
  isRecommendationSource,
}) {
  const steps = ["인증 확인", "요청 생성", "조건 비교", "결과 정리"];
  const activeStep = authLoading
    ? 0
    : creatingRequest
      ? 1
      : loadingResult || isWaiting
        ? 2
        : 3;
  const progress = `${((activeStep + 1) / steps.length) * 100}%`;
  const title = authLoading
    ? "로그인 상태 확인 중"
    : creatingRequest
      ? "분석 요청 생성 중"
      : isWaiting
        ? "정책 기준 비교 중"
        : "분석 결과 조회 중";

  return (
    <div className="dd-card-soft dd-analysis-progress">
      <div className="d-flex align-items-start gap-3">
        <span className="dd-analysis-loader" aria-hidden="true">
          <Icon name="LoaderCircle" size={20} />
        </span>
        <div className="flex-grow-1">
          <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
            <strong style={{ fontSize: 15 }}>{title}</strong>
            <span className="dd-subtle" style={{ fontSize: 13 }}>
              잠시만 기다려 주세요
            </span>
          </div>
          <p className="mb-0 mt-1 dd-subtle" style={{ fontSize: 14 }}>
            {isRecommendationSource
              ? "추천받을 때 입력한 조건을 이 정책 기준과 비교하고 있어요."
              : "입력 조건을 정책 기준과 비교해서 지원 가능성을 정리하고 있어요."}
          </p>
          <div className="dd-analysis-bar mt-3" aria-hidden="true">
            <span style={{ width: progress }} />
          </div>
          <div className="dd-analysis-steps mt-3">
            {steps.map((step, index) => {
              const state =
                index < activeStep ? "is-done" : index === activeStep ? "is-active" : "";
              return (
                <span key={step} className={`dd-analysis-step ${state}`}>
                  <span className="dd-analysis-step-dot">
                    {index < activeStep ? <Icon name="Check" size={11} /> : index + 1}
                  </span>
                  <span>{step}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EligibilityResult({
  policyId,
  requestId,
  entrySource = ENTRY_SOURCE.POLICY_DETAIL,
  recommendationRequestId,
  family = DEFAULT_FAMILY,
  onAction,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const { isLoading: authLoading, isAuthenticated } = useContext(AuthContext);
  const policy = getPolicy(policyId);
  const creationStartedRef = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFamily, setCurrentFamily] = useState(family);
  const [activeRequestId, setActiveRequestId] = useState(requestId || "");
  const [requestResult, setRequestResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [creatingRequest, setCreatingRequest] = useState(!requestId);
  const [loadingResult, setLoadingResult] = useState(Boolean(requestId));
  const [refreshKey, setRefreshKey] = useState(0);

  const redirectToLogin = useCallback(() => {
    const next = queryString ? `${pathname}?${queryString}` : pathname;
    const params = new URLSearchParams({ next });
    router.push(`/login?${params.toString()}`);
  }, [pathname, queryString, router]);

  useEffect(() => {
    startTransition(() => setCurrentFamily(family));
  }, [family]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const recommendationInput =
      entrySource === ENTRY_SOURCE.RECOMMENDATION
        ? readRecommendationInput(recommendationRequestId)
        : null;
    const nextFamily = recommendationInput?.family || readStoredFamily();
    startTransition(() => setCurrentFamily(nextFamily));
  }, [entrySource, recommendationRequestId]);

  useEffect(() => {
    if (activeRequestId || creationStartedRef.current) {
      return;
    }
    if (!policy) {
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    creationStartedRef.current = true;
    let canceled = false;

    const createAnalysisRequest = async () => {
      setCreatingRequest(true);
      setRequestError("");

      try {
        const recommendationInput =
          entrySource === ENTRY_SOURCE.RECOMMENDATION
            ? readRecommendationInput(recommendationRequestId)
            : null;
        const userConditions =
          recommendationInput?.selectedConditions ||
          createRecommendationPayload(
            recommendationInput?.family || readStoredFamily()
          );
        const policyIdentifier = policy.backendSlug || policy.id;
        const response = await eligibilityApi.createRequest({
          policyId: policyIdentifier,
          userConditions,
          sourceType:
            entrySource === ENTRY_SOURCE.RECOMMENDATION
              ? SOURCE_TYPE.RECOMMENDATION_RESULT
              : SOURCE_TYPE.POLICY_DETAIL,
          sourceRefId:
            recommendationInput?.requestId ||
            recommendationRequestId ||
            policyIdentifier,
          rawQuery: recommendationInput?.rawQuery,
        });
        const nextRequestId = response?.request_id || response?.requestId;

        if (!nextRequestId) {
          throw new Error("분석 요청 번호를 받지 못했어요.");
        }

        if (canceled) {
          return;
        }

        setCreatingRequest(false);
        setActiveRequestId(String(nextRequestId));
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("requestId", String(nextRequestId));
        router.replace(`${pathname}?${nextParams.toString()}`);
      } catch (error) {
        if (error?.status === 401) {
          redirectToLogin();
          return;
        }

        if (!canceled) {
          setRequestError(
            getApiErrorMessage(error, "지원 가능성 분석 요청을 시작하지 못했어요.")
          );
        }
      } finally {
        if (!canceled) {
          setCreatingRequest(false);
        }
      }
    };

    createAnalysisRequest();

    return () => {
      canceled = true;
    };
  }, [
    activeRequestId,
    authLoading,
    entrySource,
    isAuthenticated,
    pathname,
    policy,
    redirectToLogin,
    recommendationRequestId,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (!activeRequestId) {
      return;
    }
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    const controller = new AbortController();
    let timeoutId = null;
    let canceled = false;

    const fetchResult = async () => {
      setRequestError("");
      setLoadingResult(true);

      try {
        const nextResult = await eligibilityApi.getResult(activeRequestId, {
          signal: controller.signal,
        });

        if (canceled) {
          return;
        }

        startTransition(() => setRequestResult(nextResult));

        if (POLLING_STATUSES.has(nextResult?.status)) {
          timeoutId = window.setTimeout(fetchResult, 2000);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") {
          return;
        }

        if (error?.status === 401) {
          redirectToLogin();
          return;
        }

        setRequestError(
          getApiErrorMessage(error, "지원 가능성 분석 결과를 불러오지 못했어요.")
        );
      } finally {
        if (!canceled) {
          setLoadingResult(false);
          setAnalyzing(false);
        }
      }
    };

    fetchResult();

    return () => {
      canceled = true;
      controller.abort();
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    activeRequestId,
    authLoading,
    isAuthenticated,
    pathname,
    queryString,
    refreshKey,
    redirectToLogin,
    router,
  ]);

  const reanalyze = () => {
    if (activeRequestId) {
      setAnalyzing(true);
      setRefreshKey((key) => key + 1);
      return;
    }

    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 700);
  };

  if (!policy && !activeRequestId && !requestResult) {
    return <p className="dd-subtle">정책 정보를 찾을 수 없어요.</p>;
  }

  const isApiMode = Boolean(activeRequestId);
  const requestStatus = requestResult?.status;
  const policyName = requestResult?.policy_name || policy?.name || "정책";
  const actionPolicyId = policy?.id || requestResult?.slug || policyId;

  const elig = isApiMode
    ? {
        summary:
          requestResult?.summary ||
          requestResult?.error_message ||
          (loadingResult ? "분석 결과를 준비하고 있어요." : "분석 결과를 확인해 주세요."),
        criteria: normalizeCriteria(requestResult),
        level: normalizeBannerLevel(requestResult?.banner_level, requestStatus),
      }
    : policy.eligibility;

  const level = ELIGIBILITY_LEVELS[elig.level] || ELIGIBILITY_LEVELS.mid;
  const inputFamily = normalizeInputSummary(requestResult?.input_summary, currentFamily);
  const criteria = dedupeCriteria(formatCriteriaForDisplay(elig.criteria));
  const evidences = getEvidences(requestResult);
  const criteriaLabels = new Set(criteria.map((item) => item.label));
  const questions = getQuestions(requestResult).filter(
    (question) => !criteriaLabels.has(question.field_name || question.label)
  );
  const isWaiting = isApiMode && POLLING_STATUSES.has(requestStatus);
  const isFailed = isApiMode && (requestStatus === REQUEST_STATUS.FAILED || requestError);
  const isPreparing = creatingRequest || (loadingResult && !requestResult);
  const isRunning = isPreparing || isWaiting;
  const isRecommendationSource = entrySource === ENTRY_SOURCE.RECOMMENDATION;
  const sourceLabel = isRecommendationSource ? "추천 입력 조건 기준" : "입력 조건 기준";

  return (
    <div className="d-flex flex-column gap-4">
      {/* 결과 배너 */}
      <div className={"dd-result-banner dd-result-" + level.tone}>
        <span
          className={"dd-icon-tile dd-tile-" + (level.tone === "high" ? "green" : level.tone === "mid" ? "amber" : "rose")}
          style={{ width: 52, height: 52 }}
        >
          <Icon name={level.icon} size={26} />
        </span>
        <div>
          <p className="mb-1 fw-bold" style={{ fontSize: 18, color: "var(--dd-ink)" }}>
            {policyName} · {isWaiting ? "분석 중" : level.label}
          </p>
          {isRecommendationSource && (
            <span className="dd-pill dd-pill-blue mb-2">
              {sourceLabel}
            </span>
          )}
          <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>
            {requestError ||
              (creatingRequest
                ? isRecommendationSource
                  ? "추천 입력 조건을 정리해 분석 요청을 만들고 있어요."
                  : "입력 조건을 정리해 분석 요청을 만들고 있어요."
                : elig.summary)} {!isFailed && !isWaiting && !creatingRequest ? level.desc : ""}
          </p>
        </div>
      </div>

      {isRunning && (
        <AnalysisProgress
          authLoading={authLoading}
          creatingRequest={creatingRequest}
          loadingResult={loadingResult}
          isWaiting={isWaiting}
          isRecommendationSource={isRecommendationSource}
        />
      )}

      {/* 분석 결과 표 */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="px-3 py-3 d-flex align-items-center justify-content-between" style={{ borderBottom: "1px solid var(--dd-stone-100)" }}>
          <strong style={{ fontSize: 15 }}>핵심 조건 확인</strong>
          <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={reanalyze} disabled={analyzing || creatingRequest || !activeRequestId}>
            <Icon name="Wand2" size={15} />
            {analyzing || loadingResult ? "조회 중..." : "다시 조회"}
          </button>
        </div>
        {isPreparing || isWaiting ? (
          <div className="p-3 dd-subtle" style={{ fontSize: 14 }}>
            분석 결과를 불러오고 있어요.
          </div>
        ) : (
          <table className="dd-table">
            <tbody>
              {criteria.map((c) => {
                const status = String(c.status || "check").toLowerCase();
                const sm = STATUS_META[status] || STATUS_META.check;
                return (
                  <tr key={c.label}>
                    <th>{c.label}</th>
                    <td>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className={"dd-pill " + sm.pill}>
                          <Icon name={sm.icon} size={12} />
                          {sm.label}
                        </span>
                        <span style={{ color: "var(--dd-stone-600)" }}>{c.note}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {questions.length > 0 && (
        <div className="dd-card-soft" style={{ padding: 18 }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <Icon name="CircleHelp" size={16} style={{ color: "var(--dd-coral)" }} />
            <strong style={{ fontSize: 14 }}>추가 확인이 필요한 정보</strong>
          </div>
          <ul className="mb-0 ps-3" style={{ color: "var(--dd-stone-600)", fontSize: 14 }}>
            {questions.map((question, index) => (
              <li key={question.follow_up_id || question.id || question.label || index}>
                {typeof question === "string"
                  ? question
                  : question.question_text || question.question || question.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidences.length > 0 && (
        <div className="dd-card dd-evidence-card">
          <div className="dd-section-head">
            <span className="dd-icon-tile dd-tile-blue" style={{ width: 34, height: 34, borderRadius: 12 }}>
              <Icon name="FileText" size={17} />
            </span>
            <div>
              <strong style={{ fontSize: 15 }}>판정 근거</strong>
              <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
                판정에 참고한 정책 기준을 보여드려요.
              </p>
            </div>
          </div>
          <div className="dd-evidence-list">
            {evidences.map((evidence, index) => {
              const role = String(evidence.evidence_role || "").toUpperCase();
              return (
                <div key={evidence.chunk_id || index} className="dd-evidence-item">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="dd-pill dd-pill-blue">
                      {EVIDENCE_ROLE_LABELS[role] || "근거"}
                    </span>
                    {evidence.source_url ? (
                      <a
                        href={evidence.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="dd-subtle text-decoration-none"
                        style={{ fontSize: 13 }}
                      >
                        {evidence.source_title || "출처 보기"}
                      </a>
                    ) : (
                      <span className="dd-subtle" style={{ fontSize: 13 }}>
                        {evidence.source_title || "출처 정보 없음"}
                      </span>
                    )}
                  </div>
                  <p className="mb-0 mt-2" style={{ color: "var(--dd-stone-600)", fontSize: 14, lineHeight: 1.65 }}>
                    {evidence.snippet}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 입력 정보 요약 */}
      <div className="dd-card dd-input-summary-card">
        <div className="dd-section-head">
          <span className="dd-icon-tile dd-tile-rose" style={{ width: 34, height: 34, borderRadius: 12 }}>
            <Icon name="ClipboardList" size={17} />
          </span>
          <div>
            <strong style={{ fontSize: 15 }}>{sourceLabel}</strong>
            <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
              이 조건을 기준으로 정책 조건과 비교했어요.
            </p>
          </div>
        </div>
        <div className="dd-input-summary-grid">
          {familyRows(inputFamily).map((r) => (
            <span key={r.label} className="dd-input-summary-chip">
              <span>{r.label}</span>
              <strong>{r.value}</strong>
            </span>
          ))}
        </div>
      </div>

      {/* 하단 액션 */}
      <div>
        <p className="mb-2 fw-semibold" style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>
          이어서 무엇을 할까요?
        </p>
        <ActionButtons actions={["compare", "apply"]} policyId={actionPolicyId} onAction={onAction} />
      </div>

      <DisclaimerNote />
    </div>
  );
}
