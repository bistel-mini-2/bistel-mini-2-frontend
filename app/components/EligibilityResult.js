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
  useMemo,
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
  FAMILY_OPTIONS,
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

const PENDING_ELIGIBILITY = {
  summary: "지원 가능성 분석 요청을 준비하고 있어요.",
  criteria: [],
  level: "mid",
};

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

  const note =
    sanitizeEligibilityMessage(result?.summary) ||
    sanitizeEligibilityMessage(result?.error_message);

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

const toReadableText = (value) =>
  formatCriterionText(value)
    .replace(/[{}[\]"]/g, "")
    .replace(/\bTRUE\b|\bFALSE\b|\bNULL\b/gi, "")
    .replace(/\s*[,|]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();

const isInternalCriterionText = (value) => {
  const text = String(value || "").trim();

  return (
    !text ||
    /^SERVICE_FIELD_/i.test(text) ||
    /^RULE_/i.test(text) ||
    /^FIELD_/i.test(text) ||
    /NOT_SUPPORTED|NEEDS_REVIEW|INTERNAL|DEBUG/i.test(text)
  );
};

const formatCriteriaForDisplay = (criteria) =>
  criteria
    .map((item) => ({
      ...item,
      label: toReadableText(item.label),
      note: toReadableText(item.note),
    }))
    .filter((item) => !isInternalCriterionText(item.label));

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

const EVIDENCE_FIELD_LABELS = {
  age: "연령",
  childAge: "자녀 연령",
  child_age: "자녀 연령",
  stage: "가족 상황",
  income: "소득",
  income_level: "소득",
  income_status: "소득",
  median_income_percent: "소득",
  benefit_status: "수급 여부",
  special: "가구 특성",
  target: "지원 대상",
  target_type: "지원 대상",
  target_context: "지원 대상",
  debt_status: "채무 상황",
  caregiver_type: "보호자 유형",
  pregnancy_or_birth: "임신·출산 여부",
  eligible_household: "가구 조건",
};

const extractEvidencePolicyName = (text) => {
  const match = text.match(/정책명:\s*(.+?)\s+섹션:/);
  return match?.[1]?.trim() || "";
};

const formatStructuredEvidenceSnippet = (text) => {
  const policyName = extractEvidencePolicyName(text);
  const fields = [
    ...new Set(
      [...text.matchAll(/field:\s*([^,\s]+)/g)]
        .map((match) => EVIDENCE_FIELD_LABELS[match[1]] || match[1])
        .filter(Boolean)
    ),
  ];
  const fieldText =
    fields.length > 0
      ? `${fields.slice(0, 3).join(", ")} 조건`
      : "지원 대상과 선정 기준";

  return `${policyName ? `${policyName}은 ` : ""}${fieldText}을 기준으로 입력한 정보와 맞는지 확인했어요. 자세한 기준은 원문에서 확인할 수 있어요.`;
};

const formatEvidenceSnippet = (value) => {
  const text = toReadableText(value)
    .replace(/^정책명:\s*.+?\s+섹션:\s*.+?\s+내용:\s*/u, "")
    .trim();

  if (/조건 구조|field:\s*|operator:\s*|matching_strength|조건 그룹/i.test(text)) {
    return formatStructuredEvidenceSnippet(toReadableText(value));
  }

  if (text.length <= 240) {
    return text;
  }

  const sentenceEnd = text.lastIndexOf(".", 220);
  const koreanSentenceEnd = text.lastIndexOf("다.", 220);
  const cutPoint = Math.max(sentenceEnd, koreanSentenceEnd);

  return `${text.slice(0, cutPoint > 80 ? cutPoint + 1 : 220).trim()}...`;
};

const getCriteriaStatusMessage = (status) => {
  const normalized = String(status || "check").toLowerCase();

  if (normalized === "ok") {
    return "입력한 조건이 이 기준에 맞아요.";
  }

  if (normalized === "no") {
    return "입력한 조건이 이 기준과 맞지 않아요.";
  }

  if (normalized === "conflict") {
    return "입력값끼리 충돌해서 다시 확인이 필요해요.";
  }

  return "정확한 판정을 위해 추가 확인이 필요해요.";
};

const getCriteriaNote = (criterion) => {
  const note = String(criterion?.note || "").trim();

  if (!note || /^수동 확인이 필요합니다\.?$/i.test(note)) {
    return "";
  }

  return note;
};

const TECHNICAL_ERROR_PATTERNS = [
  /consuming input failed/i,
  /server closed the connection unexpectedly/i,
  /terminated abnormally/i,
  /connection refused/i,
  /database/i,
  /psycopg/i,
];

const sanitizeEligibilityMessage = (message, fallback = "") => {
  const text = String(message || "").trim();

  if (!text) {
    return fallback;
  }

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(text))) {
    return "서버 연결이 일시적으로 끊겨 분석을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }

  return text;
};

const getEligibilityErrorMessage = (error, fallback) => {
  const message = getApiErrorMessage(error, fallback);
  return sanitizeEligibilityMessage(message, fallback);
};

const isConfirmationCriterion = (criterion) => {
  const status = String(criterion?.status || "").toLowerCase();
  const label = String(criterion?.label || "").trim();

  return (
    ["check", "missing", "conflict"].includes(status) &&
    label &&
    label !== "판정 결과" &&
    !isInternalCriterionText(label)
  );
};

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

const FOLLOW_UP_FIELD_ALIASES = {
  child_age: "childAge",
  childAge: "childAge",
  age: "childAge",
  income: "income",
  income_level: "income",
  median_income_percent: "income",
  stage: "stage",
  lifeArray: "stage",
  special: "special",
  trgterIndvdlArray: "special",
  manual_confirmation: "manual_confirmation",
};

const FOLLOW_UP_FIELD_LABELS = {
  stage: "가족 상황",
  childAge: "자녀 연령대",
  income: "가구 소득",
  special: "특수 상황",
  manual_confirmation: "추가 확인 조건",
};

const MANUAL_CONFIRMATION_OPTIONS = [
  { value: "yes", label: "예, 해당돼요" },
  { value: "no", label: "아니요, 해당되지 않아요" },
  { value: "unknown", label: "잘 모르겠어요" },
];

const normalizeFollowUpField = (question) => {
  const rawField =
    typeof question === "string"
      ? ""
      : question.field_name ||
        question.field ||
        question.condition_key ||
        question.label ||
        "";

  return FOLLOW_UP_FIELD_ALIASES[rawField] || rawField;
};

const getQuestionText = (question) =>
  typeof question === "string"
    ? question
    : question.question_text || question.question || question.label || "추가 정보가 필요해요.";

const getFollowUpQuestionKey = (question, index) =>
  String(
    question?.follow_up_id ||
      question?.id ||
      question?.question_text ||
      question?.question ||
      question?.label ||
      `question-${index}`
  );

const getFollowUpOptions = (question, field) => {
  if (Array.isArray(question?.options) && question.options.length > 0) {
    return question.options.map((option) =>
      typeof option === "string"
        ? { value: option, label: option }
        : {
            value: option.value || option.code || option.label,
            label: option.label || option.name || option.value || option.code,
          }
    );
  }

  return FAMILY_OPTIONS[field] || [];
};

const buildBaseUserConditions = (entrySource, recommendationRequestId) => {
  const recommendationInput =
    entrySource === ENTRY_SOURCE.RECOMMENDATION
      ? readRecommendationInput(recommendationRequestId)
      : null;

  const family = recommendationInput?.family || readStoredFamily();
  const conditions =
    recommendationInput?.selectedConditions || createRecommendationPayload(family);

  return {
    conditions,
    family: normalizeFamilyProfile(family),
    recommendationInput,
  };
};

const mergeFollowUpConditions = (baseConditions, answers) => {
  const merged = { ...baseConditions };

  Object.entries(answers).forEach(([field, value]) => {
    if (value === "" || value == null) {
      return;
    }

    merged[field] = value;
  });

  return merged;
};

const mergeManualConfirmations = (baseConditions, confirmations) => {
  if (confirmations.length === 0) {
    return baseConditions;
  }

  return {
    ...baseConditions,
    manual_confirmations: confirmations,
  };
};

const resolveFollowUpAnswers = (questions, answers, inputFamily) => {
  const resolved = {};

  questions.forEach((question) => {
    const field = normalizeFollowUpField(question);
    if (!field || field === "region") {
      return;
    }

    const value = answers[field] ?? inputFamily[field] ?? "";
    if (value !== "") {
      resolved[field] = value;
    }
  });

  return resolved;
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
  const policyIdentifier = policy?.backendSlug || policy?.id || policyId;
  const creationStartedRef = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFamily, setCurrentFamily] = useState(family);
  const [activeRequestId, setActiveRequestId] = useState(requestId || "");
  const [requestResult, setRequestResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [creatingRequest, setCreatingRequest] = useState(!requestId);
  const [loadingResult, setLoadingResult] = useState(Boolean(requestId));
  const [refreshKey, setRefreshKey] = useState(0);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [manualConfirmationAnswers, setManualConfirmationAnswers] = useState({});
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  const redirectToLogin = useCallback(() => {
    const next = queryString ? `${pathname}?${queryString}` : pathname;
    const params = new URLSearchParams({ next });
    router.push(`/login?${params.toString()}`);
  }, [pathname, queryString, router]);
  const inputFamily = useMemo(
    () => normalizeInputSummary(requestResult?.input_summary, currentFamily),
    [requestResult?.input_summary, currentFamily]
  );

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
    if (!policyIdentifier) {
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
        const { conditions: userConditions, recommendationInput } =
          buildBaseUserConditions(entrySource, recommendationRequestId);
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
        const nextParams = new URLSearchParams(queryString);
        nextParams.set("requestId", String(nextRequestId));
        router.replace(`${pathname}?${nextParams.toString()}`);
      } catch (error) {
        if (error?.status === 401) {
          redirectToLogin();
          return;
        }

        if (!canceled) {
          setRequestError(
            getEligibilityErrorMessage(error, "지원 가능성 분석 요청을 시작하지 못했어요.")
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
    policyIdentifier,
    queryString,
    redirectToLogin,
    recommendationRequestId,
    router,
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
          getEligibilityErrorMessage(error, "지원 가능성 분석 결과를 불러오지 못했어요.")
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

  const handleFollowUpChange = (field, value) => {
    setFollowUpAnswers((answers) => ({
      ...answers,
      [field]: value,
    }));
  };

  const handleManualConfirmationChange = (key, value) => {
    setManualConfirmationAnswers((answers) => ({
      ...answers,
      [key]: value,
    }));
  };

  const submitFollowUpAnswers = async (event) => {
    event.preventDefault();

    if (!policyIdentifier || submittingFollowUp) {
      return;
    }

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      redirectToLogin();
      return;
    }

    setSubmittingFollowUp(true);
    setCreatingRequest(true);
    setRequestError("");

    try {
      const { conditions, family: baseFamily, recommendationInput } =
        buildBaseUserConditions(entrySource, recommendationRequestId);
      const resolvedAnswers = resolveFollowUpAnswers(
        getQuestions(requestResult),
        followUpAnswers,
        inputFamily
      );
      const questionConfirmations = manualFollowUpQuestions
        .map((question, index) => {
          const key = getFollowUpQuestionKey(question, index);
          const answer = manualConfirmationAnswers[key];
          if (!answer) {
            return null;
          }

          return {
            question: getQuestionText(question),
            answer,
            source: question.source_point || question.source || null,
            note: question.reason || null,
          };
        })
        .filter(Boolean);
      const criteriaConfirmations = confirmationQuestions
        .map((criterion, index) => {
          const key = `${criterion.label}-${index}`;
          const answer = manualConfirmationAnswers[key];
          if (!answer) {
            return null;
          }

          return {
            question: criterion.label,
            answer,
            source: criterion.source_point || criterion.source || null,
            note: getCriteriaNote(criterion) || null,
          };
        })
        .filter(Boolean);
      const manualConfirmations = [
        ...questionConfirmations,
        ...criteriaConfirmations,
      ];
      const userConditions = mergeManualConfirmations(
        mergeFollowUpConditions(conditions, resolvedAnswers),
        manualConfirmations
      );
      const nextFamily = normalizeFamilyProfile({
        ...baseFamily,
        ...resolvedAnswers,
      });
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
          activeRequestId ||
          policyIdentifier,
        rawQuery: recommendationInput?.rawQuery,
      });
      const nextRequestId = response?.request_id || response?.requestId;

      if (!nextRequestId) {
        throw new Error("분석 요청 번호를 받지 못했어요.");
      }

      startTransition(() => {
        setCurrentFamily(nextFamily);
        setRequestResult(null);
      });
      setActiveRequestId(String(nextRequestId));
      setLoadingResult(true);

      const nextParams = new URLSearchParams(queryString);
      nextParams.set("requestId", String(nextRequestId));
      router.replace(`${pathname}?${nextParams.toString()}`);
    } catch (error) {
      if (error?.status === 401) {
        redirectToLogin();
        return;
      }

      setRequestError(
        getEligibilityErrorMessage(error, "추가 정보를 반영한 재분석 요청을 시작하지 못했어요.")
      );
    } finally {
      setSubmittingFollowUp(false);
      setCreatingRequest(false);
    }
  };

  if (!policyIdentifier && !activeRequestId && !requestResult) {
    return <p className="dd-subtle">정책 정보를 찾을 수 없어요.</p>;
  }

  const isApiMode = Boolean(activeRequestId);
  const requestStatus = requestResult?.status;
  const policyName = requestResult?.policy_name || policy?.name || "정책";
  const actionPolicyId = policy?.id || requestResult?.slug || policyId;

  const elig = isApiMode
    ? {
        summary:
          sanitizeEligibilityMessage(requestResult?.summary) ||
          sanitizeEligibilityMessage(requestResult?.error_message) ||
          (loadingResult ? "분석 결과를 준비하고 있어요." : "분석 결과를 확인해 주세요."),
        criteria: normalizeCriteria(requestResult),
        level: normalizeBannerLevel(requestResult?.banner_level, requestStatus),
      }
    : policy?.eligibility || PENDING_ELIGIBILITY;

  const level = ELIGIBILITY_LEVELS[elig.level] || ELIGIBILITY_LEVELS.mid;
  const criteria = dedupeCriteria(formatCriteriaForDisplay(elig.criteria));
  const evidences = getEvidences(requestResult);
  const criteriaLabels = new Set(criteria.map((item) => item.label));
  const questions = getQuestions(requestResult).filter(
    (question) => !criteriaLabels.has(question.field_name || question.label)
  );
  const manualFollowUpQuestions = questions.filter(
    (question) => normalizeFollowUpField(question) === "manual_confirmation"
  );
  const hasRegionOnlyQuestions = questions.some(
    (question) => normalizeFollowUpField(question) === "region"
  );
  const actionableQuestions = questions.filter((question) => {
    const field = normalizeFollowUpField(question);
    return Boolean(field) && field !== "region" && field !== "manual_confirmation";
  });
  const confirmationQuestions = criteria.filter(isConfirmationCriterion);
  const confirmationQuestionKeys = new Set(
    confirmationQuestions.map((criterion) => criterion.label)
  );
  const displayCriteria = criteria.filter(
    (criterion) => !confirmationQuestionKeys.has(criterion.label)
  );
  const canSubmitFollowUp =
    (actionableQuestions.length > 0 ||
      manualFollowUpQuestions.length > 0 ||
      confirmationQuestions.length > 0) &&
    actionableQuestions.every((question) => {
      const field = normalizeFollowUpField(question);
      const value = followUpAnswers[field] ?? inputFamily[field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    }) &&
    manualFollowUpQuestions.every((question, index) =>
      Boolean(manualConfirmationAnswers[getFollowUpQuestionKey(question, index)])
    ) &&
    confirmationQuestions.every((criterion, index) =>
      Boolean(manualConfirmationAnswers[`${criterion.label}-${index}`])
    );
  const needsUserInput =
    actionableQuestions.length > 0 ||
    manualFollowUpQuestions.length > 0 ||
    confirmationQuestions.length > 0;
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
            {sanitizeEligibilityMessage(requestError) ||
              (creatingRequest
                ? isRecommendationSource
                  ? "추천 입력 조건을 정리해 분석 요청을 만들고 있어요."
                  : "입력 조건을 정리해 분석 요청을 만들고 있어요."
                : sanitizeEligibilityMessage(elig.summary))} {!isFailed && !isWaiting && !creatingRequest ? level.desc : ""}
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

      {needsUserInput && (
        <div className="dd-card dd-follow-up-card dd-follow-up-card-emphasis">
          <div className="dd-section-head">
            <span className="dd-icon-tile dd-tile-amber" style={{ width: 38, height: 38, borderRadius: 12 }}>
              <Icon name="CircleHelp" size={18} />
            </span>
            <div>
              <strong style={{ fontSize: 16 }}>답변이 더 필요해요</strong>
              <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
                아래 정보를 입력하면 같은 정책에 대해 바로 다시 분석할 수 있어요.
              </p>
            </div>
          </div>
          <form className="dd-follow-up-form" onSubmit={submitFollowUpAnswers}>
            {actionableQuestions.map((question, index) => {
              const field = normalizeFollowUpField(question);
              const options = getFollowUpOptions(question, field);
              const value = followUpAnswers[field] ?? inputFamily[field] ?? "";

              return (
                <label
                  key={question.follow_up_id || question.id || `${field}-${index}`}
                  className="dd-follow-up-field"
                >
                  <span className="dd-follow-up-label">
                    {FOLLOW_UP_FIELD_LABELS[field] || question.label || "추가 정보"}
                  </span>
                  <span className="dd-follow-up-question">{getQuestionText(question)}</span>
                  {options.length > 0 ? (
                    <select
                      className="form-select dd-follow-up-control"
                      value={value}
                      onChange={(event) => handleFollowUpChange(field, event.target.value)}
                    >
                      <option value="">선택해 주세요</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="form-control dd-follow-up-control"
                      value={value}
                      onChange={(event) => handleFollowUpChange(field, event.target.value)}
                      placeholder="답변을 입력해 주세요"
                    />
                  )}
                </label>
              );
            })}
            {manualFollowUpQuestions.map((question, index) => {
              const key = getFollowUpQuestionKey(question, index);
              const options = getFollowUpOptions(question, "manual_confirmation");

              return (
                <label key={key} className="dd-follow-up-field">
                  <span className="dd-follow-up-label">
                    {FOLLOW_UP_FIELD_LABELS.manual_confirmation}
                  </span>
                  <span className="dd-follow-up-question">
                    {getQuestionText(question)}
                  </span>
                  <select
                    className="form-select dd-follow-up-control"
                    value={manualConfirmationAnswers[key] || ""}
                    onChange={(event) =>
                      handleManualConfirmationChange(key, event.target.value)
                    }
                  >
                    <option value="">선택해 주세요</option>
                    {(options.length > 0 ? options : MANUAL_CONFIRMATION_OPTIONS).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                  {question.reason && (
                    <span className="dd-follow-up-question">{question.reason}</span>
                  )}
                </label>
              );
            })}
            {confirmationQuestions.map((criterion, index) => {
              const key = `${criterion.label}-${index}`;

              return (
                <label key={key} className="dd-follow-up-field">
                  <span className="dd-follow-up-label">추가 확인 조건</span>
                  <span className="dd-follow-up-question">
                    {criterion.label}
                  </span>
                  <select
                    className="form-select dd-follow-up-control"
                    value={manualConfirmationAnswers[key] || ""}
                    onChange={(event) =>
                      handleManualConfirmationChange(key, event.target.value)
                    }
                  >
                    <option value="">선택해 주세요</option>
                    {MANUAL_CONFIRMATION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {getCriteriaNote(criterion) && (
                    <span className="dd-follow-up-question">
                      {getCriteriaNote(criterion)}
                    </span>
                  )}
                </label>
              );
            })}
            {actionableQuestions.length === 0 &&
              manualFollowUpQuestions.length === 0 &&
              confirmationQuestions.length === 0 && (
              <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
                추가로 확인할 내용은 있지만, 현재 화면에서 직접 입력할 수 있는 항목은 없어요.
              </p>
            )}
            {hasRegionOnlyQuestions && (
              <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
                현재 중앙부처 정책 기준이라 지역 정보는 추가 입력에서 제외했어요.
              </p>
            )}
            {(actionableQuestions.length > 0 ||
              manualFollowUpQuestions.length > 0 ||
              confirmationQuestions.length > 0) && (
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="dd-btn dd-btn-primary"
                  disabled={!canSubmitFollowUp || submittingFollowUp || creatingRequest}
                >
                  <Icon name={submittingFollowUp ? "LoaderCircle" : "Send"} size={15} />
                  {submittingFollowUp ? "재분석 요청 중..." : "입력값으로 다시 분석"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* 분석 결과 표 */}
      <div className="dd-card dd-criteria-card">
        <div className="px-3 py-3 d-flex align-items-start justify-content-between gap-3" style={{ borderBottom: "1px solid var(--dd-stone-100)" }}>
          <div>
            <strong style={{ fontSize: 15 }}>정책 조건과 내 입력 비교</strong>
            <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
              내가 입력한 정보가 정책 기준에 맞는지 항목별로 정리했어요.
            </p>
          </div>
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
          <div className="dd-criteria-list">
            {displayCriteria.length === 0 && (
              <div className="dd-criteria-item">
                <strong>추가 확인 항목을 입력해 주세요</strong>
                <p className="mb-0 dd-criteria-message">
                  위 입력 영역의 답변을 반영하면 정책 조건과 다시 비교할 수 있어요.
                </p>
              </div>
            )}
            {displayCriteria.map((c) => {
              const status = String(c.status || "check").toLowerCase();
              const sm = STATUS_META[status] || STATUS_META.check;
              const note = getCriteriaNote(c);
              return (
                <div key={c.label} className="dd-criteria-item">
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <strong>{c.label || "확인 항목"}</strong>
                    <span className={"dd-pill " + sm.pill}>
                      <Icon name={sm.icon} size={12} />
                      {sm.label}
                    </span>
                  </div>
                  <p className="mb-0 dd-criteria-message">{getCriteriaStatusMessage(status)}</p>
                  {note && (
                    <p className="mb-0 dd-criteria-note">{note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {evidences.length > 0 && (
        <div className="dd-card dd-evidence-card">
          <div className="dd-section-head">
            <span className="dd-icon-tile dd-tile-blue" style={{ width: 34, height: 34, borderRadius: 12 }}>
              <Icon name="FileText" size={17} />
            </span>
            <div>
              <strong style={{ fontSize: 15 }}>판정 근거</strong>
              <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
                정책 문서에서 확인한 기준을 읽기 쉽게 정리했어요.
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
                    <strong className="dd-evidence-title">
                      판정에 참고한 기준
                    </strong>
                    {evidence.source_url ? (
                      <a
                        href={evidence.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="dd-subtle text-decoration-none"
                        style={{ fontSize: 13 }}
                      >
                        원문 보기
                      </a>
                    ) : (
                      <span className="dd-subtle" style={{ fontSize: 13 }}>
                        {evidence.source_title || "원문 출처 정보 없음"}
                      </span>
                    )}
                  </div>
                  <p className="mb-0 mt-2 dd-evidence-summary">
                    {evidence.display_text || formatEvidenceSnippet(evidence.snippet)}
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
