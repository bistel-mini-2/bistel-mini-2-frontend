"use client";

import Link from "next/link";
import Icon from "@/app/components/Icon";
import {
  getAiStatusPillClass,
  getUserStatusUi,
  isUserStatus,
} from "@/app/types/aiStatus";

const getPolicyId = (policy) =>
  policy?.policy_id || policy?.policyId || policy?.id || policy?.backend_slug || policy?.backendSlug || policy?.slug;

const getPolicySlug = (policy) =>
  policy?.slug || policy?.policy_slug || policy?.policySlug || policy?.policy_id || policy?.policyId || policy?.id;

const getPolicyName = (policy) =>
  policy?.policy_name || policy?.policyName || policy?.name || "정책";

export default function PolicyCardChat({
  policy,
  onAnalyzeEligibility,
  onAskSimilar,
  analyzing = false,
}) {
  if (!policy) return null;

  const policyId = getPolicyId(policy);
  const slug = getPolicySlug(policy);
  const policyName = getPolicyName(policy);
  const detailHref = slug ? `/policies/${slug}` : "/policies";
  const tag = policy.tag || policy.reason_summary || policy.reasonSummary || policy.summary || null;
  const userStatus = policy.user_status || policy.userStatus;
  const statusUi = isUserStatus(userStatus) ? getUserStatusUi(userStatus) : null;

  return (
    <div className="dd-policy-card-chat">
      <span className="dd-policy-card-chat-main">
        <span className="dd-policy-card-chat-icon">
          <Icon name={policy.icon || "Wallet"} size={20} />
        </span>
        <span className="dd-policy-card-chat-copy">
          <span className="dd-policy-card-chat-name">{policyName}</span>
          {tag && (
            <span className="dd-policy-card-chat-tag">
              {tag}
            </span>
          )}
          {statusUi && (
            <span className={`dd-pill ${getAiStatusPillClass(statusUi.variant)} dd-policy-card-chat-status`}>
              {statusUi.label}
            </span>
          )}
        </span>
      </span>
      <span className="dd-policy-card-chat-actions">
        {policyId && onAnalyzeEligibility && (
          <button
            type="button"
            className="dd-policy-card-chat-btn dd-policy-card-chat-analyze"
            onClick={() => onAnalyzeEligibility(policy)}
            disabled={analyzing}
          >
            <Icon name="ShieldCheck" size={13} />
            지원가능성 분석
          </button>
        )}
        {slug && onAskSimilar && (
          <button
            type="button"
            className="dd-policy-card-chat-btn"
            onClick={() => onAskSimilar(policy)}
          >
            <Icon name="Sparkles" size={13} />
            유사 정책
          </button>
        )}
        <Link href={detailHref} className="dd-policy-card-chat-btn">
          상세보기 <Icon name="ArrowRight" size={13} />
        </Link>
      </span>
    </div>
  );
}
