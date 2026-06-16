"use client";

// =========================================================================
// 도담 — 정책 상세 (/policies/[id])
// 의도: 한 정책의 핵심 정보를 쉽게 보여주고, 다음 행동(가능성/비교/신청준비/
//       챗봇)을 모달로 바로 연결하는 허브.
// 구성: 제목+태그+관심 · 기본정보 표 · AI 쉬운 요약 + 함께 보면 좋은 정책 ·
//       탭(지원대상~주의사항) · 하단 액션 버튼 → 모달.
// =========================================================================
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import Modal from "@/app/components/Modal";
import ActionButtons from "@/app/components/ActionButtons";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import EligibilityResult from "@/app/components/EligibilityResult";
import PolicyCompare from "@/app/components/PolicyCompare";
import ApplyPrep from "@/app/components/ApplyPrep";
import { getPolicy, getRelated } from "@/app/data/policies";

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

export default function PolicyDetailPage() {
  const { id } = useParams();
  const policy = getPolicy(id);
  const [tab, setTab] = useState("target");
  const [liked, setLiked] = useState(false);
  const [modal, setModal] = useState(null);

  if (!policy) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 60, textAlign: "center" }}>
          <p className="dd-subtle">정책을 찾을 수 없어요.</p>
          <Link href="/policies" className="dd-link">정책 리스트로 돌아가기</Link>
        </main>
      </div>
    );
  }

  const related = getRelated(policy.id);
  const infoRows = [
    { label: "제공기관", value: policy.agency },
    { label: "지원유형", value: policy.type },
    { label: "바우처", value: policy.voucher },
    { label: "지원지역", value: policy.region },
    { label: "신청상태", value: policy.status },
    { label: "문의처", value: policy.contact },
  ];

  const renderTab = () => {
    if (tab === "documents" || tab === "cautions") {
      const items = policy.detail[tab];
      return (
        <ul className="mb-0 ps-3" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
          {items.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      );
    }
    return (
      <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
        {policy.detail[tab]}
      </p>
    );
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
            onClick={() => setLiked((v) => !v)}
            style={{ flex: "none" }}
            aria-pressed={liked}
          >
            <Icon name="Heart" size={16} fill={liked ? "currentColor" : "none"} />
            {liked ? "관심" : "관심"}
          </button>
        </div>

        <div className="row g-4 mt-1">
          {/* 좌측 본문 */}
          <div className="col-12 col-lg-8">
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
        </div>

        {/* 하단 액션 */}
        <div className="dd-card mt-4" style={{ padding: 22 }}>
          <p className="fw-bold mb-3" style={{ fontSize: 16, color: "var(--dd-ink)" }}>다음으로 무엇을 할까요?</p>
          <ActionButtons actions={["eligibility", "compare", "apply", "chat"]} policyId={policy.id} onAction={(key) => key === "chat" ? (window.location.href = "/chat") : setModal(key)} />
          <div className="mt-3"><DisclaimerNote /></div>
        </div>
      </main>

      {/* ===== 모달 (페이지와 동일한 내용 컴포넌트 재사용) ===== */}
      <Modal open={!!modal && modal !== "chat"} onClose={() => setModal(null)} title={MODAL_META[modal]?.title} icon={MODAL_META[modal]?.icon}>
        {modal === "eligibility" && <EligibilityResult policyId={policy.id} onAction={(k) => setModal(k)} />}
        {modal === "compare" && <PolicyCompare initialA={policy.id} initialB={policy.related[0]} />}
        {modal === "apply" && <ApplyPrep policyId={policy.id} onAction={(k) => setModal(k)} />}
      </Modal>
    </div>
  );
}
