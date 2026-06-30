// 도담 — 채팅 답변용 정책 요약 카드
// 정책 상세페이지(policies/[id])의 핵심 정보를 채팅 버블 안에 카드로 요약해 보여줍니다.
//
// 사용법:
//   import PolicySummaryCard from "@/app/components/PolicySummaryCard";
//   <PolicySummaryCard policy={policy} summaryCard={summaryCard} onAnalyzeEligibility={fn} />
//
// policy 객체 구조 (policies API 기준):
//   {
//     policy_id / policyId / slug: string
//     policy_name / policyName / name: string
//     icon?: string                          // Icon name (e.g. "Wallet")
//     tag?: string                           // 한 줄 설명
//     status?: string                        // 신청 상태 (e.g. "신청 가능")
//     target?: string                        // 지원 대상
//     benefit_amount / benefitAmount?: string // 지원 혜택
//     how_to_apply / howToApply?: string     // 신청 방법
//     region?: string                        // 지역
//     benefit_type / benefitType?: string    // 혜택 유형
//     contact?: string                       // 문의처
//     caution?: string                       // 유의사항
//   }
//
// summaryCard 객체 구조 (AI 응답 기준, 선택):
//   {
//     summary?: string                       // AI 생성 요약문
//     key_conditions / keyConditions?: string[] // 핵심 조건
//   }

"use client";

import Link from "next/link";
import Icon from "@/app/components/Icon";

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

const getPolicySlug = (policy) =>
  policy?.slug ||
  policy?.policy_slug ||
  policy?.policySlug ||
  policy?.policy_id ||
  policy?.policyId ||
  policy?.id;

const getPolicyName = (policy) =>
  policy?.policy_name || policy?.policyName || policy?.name || "정책";

const getPolicyTag = (policy) =>
  policy?.tag || policy?.reason_summary || policy?.reasonSummary || null;

const getPolicyIcon = (policy) => policy?.icon || "Wallet";

const getPolicyStatus = (policy) =>
  policy?.apply_status || policy?.applyStatus || policy?.status || "신청 가능";

const getPolicyTarget = (policy) =>
  policy?.target ||
  policy?.target_summary ||
  policy?.targetSummary ||
  policy?.eligibility_summary ||
  null;

const getPolicyBenefit = (policy) =>
  policy?.benefit_amount ||
  policy?.benefitAmount ||
  policy?.benefit_summary ||
  policy?.benefitSummary ||
  policy?.benefit ||
  null;

const getPolicyApply = (policy) =>
  policy?.how_to_apply ||
  policy?.howToApply ||
  policy?.apply_method ||
  policy?.applyMethod ||
  null;

const getPolicyContact = (policy) =>
  policy?.contact || policy?.inquiry || null;

const getPolicyRegion = (policy) =>
  policy?.region || policy?.area || null;

const getPolicyBenefitType = (policy) =>
  policy?.benefit_type || policy?.benefitType || policy?.type || null;

const getPolicyCaution = (policy) =>
  policy?.caution || policy?.notice || policy?.notes || null;

const getSummaryText = (summaryCard, policy) =>
  summaryCard?.summary ||
  summaryCard?.reason_summary ||
  summaryCard?.reasonSummary ||
  getPolicyTag(policy) ||
  null;

const getKeyConditions = (summaryCard) => {
  const list =
    summaryCard?.key_conditions ||
    summaryCard?.keyConditions ||
    summaryCard?.conditions ||
    [];
  return Array.isArray(list) ? list.slice(0, 3) : [];
};

// ─── 하위 컴포넌트 ────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: "var(--dd-coral)", marginTop: 1, flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </span>
      <span
        style={{
          color: "var(--dd-stone-500)",
          fontWeight: 600,
          flexShrink: 0,
          width: 56,
          fontSize: 13,
        }}
      >
        {label}
      </span>
      <span
        style={{ color: "var(--dd-stone-600)", lineHeight: 1.55, fontSize: 13 }}
      >
        {value}
      </span>
    </div>
  );
}

function MetaChip({ icon, value }) {
  if (!value) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "var(--dd-stone-100)",
        color: "var(--dd-stone-500)",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.3,
      }}
    >
      <Icon name={icon} size={12} />
      {value}
    </span>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   policy: object,
 *   summaryCard?: object,
 *   onAnalyzeEligibility?: (policy: object) => void,
 * }} props
 */
export default function PolicySummaryCard({
  policy,
  summaryCard,
  onAnalyzeEligibility,
}) {
  if (!policy) return null;

  const slug = getPolicySlug(policy);
  const name = getPolicyName(policy);
  const tag = getPolicyTag(policy);
  const icon = getPolicyIcon(policy);
  const status = getPolicyStatus(policy);
  const target = getPolicyTarget(policy);
  const benefit = getPolicyBenefit(policy);
  const apply = getPolicyApply(policy);
  const contact = getPolicyContact(policy);
  const region = getPolicyRegion(policy);
  const benefitType = getPolicyBenefitType(policy);
  const caution = getPolicyCaution(policy);
  const summaryText = getSummaryText(summaryCard, policy);
  const keyConditions = getKeyConditions(summaryCard);
  const detailHref = slug ? `/policies/${slug}` : "/policies";

  const infoRows = [
    { icon: "Baby", label: "지원 대상", value: target },
    { icon: "Coins", label: "지원 혜택", value: benefit },
    { icon: "ClipboardCheck", label: "신청 방법", value: apply },
  ].filter((r) => r.value);

  const metaChips = [
    { icon: "MapPin", value: region },
    { icon: "Wallet", value: benefitType },
    { icon: "Phone", value: contact },
  ].filter((c) => c.value);

  return (
    <div className="dd-apply-card-chat" style={{ marginTop: 14 }}>

      {/* ── 헤더: 아이콘 + 정책명 + 상태 배지 ── */}
      <div className="dd-apply-card-chat-head">
        <span className="dd-apply-card-chat-tile">
          <Icon name={icon} size={20} />
        </span>
        <span className="dd-apply-card-chat-title-wrap">
          <span className="dd-apply-card-chat-title">{name}</span>
          <span
            className="dd-pill dd-pill-green"
            style={{ fontSize: 11, padding: "3px 9px" }}
          >
            <Icon name="Check" size={11} /> {status}
          </span>
        </span>
        <span className="dd-apply-card-chat-badge">
          <Icon name="Sparkles" size={11} /> 요약
        </span>
      </div>

      {/* ── 한 줄 태그 ── */}
      {tag && (
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--dd-stone-500)",
            lineHeight: 1.5,
          }}
        >
          {tag}
        </p>
      )}

      {/* ── AI 요약 문장 ── */}
      {summaryText && summaryText !== tag && (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--dd-stone-600)",
            lineHeight: 1.75,
            whiteSpace: "pre-line",
          }}
        >
          {summaryText}
        </p>
      )}

      {/* ── 핵심 조건 리스트 (AI 생성) ── */}
      {keyConditions.length > 0 && (
        <ul className="dd-summary-list" style={{ margin: 0 }}>
          {keyConditions.map((cond, i) => (
            <li key={i}>{cond}</li>
          ))}
        </ul>
      )}

      {/* ── 정보 행: 지원 대상 / 지원 혜택 / 신청 방법 ── */}
      {infoRows.length > 0 && (
        <div className="dd-apply-card-chat-rows">
          {infoRows.map((row) => (
            <InfoRow key={row.label} {...row} />
          ))}
        </div>
      )}

      {/* ── 메타 칩: 지역 / 혜택 유형 / 문의처 ── */}
      {metaChips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {metaChips.map((chip) => (
            <MetaChip key={chip.value} {...chip} />
          ))}
        </div>
      )}

      {/* ── 유의사항 ── */}
      {caution && (
        <p className="dd-apply-card-chat-caution">
          <Icon name="CircleAlert" size={13} />
          <span>{caution}</span>
        </p>
      )}

      {/* ── 하단 버튼 ── */}
      <div className="dd-apply-card-chat-actions">
        <Link href={detailHref} className="dd-acc-btn dd-acc-coral">
          <Icon name="FileText" size={14} /> 정책 상세보기
        </Link>
        {onAnalyzeEligibility && (
          <button
            type="button"
            className="dd-acc-btn dd-na-blue"
            onClick={() => onAnalyzeEligibility(policy)}
          >
            <Icon name="ShieldCheck" size={14} /> 지원 가능성 분석
          </button>
        )}
      </div>
    </div>
  );
}
