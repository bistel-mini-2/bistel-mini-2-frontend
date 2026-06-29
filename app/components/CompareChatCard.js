"use client";
import Link from "next/link";
import Icon from "@/app/components/Icon";

const TILE_STYLES = [
  { bg: "var(--dd-coral-50)", color: "var(--dd-coral)" },
  { bg: "var(--dd-amber-50)", color: "var(--dd-amber)" },
];

export default function CompareChatCard({ policies = [] }) {
  const pair = policies.slice(0, 2);
  if (pair.length === 0) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div className="dd-compare">
        {pair.map((policy, i) => {
          const slug = policy.slug || policy.policy_slug || policy.policy_id;
          const tile = TILE_STYLES[i] || TILE_STYLES[0];
          return [
            i > 0 ? <div key="vs" className="dd-vs">VS</div> : null,
            <div key={slug || i} className="dd-col">
              <div className="dd-col-head">
                <span className="dd-col-tile" style={{ background: tile.bg, color: tile.color }}>
                  <Icon name="Wallet" size={17} />
                </span>
                <span className="dd-col-name">{policy.policy_name || policy.policyName || "정책"}</span>
              </div>
              {policy.summary && <span className="dd-col-line">{policy.summary}</span>}
            </div>,
          ];
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <Link href="/compare" className="dd-na-btn dd-na-coral">
          <Icon name="GitCompare" size={15} /> 정책 비교 화면으로
        </Link>
        <Link href="/eligibility" className="dd-na-btn dd-na-blue">
          <Icon name="ShieldCheck" size={15} /> 지원 가능성 확인
        </Link>
      </div>
    </div>
  );
}
