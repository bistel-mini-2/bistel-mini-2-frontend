"use client";

// =========================================================================
// 도담 — 정책 비교 (내용 컴포넌트)
// /compare 페이지와 상세 모달이 함께 사용한다.
// 정책 A/B 선택 → 요약 + 비교표(지원대상/지원내용/신청방법) + 핵심 차이 +
// 상황별 선택 가이드 + 함께 확인하면 좋은 정책.
// =========================================================================
import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon";
import PolicySelect from "@/app/components/PolicySelect";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { getPolicy, getRelated } from "@/app/data/policies";

const ROWS = [
  { key: "target", label: "지원대상" },
  { key: "content", label: "지원내용" },
  { key: "method", label: "신청방법" },
];

function SummaryCard({ p, slot }) {
  return (
    <div className="dd-card h-100" style={{ padding: 18 }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="dd-pill dd-pill-outline">정책 {slot}</span>
        {p && <span className={"dd-pill dd-pill-" + p.tagTone}>{p.tag}</span>}
      </div>
      {p ? (
        <>
          <div className="d-flex align-items-center gap-2">
            <span className="dd-icon-tile dd-tile-rose" style={{ width: 40, height: 40 }}>
              <Icon name={p.icon} size={20} />
            </span>
            <strong style={{ fontSize: 16 }}>{p.name}</strong>
          </div>
          <p className="mt-2 mb-0" style={{ fontSize: 13, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>
            {p.summary}
          </p>
          <div className="mt-2 d-flex align-items-center gap-2" style={{ fontSize: 13, color: "var(--dd-coral)" }}>
            <Icon name="Wallet" size={14} />
            <span className="fw-semibold">{p.amount}</span>
          </div>
        </>
      ) : (
        <p className="dd-subtle mb-0">정책을 선택해 주세요.</p>
      )}
    </div>
  );
}

export default function PolicyCompare({ initialA = "parent-allowance", initialB = "child-allowance" }) {
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);

  const a = getPolicy(aId);
  const b = getPolicy(bId);

  return (
    <div className="d-flex flex-column gap-4">
      {/* 선택 */}
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <PolicySelect label="정책 A" value={aId} onChange={setAId} exclude={[bId]} />
        </div>
        <div className="col-12 col-sm-6">
          <PolicySelect label="정책 B" value={bId} onChange={setBId} exclude={[aId]} />
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="row g-3">
        <div className="col-12 col-sm-6">
          <SummaryCard p={a} slot="A" />
        </div>
        <div className="col-12 col-sm-6">
          <SummaryCard p={b} slot="B" />
        </div>
      </div>

      {/* 비교표 */}
      {a && b && (
        <div className="dd-card" style={{ overflow: "hidden" }}>
          <table className="dd-table">
            <thead>
              <tr>
                <th style={{ width: "22%" }}>항목</th>
                <th style={{ width: "39%", background: "#fff", color: "var(--dd-ink)" }}>{a.name}</th>
                <th style={{ width: "39%", background: "#fff", color: "var(--dd-ink)" }}>{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.key}>
                  <th>{row.label}</th>
                  <td style={{ color: "var(--dd-stone-600)" }}>{a.detail[row.key]}</td>
                  <td style={{ color: "var(--dd-stone-600)" }}>{b.detail[row.key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 핵심 차이 + 선택 가이드 */}
      {a && b && (
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="dd-card-soft h-100" style={{ padding: 18 }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Icon name="GitCompare" size={16} style={{ color: "var(--dd-amber)" }} />
                <strong style={{ fontSize: 15 }}>핵심 차이</strong>
              </div>
              <ul className="mb-0 ps-3" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
                <li><b>{a.name}</b>는 {a.tag} 성격이고, <b>{b.name}</b>는 {b.tag} 성격이에요.</li>
                <li>지원 규모: {a.name} {a.amount} / {b.name} {b.amount}</li>
                <li>두 정책은 함께 받을 수 있는 경우가 많아요(중복 조건 확인 필요).</li>
              </ul>
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="dd-card-soft h-100" style={{ padding: 18 }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <Icon name="Target" size={16} style={{ color: "var(--dd-coral)" }} />
                <strong style={{ fontSize: 15 }}>상황별 선택 가이드</strong>
              </div>
              <ul className="mb-0 ps-3" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
                <li>당장 현금 지원이 급하면 → <b>{a.amount.includes("월") ? a.name : b.name}</b></li>
                <li>조건만 맞으면 둘 다 신청해 함께 받는 걸 권장해요.</li>
                <li>헷갈리면 챗봇에게 우리 가족 상황을 물어보세요.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 함께 확인하면 좋은 정책 */}
      {a && (
        <div>
          <p className="mb-2 fw-semibold" style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>
            함께 확인하면 좋은 정책
          </p>
          <div className="d-flex flex-wrap gap-2">
            {getRelated(a.id)
              .filter((r) => r.id !== bId)
              .map((r) => (
                <Link key={r.id} href={`/policies/${r.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                  <Icon name={r.icon} size={15} />
                  {r.name}
                </Link>
              ))}
          </div>
        </div>
      )}

      <DisclaimerNote />
    </div>
  );
}
