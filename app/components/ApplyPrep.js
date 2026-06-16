"use client";

// =========================================================================
// 도담 — 신청 준비 (내용 컴포넌트)
// /policies/[id]/apply 페이지와 상세/챗봇 모달이 함께 사용한다.
// 신청방법/기간/필요서류/문의처/공식 URL + 신청 전 체크리스트(state) +
// 주의사항 + 관심 저장.
// =========================================================================
import { useState } from "react";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { getPolicy, getChecklist } from "@/app/data/policies";

export default function ApplyPrep({ policyId, onAction }) {
  const policy = getPolicy(policyId);
  const initial = policy ? getChecklist(policyId) : [];
  const [checked, setChecked] = useState({});
  const [saved, setSaved] = useState(false);

  if (!policy) return <p className="dd-subtle">정책 정보를 찾을 수 없어요.</p>;

  const toggle = (id) => setChecked((p) => ({ ...p, [id]: !p[id] }));
  const doneCount = initial.filter((c) => checked[c.id]).length;

  const infoRows = [
    { icon: "ClipboardCheck", label: "신청방법", value: policy.detail.method },
    { icon: "CalendarDays", label: "신청기간", value: policy.detail.periodText },
    { icon: "Phone", label: "문의처", value: policy.contact },
  ];

  return (
    <div className="d-flex flex-column gap-4">
      {/* 헤더 요약 */}
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div className="d-flex align-items-center gap-2">
          <span className="dd-icon-tile dd-tile-rose" style={{ width: 44, height: 44 }}>
            <Icon name={policy.icon} size={22} />
          </span>
          <div>
            <strong style={{ fontSize: 17 }}>{policy.name}</strong>
            <div className={"dd-pill dd-pill-" + policy.tagTone} style={{ marginTop: 2 }}>
              {policy.tag}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={"dd-btn dd-btn-sm " + (saved ? "dd-btn-coral" : "dd-btn-ghost")}
          onClick={() => setSaved((v) => !v)}
        >
          <Icon name={saved ? "Heart" : "Heart"} size={15} fill={saved ? "currentColor" : "none"} />
          {saved ? "관심 저장됨" : "관심 저장"}
        </button>
      </div>

      {/* 신청 정보 */}
      <div className="dd-card" style={{ overflow: "hidden" }}>
        <table className="dd-table">
          <tbody>
            {infoRows.map((r) => (
              <tr key={r.label}>
                <th>
                  <span className="d-inline-flex align-items-center gap-2">
                    <Icon name={r.icon} size={15} style={{ color: "var(--dd-coral)" }} />
                    {r.label}
                  </span>
                </th>
                <td style={{ color: "var(--dd-stone-600)" }}>{r.value}</td>
              </tr>
            ))}
            <tr>
              <th>
                <span className="d-inline-flex align-items-center gap-2">
                  <Icon name="ExternalLink" size={15} style={{ color: "var(--dd-coral)" }} />
                  공식 사이트
                </span>
              </th>
              <td>
                <a href={policy.url} target="_blank" rel="noreferrer" className="dd-link">
                  {policy.url}
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 신청 전 체크리스트 */}
      <div>
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <Icon name="ListChecks" size={16} style={{ color: "var(--dd-coral)" }} />
            <strong style={{ fontSize: 15 }}>신청 전 체크리스트</strong>
          </div>
          <span className="dd-pill dd-pill-coral">
            {doneCount}/{initial.length} 완료
          </span>
        </div>
        <div className="d-flex flex-column gap-2">
          {initial.map((c) => {
            const on = !!checked[c.id];
            return (
              <label key={c.id} className={"dd-choice" + (on ? " is-checked" : "")}>
                <input type="checkbox" checked={on} onChange={() => toggle(c.id)} />
                <span style={{ textDecoration: on ? "line-through" : "none" }}>{c.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 주의사항 */}
      <div className="dd-result-banner dd-result-mid" style={{ alignItems: "flex-start" }}>
        <span className="dd-icon-tile dd-tile-amber" style={{ width: 44, height: 44, flex: "none" }}>
          <Icon name="CircleAlert" size={22} />
        </span>
        <div>
          <p className="mb-1 fw-bold" style={{ fontSize: 15 }}>신청 전 주의사항</p>
          <ul className="mb-0 ps-3" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
            {policy.detail.cautions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      </div>

      {onAction && (
        <button type="button" className="dd-btn dd-btn-blue dd-btn-block" onClick={() => onAction("eligibility")}>
          <Icon name="ShieldCheck" size={17} />
          먼저 지원 가능성 확인하기
        </button>
      )}

      <DisclaimerNote />
    </div>
  );
}
