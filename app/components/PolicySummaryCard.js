// 도담 — 채팅 답변용 정책 요약 카드 (배지/버튼 제거 버전)
// 정책 상세페이지(policies/[id])의 핵심 정보를 채팅 버블 안에 카드로 요약해 보여줍니다.
//
// 사용법:
//   import PolicySummaryCard from "@/app/components/PolicySummaryCard";
//   <PolicySummaryCard policy={policy} summaryCard={summaryCard} />
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
//     caution?: string                       // 유의사항
//   }
//
// summaryCard 객체 구조 (AI 응답 기준, 선택):
//   {
//     summary?: string                       // AI 생성 요약문
//     key_conditions / keyConditions?: string[] // 핵심 조건
//   }

"use client";

import Icon from "@/app/components/Icon";

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

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <div
      style={{
        background: "var(--dd-stone-50, #f8f7f5)",
        border: "1px solid var(--dd-stone-100, #ede9e4)",
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--dd-coral)", display: "inline-flex" }}>
          <Icon name={icon} size={13} />
        </span>
        <span style={{ color: "var(--dd-stone-400)", fontSize: 12, fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <span style={{ color: "var(--dd-stone-700)", fontSize: 13, fontWeight: 700, lineHeight: 1.5, whiteSpace: "pre-line" }}>
        {value}
      </span>
    </div>
  );
}

export default function PolicySummaryCard({ policy, summaryCard }) {
  if (!policy) return null;

  const name = getPolicyName(policy);
  const tag = getPolicyTag(policy);
  const icon = getPolicyIcon(policy);
  const status = getPolicyStatus(policy);
  const target = getPolicyTarget(policy) || summaryCard?.target || null;
  const benefit = getPolicyBenefit(policy) || summaryCard?.benefit || null;
  const apply = getPolicyApply(policy) || summaryCard?.apply || null;
  const caution = getPolicyCaution(policy) || summaryCard?.caution || null;
  const summaryText = getSummaryText(summaryCard, policy);
  const keyConditions = getKeyConditions(summaryCard);

  const infoRows = [
    { icon: "Baby", label: "지원 대상", value: target },
    { icon: "Coins", label: "지원 혜택", value: benefit },
    { icon: "ClipboardCheck", label: "신청 방법", value: apply },
  ].filter((row) => row.value);

  return (
    <div className="dd-apply-card-chat" style={{ marginTop: 14 }}>
      <div className="dd-apply-card-chat-head">
        <span className="dd-apply-card-chat-tile">
          <Icon name={icon} size={20} />
        </span>
        <span className="dd-apply-card-chat-title-wrap">
          <span className="dd-apply-card-chat-title">{name}</span>
          <span className="dd-pill dd-pill-green" style={{ fontSize: 11, padding: "3px 9px" }}>
            <Icon name="Check" size={11} /> {status}
          </span>
        </span>
      </div>

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

      {keyConditions.length > 0 && (
        <ul className="dd-summary-list" style={{ margin: 0 }}>
          {keyConditions.map((condition, index) => (
            <li key={index}>{condition}</li>
          ))}
        </ul>
      )}

      {infoRows.length > 0 && (
        <div className="dd-apply-card-chat-rows">
          {infoRows.map((row) => (
            <InfoRow key={row.label} {...row} />
          ))}
        </div>
      )}

      {caution && (
        <p className="dd-apply-card-chat-caution">
          <Icon name="CircleAlert" size={13} />
          <span>{caution}</span>
        </p>
      )}
    </div>
  );
}
