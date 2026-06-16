"use client";

// =========================================================================
// 도담 — 지원 가능성 분석 결과 (내용 컴포넌트)
// /policies/[id]/eligibility 페이지와 상세 모달이 함께 사용한다.
// 결과 배너 + 분석 표(충족/추가확인 배지) + 입력 요약 + 다시 분석하기 +
// 하단 액션(비교/신청준비) + 면책 문구.
// =========================================================================
import { useState } from "react";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import ActionButtons from "@/app/components/ActionButtons";
import { getPolicy, ELIGIBILITY_LEVELS } from "@/app/data/policies";
import { DEFAULT_FAMILY, familyRows } from "@/app/data/family";

const STATUS_META = {
  ok: { label: "충족", pill: "dd-pill-green", icon: "Check" },
  check: { label: "추가 확인", pill: "dd-pill-amber", icon: "CircleAlert" },
  no: { label: "미충족", pill: "dd-pill-coral", icon: "X" },
};

export default function EligibilityResult({ policyId, family = DEFAULT_FAMILY, onAction }) {
  const policy = getPolicy(policyId);
  const [analyzing, setAnalyzing] = useState(false);

  if (!policy) return <p className="dd-subtle">정책 정보를 찾을 수 없어요.</p>;

  const elig = policy.eligibility;
  const level = ELIGIBILITY_LEVELS[elig.level];

  const reanalyze = () => {
    setAnalyzing(true);
    setTimeout(() => setAnalyzing(false), 700);
  };

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
            {policy.name} · {level.label}
          </p>
          <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>
            {elig.summary} {level.desc}
          </p>
        </div>
      </div>

      {/* 분석 결과 표 */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <div className="px-3 py-3 d-flex align-items-center justify-content-between" style={{ borderBottom: "1px solid var(--dd-stone-100)" }}>
          <strong style={{ fontSize: 15 }}>조건별 분석 결과</strong>
          <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={reanalyze} disabled={analyzing}>
            <Icon name="Wand2" size={15} />
            {analyzing ? "분석 중…" : "다시 분석하기"}
          </button>
        </div>
        <table className="dd-table">
          <tbody>
            {elig.criteria.map((c) => {
              const sm = STATUS_META[c.status] || STATUS_META.check;
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
      </div>

      {/* 입력 정보 요약 */}
      <div className="dd-card-soft" style={{ padding: 18 }}>
        <div className="d-flex align-items-center gap-2 mb-2">
          <Icon name="ClipboardList" size={16} style={{ color: "var(--dd-coral)" }} />
          <strong style={{ fontSize: 14 }}>분석에 사용한 입력 정보</strong>
        </div>
        <div className="d-flex flex-wrap gap-2">
          {familyRows(family).map((r) => (
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
        <ActionButtons actions={["compare", "apply"]} policyId={policy.id} onAction={onAction} />
      </div>

      <DisclaimerNote />
    </div>
  );
}
