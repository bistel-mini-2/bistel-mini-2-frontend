"use client";

// =========================================================================
// 도담 — 정책 상세 (/policies/[id])
// 의도: 한 정책의 핵심 정보를 쉽게 보여주고, 다음 행동(가능성/비교/신청준비/
//       챗봇)을 모달로 바로 연결하는 허브.
// 구성: 제목+태그+관심 · 기본정보 표 · AI 쉬운 요약 + 함께 보면 좋은 정책 ·
//       탭(지원대상~주의사항) · 하단 액션 버튼 → 모달.
// =========================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import Modal from "@/app/components/Modal";
import ActionButtons from "@/app/components/ActionButtons";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import PolicyCompare from "@/app/components/PolicyCompare";
import ApplyPrep from "@/app/components/ApplyPrep";
import { getPolicy, getRelated } from "@/app/data/policies";
import { useLiked } from "@/app/data/useLiked";
import policyApi from "@/apis/policyApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";

const TABS = [
  { key: "target", label: "지원대상" },
  { key: "content", label: "지원내용" },
  { key: "method", label: "신청방법" },
  { key: "periodText", label: "신청기간" },
  { key: "documents", label: "필요서류" },
  { key: "cautions", label: "주의사항" },
];

const MODAL_META = {
  eligibility: { title: "지원 가능성 분석", icon: "ShieldCheck" },
  compare: { title: "유사 정책 비교", icon: "GitCompare" },
  apply: { title: "신청 준비 체크리스트", icon: "HandHeart" },
};

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

const PERIOD_FALLBACK_TEXT = "신청기간은 공식 안내에서 확인해 주세요.";

function getPolicySlug(item) {
  return item.slug || item.policy_slug || item.policy_id;
}

function splitTextItems(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return value
    .split(/\r?\n|(?:^|\s)[•·]\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toPolicyDetail(item) {
  const tag = item.tags?.[0] || item.category || "복지정책";
  const conditionProfile = item.condition_profile || null;
  return {
    id: getPolicySlug(item),
    name: item.name,
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag: item.tag || tag,
    tagTone: item.tagTone || "coral",
    summary:
      item.summary ||
      item.easy_summary ||
      item.benefit_summary ||
      item.benefit_description ||
      "정책 상세 내용을 확인해 보세요.",
    agency: item.agency || "제공기관 정보 없음",
    type: item.benefit_type || "지원 유형 확인 필요",
    region:
      item.region === "national"
        ? "전국"
        : item.region || item.region_code || "지원 지역 확인 필요",
    status:
      STATUS_LABELS[item.application_status] ||
      item.application_status ||
      "신청 상태 확인 필요",
    contact: item.contact || "공식 사이트에서 확인",
    url: item.official_url,
    conditionProfile: conditionProfile
      ? {
          conditionJson: conditionProfile.condition_json || {},
          targetSummary: conditionProfile.target_summary,
          confidence: conditionProfile.confidence,
          reviewRequired: conditionProfile.review_required,
          qualityFlags: conditionProfile.quality_flags || [],
          sourceText: conditionProfile.source_text,
          sourceFields: conditionProfile.source_fields || [],
        }
      : null,
    easySummary:
      item.easy_summary ||
      item.summary ||
      item.benefit_summary ||
      item.benefit_description ||
      "정책 상세 내용을 공식 안내에서 확인해 주세요.",
    detail: {
      target:
        conditionProfile?.target_summary ||
        item.target_description ||
        conditionProfile?.source_text ||
        "지원 대상은 공식 안내에서 확인해 주세요.",
      content:
        item.benefit_description ||
        item.benefit_summary ||
        "지원 내용은 공식 안내에서 확인해 주세요.",
      method: item.application_method || "신청 방법은 공식 안내에서 확인해 주세요.",
      periodText: item.application_period_text || PERIOD_FALLBACK_TEXT,
      documents: splitTextItems(item.required_documents || item.documents),
      cautions: splitTextItems(item.caution || item.cautions),
    },
    related: item.related || [],
  };
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const staticPolicy = getPolicy(id);
  const [policy, setPolicy] = useState(staticPolicy);
  const [loading, setLoading] = useState(!staticPolicy);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState("target");
  const [modal, setModal] = useState(null);
  const {
    has: isLiked,
    toggle: toggleLike,
    pendingIds,
    error: favoriteError,
  } = useLiked();
  const liked = isLiked(id);

  useEffect(() => {
    if (staticPolicy) {
      return;
    }

    const controller = new AbortController();

    async function loadPolicy() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await policyApi.getPolicyDetail(id, {
          signal: controller.signal,
        });
        setPolicy(toPolicyDetail(response));
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
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
  }, [id, retryKey, staticPolicy]);

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
          <Link href="/policies" className="dd-link">정책 리스트로 돌아가기</Link>
        </main>
      </div>
    );
  }

  const related = staticPolicy ? getRelated(policy.id) : [];
  const infoRows = [
    { label: "제공기관", value: policy.agency },
    { label: "지원유형", value: policy.type },
    ...(policy.voucher ? [{ label: "바우처", value: policy.voucher }] : []),
    { label: "지원지역", value: policy.region },
    { label: "신청상태", value: policy.status },
    { label: "문의처", value: policy.contact },
  ];

  const renderTab = () => {
    if (tab === "documents" || tab === "cautions") {
      const items = policy.detail[tab];
      if (items.length === 0) {
        return (
          <p className="mb-0 dd-subtle">
            {tab === "documents"
              ? "필요서류는 공식 안내에서 확인해 주세요."
              : "별도로 등록된 주의사항이 없어요."}
          </p>
        );
      }
      return (
        <ul className="mb-0 ps-3" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      );
    }
    if (tab === "periodText") {
      return <p className="mb-0 dd-subtle">{policy.detail.periodText || PERIOD_FALLBACK_TEXT}</p>;
    }
    if (tab === "target" && policy.conditionProfile?.sourceText) {
      return (
        <div>
          <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
            {policy.detail.target}
          </p>
          <details className="mt-3">
            <summary className="dd-link" style={{ cursor: "pointer", fontSize: 14 }}>
              조건 근거 원문 보기
            </summary>
            <p className="dd-card-soft mt-2 mb-0" style={{ padding: 14, fontSize: 13, color: "var(--dd-stone-600)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {policy.conditionProfile.sourceText}
            </p>
          </details>
        </div>
      );
    }
    return (
      <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
        {policy.detail[tab]}
      </p>
    );
  };

  const handleAction = (key) => {
    if (key === "chat") {
      router.push("/chat");
      return;
    }
    if (key === "eligibility") {
      router.push(`/eligibility?policyId=${policy.id}&source=policy-detail`);
      return;
    }
    setModal(key);
  };

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 24, paddingBottom: 64 }}>
        {/* 뒤로 */}
        <Link href="/policies" className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> 정책 리스트
        </Link>

        {/* 제목 */}
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="d-flex align-items-start gap-3">
            <span className="dd-icon-tile dd-tile-rose" style={{ width: 56, height: 56 }}>
              <Icon name={policy.icon} size={28} />
            </span>
            <div>
              <h1 className="dd-title" style={{ fontSize: 28 }}>{policy.name}</h1>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <span className={"dd-pill dd-pill-" + policy.tagTone}>{policy.tag}</span>
                <span className="dd-pill dd-pill-green"><Icon name="BadgeCheck" size={13} /> {policy.status}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className={"dd-btn dd-btn-sm " + (liked ? "dd-btn-coral" : "dd-btn-ghost")}
            onClick={() => toggleLike(id)}
            disabled={pendingIds.includes(id)}
            style={{ flex: "none" }}
            aria-pressed={liked}
          >
            <Icon name="Heart" size={16} fill={liked ? "currentColor" : "none"} />
            {liked ? "관심" : "관심"}
          </button>
        </div>

        {favoriteError && (
          <p
            className="dd-disclaimer mt-3 mb-0"
            style={{ color: "var(--dd-coral)" }}
          >
            <Icon name="CircleAlert" size={13} /> {favoriteError}
          </p>
        )}

        <div className="row g-4 mt-1">
          {/* 좌측 본문 */}
          <div
            className={
              "col-12 " + (related.length > 0 ? "col-lg-8" : "col-lg-12")
            }
          >
            {/* 기본정보 */}
            <div className="dd-card" style={{ overflow: "hidden" }}>
              <table className="dd-table">
                <tbody>
                  {infoRows.map((r) => (
                    <tr key={r.label}>
                      <th>{r.label}</th>
                      <td style={{ color: "var(--dd-stone-600)" }}>{r.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* AI 쉬운 요약 */}
            <div className="dd-card-soft mt-4" style={{ padding: 22, border: "1px solid var(--dd-coral-100)" }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="dd-pill dd-pill-coral"><Icon name="Sparkles" size={13} /> AI 쉬운 요약</span>
              </div>
              <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-700, #44403c)", lineHeight: 1.8 }}>
                {policy.easySummary}
              </p>
            </div>

            {/* 탭 */}
            <div className="mt-4">
              <div className="dd-tabs">
                {TABS.map((t) => (
                  <button key={t.key} type="button" className={"dd-tab" + (tab === t.key ? " is-active" : "")} onClick={() => setTab(t.key)}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="dd-card mt-3" style={{ padding: 22 }}>
                <p className="fw-bold mb-2" style={{ fontSize: 15, color: "var(--dd-ink)" }}>
                  {TABS.find((t) => t.key === tab)?.label}
                </p>
                {renderTab()}
              </div>
            </div>
          </div>

          {/* 우측: 함께 보면 좋은 정책 */}
          {related.length > 0 && (
          <div className="col-12 col-lg-4">
            <div className="dd-card" style={{ padding: 20, position: "sticky", top: 84 }}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <Icon name="Sparkles" size={16} style={{ color: "var(--dd-coral)" }} />
                <strong style={{ fontSize: 15 }}>함께 보면 좋은 정책</strong>
              </div>
              <div className="d-flex flex-column gap-2">
                {related.map((r) => (
                  <Link key={r.id} href={`/policies/${r.id}`} className="d-flex align-items-center gap-3 dd-card-soft text-decoration-none dd-card-hover" style={{ padding: 12 }}>
                    <span className="dd-icon-tile" style={{ width: 38, height: 38 }}>
                      <Icon name={r.icon} size={18} />
                    </span>
                    <div className="flex-grow-1 min-w-0">
                      <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: 14, color: "var(--dd-ink)" }}>{r.name}</p>
                      <p className="mb-0 text-truncate" style={{ fontSize: 12, color: "var(--dd-stone-500)" }}>{r.tag}</p>
                    </div>
                    <Icon name="ChevronRight" size={16} style={{ color: "var(--dd-stone-400)" }} />
                  </Link>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* 하단 액션 */}
        <div className="dd-card mt-4" style={{ padding: 22 }}>
          <p className="fw-bold mb-3" style={{ fontSize: 16, color: "var(--dd-ink)" }}>다음으로 무엇을 할까요?</p>
          {staticPolicy ? (
            <ActionButtons
              actions={["eligibility", "compare", "apply", "chat"]}
              policyId={policy.id}
              onAction={handleAction}
            />
          ) : (
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="dd-btn dd-btn-blue"
                onClick={() => handleAction("eligibility")}
              >
                <Icon name="ShieldCheck" size={17} /> 지원 가능성 분석
              </button>
              {policy.url && (
                <a
                  href={policy.url}
                  target="_blank"
                  rel="noreferrer"
                  className="dd-btn dd-btn-coral"
                >
                  <Icon name="ExternalLink" size={17} /> 공식 사이트
                </a>
              )}
              <Link href="/chat" className="dd-btn dd-btn-ghost">
                <Icon name="MessageCircle" size={17} /> AI 챗봇에 질문하기
              </Link>
            </div>
          )}
          <div className="mt-3"><DisclaimerNote /></div>
        </div>
      </main>

      {/* ===== 모달 (페이지와 동일한 내용 컴포넌트 재사용) ===== */}
      <Modal open={!!staticPolicy && !!modal && modal !== "chat"} onClose={() => setModal(null)} title={MODAL_META[modal]?.title} icon={MODAL_META[modal]?.icon}>
        {modal === "compare" && <PolicyCompare initialA={policy.id} initialB={policy.related[0]} />}
        {modal === "apply" && <ApplyPrep policyId={policy.id} onAction={(k) => setModal(k)} />}
      </Modal>
    </div>
  );
}
