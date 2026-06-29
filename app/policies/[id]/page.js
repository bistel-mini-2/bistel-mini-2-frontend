"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { useLiked } from "@/app/data/useLiked";
import policyApi from "@/apis/policyApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import {
  getAiStatusPillClass,
  getRequestStatusUi,
} from "@/app/types/aiStatus";

const AI_SUMMARY_POLL_INTERVAL_MS = 2500;
const AI_SUMMARY_MAX_POLLS = 30;
const AI_SUMMARY_WAITING_STATUSES = new Set(["READY", "PROCESSING"]);

const TABS = [
  { key: "target", label: "지원 대상" },
  { key: "content", label: "지원 내용" },
  { key: "method", label: "신청 방법" },
  { key: "cautions", label: "유의 사항" },
  { key: "source", label: "원문/조건" },
];

const CATEGORY_ICONS = {
  "임신·출산": "Baby",
  보육: "Baby",
  "보호·돌봄": "HandHeart",
  생활지원: "Wallet",
  신체건강: "Stethoscope",
  정신건강: "Heart",
  교육: "FileText",
  주거: "Building2",
};

const STATUS_LABELS = {
  AVAILABLE: "신청 가능",
  ONLINE_AVAILABLE: "온라인 신청 가능",
  OFFLINE_ONLY: "방문 신청",
  CLOSED: "신청 마감",
  UNKNOWN: "상세 확인 필요",
};

const STAGE_LABELS = {
  child: "아동",
  teen: "청소년",
  youth: "청년",
  young_adult: "청년",
  adult: "성인",
  senior: "노년",
};

const DETAIL_FALLBACK = "공식 안내에서 확인해 주세요.";

function getPolicySlug(item) {
  return item?.slug || item?.policy_slug || item?.policy_id || "";
}

function displayText(value, fallback = DETAIL_FALLBACK) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (Array.isArray(value)) {
    const joined = value.map((item) => String(item).trim()).filter(Boolean).join(", ");
    return joined || fallback;
  }
  return String(value);
}

function formatRegion(item) {
  if (item.region && item.region !== "national") return item.region;
  if (item.region === "national" || item.region_scope === "national") return "전국";
  return item.region_code || item.region_scope || "지역 정보 확인 필요";
}

function formatStages(stages) {
  if (!Array.isArray(stages) || stages.length === 0) {
    return "";
  }
  return stages.map((stage) => STAGE_LABELS[stage] || stage).join(", ");
}

function summarizeConditionJson(conditionJson) {
  if (!conditionJson || typeof conditionJson !== "object" || Array.isArray(conditionJson)) {
    return "";
  }

  return Object.entries(conditionJson)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") return "";
      if (Array.isArray(value)) {
        return value.length > 0 ? `${key}: ${value.join(", ")}` : "";
      }
      if (typeof value === "object") {
        const nested = Object.entries(value)
          .map(([nestedKey, nestedValue]) =>
            nestedValue === null || nestedValue === undefined || nestedValue === ""
              ? ""
              : `${nestedKey} ${nestedValue}`
          )
          .filter(Boolean)
          .join(", ");
        return nested ? `${key}: ${nested}` : "";
      }
      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

function splitTextItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(/\r?\n|(?:^|\s)[•·\-]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCautions(item, conditionProfile) {
  const cautions = splitTextItems(item.caution || item.cautions);
  const flags = Array.isArray(conditionProfile?.quality_flags)
    ? conditionProfile.quality_flags.filter(Boolean)
    : [];

  if (flags.length > 0) {
    cautions.push(...flags.map((flag) => `확인 필요: ${flag}`));
  }
  if (conditionProfile?.review_required === true) {
    cautions.push("해당 정책은 조건 검토가 필요할 수 있습니다.");
  }

  return cautions;
}

function toRelatedPolicy(item, currentSlug) {
  const slug = getPolicySlug(item);
  if (!slug || String(slug) === String(currentSlug)) {
    return null;
  }

  const tag = item.tags?.[0] || item.category || "복지 정책";
  return {
    id: slug,
    name: item.name || "정책명 확인 필요",
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag,
    region: formatRegion(item),
    summary: item.summary || item.benefit_summary || "",
    targetStage: formatStages(item.target_stage),
  };
}

function toPolicyDetail(item = {}, policySlug) {
  const conditionProfile = item.condition_profile || item.policy_condition_profile || null;
  const conditionSummary = summarizeConditionJson(conditionProfile?.condition_json);
  const sourceText = conditionProfile?.source_text || "";
  const targetText =
    conditionProfile?.target_summary ||
    conditionSummary ||
    sourceText ||
    item.target_description ||
    item.conditions ||
    DETAIL_FALLBACK;
  const benefitText =
    item.benefit_description ||
    item.benefit ||
    item.benefit_summary ||
    item.summary ||
    DETAIL_FALLBACK;
  const methodText =
    item.application_method ||
    item.how_to_apply ||
    (item.official_url ? "공식 사이트에서 신청 방법을 확인해 주세요." : DETAIL_FALLBACK);
  const relatedPolicies = Array.isArray(item.related_policies)
    ? item.related_policies
        .map((related) => toRelatedPolicy(related, getPolicySlug(item) || policySlug))
        .filter(Boolean)
    : [];

  return {
    id: getPolicySlug(item) || policySlug,
    policyId: item.policy_id,
    name: item.name || "정책명 확인 필요",
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag: item.tags?.[0] || item.category || "복지 정책",
    summary: item.summary || item.easy_summary || item.benefit_summary || item.benefit || DETAIL_FALLBACK,
    easySummary:
      item.easy_summary ||
      item.summary ||
      item.benefit_summary ||
      item.benefit ||
      item.benefit_description ||
      DETAIL_FALLBACK,
    agency: displayText(item.agency, "제공 기관 정보 없음"),
    type: displayText(item.benefit_type, "지원 유형 확인 필요"),
    category: [item.category, item.sub_category].filter(Boolean).join(" / "),
    region: formatRegion(item),
    targetStage: formatStages(item.target_stage),
    status: STATUS_LABELS[item.application_status] || item.application_status || "신청 상태 확인 필요",
    contact: displayText(item.contact, "공식 사이트에서 확인"),
    url: item.official_url || "",
    conditionProfile,
    detail: {
      target: targetText,
      content: benefitText,
      method: methodText,
      cautions: buildCautions(item, conditionProfile),
      source: sourceText || conditionSummary || DETAIL_FALLBACK,
    },
    related: relatedPolicies,
  };
}

function getAiSummaryPayload(response) {
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }

  return response || {};
}

function normalizeAiSummaryStatus(status, summary) {
  const value = String(status || "").trim().toUpperCase();

  if (["COMPLETED", "COMPLETE", "DONE", "SUCCESS", "SUCCEEDED"].includes(value)) {
    return "COMPLETED";
  }

  if (["FAILED", "FAILURE", "ERROR"].includes(value)) {
    return "FAILED";
  }

  if (["READY", "PROCESSING", "PENDING", "RUNNING", "LOADING"].includes(value)) {
    return "PROCESSING";
  }

  return summary ? "COMPLETED" : "PROCESSING";
}

function getAiSummaryData(payload) {
  const rawSummary = payload?.summary || payload?.ai_summary || null;
  const rawEvidences = payload?.evidences || payload?.evidence || [];

  if (rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary)) {
    return {
      ...rawSummary,
      evidences: rawSummary.evidences || rawSummary.evidence || rawEvidences,
    };
  }

  if (typeof rawSummary === "string") {
    return {
      easy_summary: rawSummary,
      evidences: rawEvidences,
    };
  }

  if (payload?.easy_summary || payload?.key_points || payload?.evidences || payload?.evidence) {
    return {
      ...payload,
      evidences: rawEvidences,
    };
  }

  return null;
}

function getSummaryTextItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        return [item?.label, item?.content].filter(Boolean).join(": ");
      })
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function PolicyAiSummarySection({
  status,
  summary,
  fallbackSummary,
  errorMessage,
  canRetry,
  onRetry,
}) {
  const statusUi = getRequestStatusUi(status);
  const isWaiting = AI_SUMMARY_WAITING_STATUSES.has(status);
  const isFailed = status === "FAILED";
  const keyPoints = getSummaryTextItems(summary?.key_points);
  const evidences = Array.isArray(summary?.evidences) ? summary.evidences : [];
  const summaryBlocks = [
    { label: "대상", value: summary?.target_summary },
    { label: "혜택", value: summary?.benefit_summary },
    { label: "신청", value: summary?.application_summary },
  ].filter((item) => item.value);

  return (
    <section
      className="dd-card-soft mt-4"
      style={{ padding: 22, border: "1px solid var(--dd-coral-100)" }}
      aria-live="polite"
    >
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
        <span className={"dd-pill " + getAiStatusPillClass(statusUi.variant)}>
          <Icon name="Sparkles" size={13} /> AI 쉬운 요약 · {statusUi.label}
        </span>
        {isFailed && canRetry && (
          <button
            type="button"
            className="dd-btn dd-btn-ghost dd-btn-sm"
            onClick={onRetry}
          >
            <Icon name="RefreshCcw" size={14} /> 다시 시도
          </button>
        )}
      </div>

      {isWaiting && (
        <div className="d-flex align-items-center gap-3">
          <span className="dd-analysis-loader" style={{ width: 36, height: 36 }}>
            <Icon name="LoaderCircle" size={18} />
          </span>
          <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
            AI가 정책 원문을 쉬운 말로 정리하고 있어요. 잠시만 기다려 주세요.
          </p>
        </div>
      )}

      {isFailed && (
        <p className="mb-0" role="alert" style={{ fontSize: 14, color: "var(--dd-coral)", lineHeight: 1.7 }}>
          <Icon name="CircleAlert" size={14} />{" "}
          {errorMessage || "AI 요약을 불러오지 못했어요."}
        </p>
      )}

      {!isWaiting && !isFailed && (
        <>
          <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-700, #44403c)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
            {summary?.easy_summary || fallbackSummary}
          </p>

          {keyPoints.length > 0 && (
            <ul className="mt-3 mb-0 ps-3" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
              {keyPoints.slice(0, 3).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          )}

          {summaryBlocks.length > 0 && (
            <div className="dd-input-summary-grid mt-3" style={{ padding: 0 }}>
              {summaryBlocks.map((item) => (
                <span className="dd-input-summary-chip" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </span>
              ))}
            </div>
          )}

          {evidences.length > 0 && (
            <div className="mt-3">
              <p className="fw-bold mb-2" style={{ fontSize: 13, color: "var(--dd-ink)" }}>근거</p>
              <div className="d-flex flex-column gap-2">
                {evidences.slice(0, 3).map((evidence, index) => (
                  <div className="dd-evidence-item" key={`${typeof evidence === "string" ? evidence : evidence?.snippet || "evidence"}-${index}`}>
                    <p className="mb-1" style={{ fontSize: 13, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>
                      {typeof evidence === "string"
                        ? evidence
                        : evidence?.snippet || evidence?.content || "근거 내용을 확인해 주세요."}
                    </p>
                    {typeof evidence !== "string" && (evidence?.source_title || evidence?.source_url) && (
                      <p className="mb-0" style={{ fontSize: 12, color: "var(--dd-stone-500)" }}>
                        {evidence?.source_url ? (
                          <a className="dd-link" href={evidence.source_url} target="_blank" rel="noreferrer">
                            {evidence?.source_title || "출처 보기"}
                          </a>
                        ) : (
                          evidence.source_title
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const policySlug = String(id || "");
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(policySlug));
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState("target");
  const [summaryRetryKey, setSummaryRetryKey] = useState(0);
  const [aiSummaryState, setAiSummaryState] = useState({
    status: "READY",
    summary: null,
    errorMessage: "",
    canRetry: false,
  });
  const {
    has: isLiked,
    toggle: toggleLike,
    pendingIds,
    error: favoriteError,
    syncFromPolicy,
  } = useLiked();

  useEffect(() => {
    if (!policySlug) {
      return;
    }

    const controller = new AbortController();

    async function loadPolicy() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await policyApi.getPolicyDetail(policySlug, {
          signal: controller.signal,
        });
        syncFromPolicy(response);
        setPolicy(toPolicyDetail(response, policySlug));
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
          setPolicy(null);
          setLoadError(
            getApiErrorMessage(
              requestError,
              "정책 정보를 불러오지 못했어요."
            )
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPolicy();
    return () => controller.abort();
  }, [policySlug, retryKey, syncFromPolicy]);

  const aiSummarySlug = policy?.id || policySlug;

  useEffect(() => {
    if (!aiSummarySlug) {
      return;
    }

    const controller = new AbortController();
    let pollCount = 0;
    let timerId = null;

    async function loadAiSummary() {
      setAiSummaryState((current) => ({
        ...current,
        status: current.summary ? current.status : "PROCESSING",
        errorMessage: "",
        canRetry: false,
      }));

      try {
        const response = await policyApi.getPolicyAiSummary(aiSummarySlug, {
          signal: controller.signal,
        });
        const payload = getAiSummaryPayload(response);
        const summary = getAiSummaryData(payload);
        const status = normalizeAiSummaryStatus(payload.status || summary?.status, summary);

        if (controller.signal.aborted) {
          return;
        }

        setAiSummaryState({
          status,
          summary: status === "COMPLETED" ? summary : null,
          errorMessage: "",
          canRetry: false,
        });

        if (AI_SUMMARY_WAITING_STATUSES.has(status)) {
          if (pollCount < AI_SUMMARY_MAX_POLLS) {
            pollCount += 1;
            timerId = window.setTimeout(loadAiSummary, AI_SUMMARY_POLL_INTERVAL_MS);
          } else {
            setAiSummaryState({
              status: "FAILED",
              summary: null,
              errorMessage: "AI 요약 생성이 예상보다 오래 걸리고 있어요. 잠시 후 다시 시도해 주세요.",
              canRetry: true,
            });
          }
        }
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED" &&
          !controller.signal.aborted
        ) {
          setAiSummaryState({
            status: "FAILED",
            summary: null,
            errorMessage: getApiErrorMessage(
              requestError,
              "AI 요약을 불러오지 못했어요."
            ),
            canRetry: true,
          });
        }
      }
    }

    loadAiSummary();

    return () => {
      controller.abort();
      if (timerId) {
        window.clearTimeout(timerId);
      }
    };
  }, [aiSummarySlug, summaryRetryKey]);

  const liked = isLiked(policy?.id || policySlug);
  const likeSlug = policy?.id || policySlug;

  const infoRows = useMemo(() => {
    if (!policy) return [];
    return [
      { label: "제공 기관", value: policy.agency },
      { label: "분야", value: policy.category || policy.tag },
      { label: "지원 유형", value: policy.type },
      { label: "지역", value: policy.region },
      ...(policy.targetStage ? [{ label: "대상 단계", value: policy.targetStage }] : []),
      { label: "신청 상태", value: policy.status },
      { label: "문의처", value: policy.contact },
    ];
  }, [policy]);

  const renderTab = () => {
    if (!policy) return null;

    if (tab === "cautions") {
      if (policy.detail.cautions.length === 0) {
        return <p className="mb-0 dd-subtle">별도로 등록된 유의사항 없음</p>;
      }
      return (
        <ul className="mb-0 ps-3" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
          {policy.detail.cautions.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    }

    if (tab === "source") {
      return (
        <div>
          <p
            className="mb-0 dd-card-soft"
            style={{
              padding: 14,
              fontSize: 13,
              color: "var(--dd-stone-600)",
              lineHeight: 1.7,
              maxHeight: 280,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {policy.detail.source}
          </p>
        </div>
      );
    }

    return (
      <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {policy.detail[tab]}
      </p>
    );
  };

  const handleEligibility = () => {
    router.push(`/policies/${encodeURIComponent(likeSlug)}/eligibility?source=policy-detail`);
  };

  if (loading) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 60, textAlign: "center" }}>
          <p className="dd-subtle">정책 정보를 불러오는 중이에요.</p>
        </main>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 60, textAlign: "center" }}>
          <p className="mb-3" style={{ color: "var(--dd-coral)" }}>
            <Icon name="CircleAlert" size={15} />{" "}
            {loadError || "정책을 찾을 수 없어요."}
          </p>
          {loadError && (
            <button
              type="button"
              className="dd-btn dd-btn-ghost dd-btn-sm me-2"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              다시 시도
            </button>
          )}
          <Link href="/policies" className="dd-link">
            정책 리스트로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <Link href="/policies" className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> 정책 리스트
        </Link>

        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-start gap-3 min-w-0">
            <span className="dd-icon-tile dd-tile-rose" style={{ width: 56, height: 56, flex: "none" }}>
              <Icon name={policy.icon} size={28} />
            </span>
            <div className="min-w-0">
              <h1 className="dd-title" style={{ fontSize: 28, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {policy.name}
              </h1>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <span className="dd-pill dd-pill-coral">{policy.tag}</span>
                <span className="dd-pill dd-pill-green"><Icon name="BadgeCheck" size={13} /> {policy.status}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={"dd-btn dd-btn-sm " + (liked ? "dd-btn-coral" : "dd-btn-ghost")}
            onClick={() => toggleLike(likeSlug)}
            disabled={pendingIds.includes(likeSlug)}
            style={{ flex: "none" }}
            aria-pressed={liked}
            aria-label={liked ? "관심 정책 해제" : "관심 정책 추가"}
          >
            <Icon name="Heart" size={16} fill={liked ? "currentColor" : "none"} />
            {liked ? "관심 정책" : "관심 등록"}
          </button>
        </div>

        {favoriteError && (
          <p className="dd-disclaimer mt-3 mb-0" style={{ color: "var(--dd-coral)" }}>
            <Icon name="CircleAlert" size={13} /> {favoriteError}
          </p>
        )}

        <div className="row g-4 mt-1">
          <div className={"col-12 " + (policy.related.length > 0 ? "col-lg-8" : "col-lg-12")}>
            <div className="dd-card" style={{ overflow: "hidden" }}>
              <table className="dd-table">
                <tbody>
                  {infoRows.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td style={{ color: "var(--dd-stone-600)", wordBreak: "break-word" }}>{row.value}</td>
                    </tr>
                  ))}
                  {policy.url && (
                    <tr>
                      <th>공식 URL</th>
                      <td>
                        <a
                          href={policy.url}
                          target="_blank"
                          rel="noreferrer"
                          className="dd-link"
                          style={{ overflowWrap: "anywhere" }}
                        >
                          공식 사이트 바로가기
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PolicyAiSummarySection
              status={aiSummaryState.status}
              summary={aiSummaryState.summary}
              fallbackSummary={policy.easySummary}
              errorMessage={aiSummaryState.errorMessage}
              canRetry={aiSummaryState.canRetry}
              onRetry={() => setSummaryRetryKey((current) => current + 1)}
            />

            <div className="mt-4">
              <div className="dd-tabs">
                {TABS.map((tabItem) => (
                  <button
                    key={tabItem.key}
                    type="button"
                    className={"dd-tab" + (tab === tabItem.key ? " is-active" : "")}
                    onClick={() => setTab(tabItem.key)}
                  >
                    {tabItem.label}
                  </button>
                ))}
              </div>
              <div className="dd-card mt-3" style={{ padding: 22 }}>
                <p className="fw-bold mb-2" style={{ fontSize: 15, color: "var(--dd-ink)" }}>
                  {TABS.find((tabItem) => tabItem.key === tab)?.label}
                </p>
                {renderTab()}
              </div>
            </div>
          </div>

          {policy.related.length > 0 && (
            <div className="col-12 col-lg-4">
              <div className="dd-card" style={{ padding: 20, position: "sticky", top: 84 }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Icon name="Sparkles" size={16} style={{ color: "var(--dd-coral)" }} />
                  <strong style={{ fontSize: 15 }}>함께 보면 좋은 정책</strong>
                </div>
                <div className="d-flex flex-column gap-2">
                  {policy.related.map((relatedPolicy) => (
                    <Link
                      key={relatedPolicy.id}
                      href={`/policies/${encodeURIComponent(relatedPolicy.id)}`}
                      className="d-flex align-items-center gap-3 dd-card-soft text-decoration-none dd-card-hover"
                      style={{ padding: 12 }}
                    >
                      <span className="dd-icon-tile" style={{ width: 38, height: 38, flex: "none" }}>
                        <Icon name={relatedPolicy.icon} size={18} />
                      </span>
                      <div className="flex-grow-1 min-w-0">
                        <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: 14, color: "var(--dd-ink)" }}>{relatedPolicy.name}</p>
                        <p className="mb-0 text-truncate" style={{ fontSize: 12, color: "var(--dd-stone-500)" }}>
                          {[relatedPolicy.tag, relatedPolicy.region, relatedPolicy.targetStage].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Icon name="ChevronRight" size={16} style={{ color: "var(--dd-stone-400)" }} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dd-card mt-4" style={{ padding: 22 }}>
          <p className="fw-bold mb-3" style={{ fontSize: 16, color: "var(--dd-ink)" }}>다음으로 무엇을 할까요?</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dd-btn dd-btn-blue" onClick={handleEligibility}>
              <Icon name="ShieldCheck" size={17} /> 지원 가능성 분석
            </button>
            {policy.url && (
              <a href={policy.url} target="_blank" rel="noreferrer" className="dd-btn dd-btn-coral">
                <Icon name="ExternalLink" size={17} /> 공식 사이트
              </a>
            )}
            <Link href="/chat" className="dd-btn dd-btn-ghost">
              <Icon name="MessageCircle" size={17} /> AI 챗봇에 질문하기
            </Link>
          </div>
          <div className="mt-3"><DisclaimerNote /></div>
        </div>
      </main>
    </div>
  );
}
