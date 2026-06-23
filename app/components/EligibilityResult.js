"use client";

// =========================================================================
// 도담 — 지원 가능성 분석 결과 (내용 컴포넌트)
// /policies/[id]/eligibility 페이지와 상세 모달이 함께 사용한다.
// 결과 배너 + 분석 표(충족/추가확인 배지) + 입력 요약 + 다시 분석하기 +
// 하단 액션(비교/신청준비) + 면책 문구.
// =========================================================================
import { startTransition, useEffect, useState } from "react";
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
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";

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

const getEvidences = (result) => {
  if (Array.isArray(result?.evidences)) {
    return result.evidences;
  }

  if (Array.isArray(result?.evidence)) {
    return result.evidence;
  }

  return [];
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

export default function EligibilityResult({ policyId, requestId, family = DEFAULT_FAMILY, onAction }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const policy = getPolicy(policyId);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentFamily, setCurrentFamily] = useState(family);
  const [requestResult, setRequestResult] = useState(null);
  const [requestError, setRequestError] = useState("");
  const [loadingResult, setLoadingResult] = useState(Boolean(requestId));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    startTransition(() => setCurrentFamily(family));
  }, [family]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedFamily = window.localStorage.getItem(FAMILY_PROFILE_KEY);
    if (!storedFamily) {
      return;
    }

    try {
      const nextFamily = normalizeFamilyProfile(JSON.parse(storedFamily));
      startTransition(() => setCurrentFamily(nextFamily));
    } catch {
      window.localStorage.removeItem(FAMILY_PROFILE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    const controller = new AbortController();
    let timeoutId = null;
    let canceled = false;

    const fetchResult = async () => {
      setRequestError("");
      setLoadingResult(true);

      try {
        const nextResult = await eligibilityApi.getResult(requestId, {
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
          const currentQuery = searchParams.toString();
          const next = currentQuery ? `${pathname}?${currentQuery}` : pathname;
          const params = new URLSearchParams({ next });
          router.push(`/login?${params.toString()}`);
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
  }, [pathname, requestId, refreshKey, router, searchParams]);

  const reanalyze = () => {
    if (requestId) {
      setAnalyzing(true);
      setRefreshKey((key) => key + 1);
      return;
    }

    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 700);
  };

  if (!policy && !requestId && !requestResult) {
    return <p className="dd-subtle">정책 정보를 찾을 수 없어요.</p>;
  }

  const isApiMode = Boolean(requestId);
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
  const evidences = getEvidences(requestResult);
  const questions = getQuestions(requestResult);
  const isWaiting = isApiMode && POLLING_STATUSES.has(requestStatus);
  const isFailed = isApiMode && (requestStatus === REQUEST_STATUS.FAILED || requestError);

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
          <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>
            {requestError || elig.summary} {!isFailed && !isWaiting ? level.desc : ""}
          </p>
        </div>
      </div>

      {/* 분석 결과 표 */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="px-3 py-3 d-flex align-items-center justify-content-between" style={{ borderBottom: "1px solid var(--dd-stone-100)" }}>
          <strong style={{ fontSize: 15 }}>조건별 분석 결과</strong>
          <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={reanalyze} disabled={analyzing}>
            <Icon name="Wand2" size={15} />
            {analyzing || loadingResult ? "조회 중..." : requestId ? "다시 조회" : "다시 분석하기"}
          </button>
        </div>
        {isWaiting || (loadingResult && !requestResult) ? (
          <div className="p-3 dd-subtle" style={{ fontSize: 14 }}>
            분석 결과를 불러오고 있어요.
          </div>
        ) : (
          <table className="dd-table">
            <tbody>
              {elig.criteria.map((c) => {
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
              <li key={question.id || question.label || index}>
                {typeof question === "string" ? question : question.question || question.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evidences.length > 0 && (
        <div className="dd-card" style={{ overflow: "hidden" }}>
          <div className="px-3 py-3" style={{ borderBottom: "1px solid var(--dd-stone-100)" }}>
            <strong style={{ fontSize: 15 }}>판정 근거</strong>
          </div>
          <div className="d-flex flex-column gap-3 p-3">
            {evidences.map((evidence, index) => {
              const role = String(evidence.evidence_role || "").toUpperCase();
              return (
                <div key={evidence.chunk_id || index} className="d-flex flex-column gap-1">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="dd-pill dd-pill-stone">
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
                  <p className="mb-0" style={{ color: "var(--dd-stone-600)", fontSize: 14 }}>
                    {evidence.snippet}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 입력 정보 요약 */}
      <div className="dd-card-soft" style={{ padding: 18 }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <Icon name="ClipboardList" size={16} style={{ color: "var(--dd-coral)" }} />
          <strong style={{ fontSize: 14 }}>분석에 사용한 입력 정보</strong>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {familyRows(inputFamily).map((r) => (
            <span key={r.label} className="dd-pill dd-pill-stone">
              {r.label}: {r.value}
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
