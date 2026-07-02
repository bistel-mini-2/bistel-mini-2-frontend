"use client";
import Link from "next/link";
import Icon from "@/app/components/Icon";
import PolicyCardChat from "@/app/components/PolicyCardChat";

export default function RecommendChatCard({ policies = [], onAnalyzeEligibility, activePolicyId }) {
  if (policies.length === 0) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {policies.map((policy, index) => {
          const policyId = policy.policy_id || policy.policyId || policy.id || policy.slug || policy.policy_slug;
          return (
            <PolicyCardChat
              key={policyId || index}
              policy={policy}
              onAnalyzeEligibility={onAnalyzeEligibility}
              analyzing={String(activePolicyId || "") === String(policyId || "")}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <Link href="/recommend" className="dd-na-btn dd-na-coral">
          <Icon name="Target" size={15} /> 맞춤 추천 화면으로
        </Link>
        <Link href="/eligibility" className="dd-na-btn dd-na-blue">
          <Icon name="ShieldCheck" size={15} /> 지원 가능성 자세히 분석
        </Link>
      </div>
    </div>
  );
}
