"use client";

// =========================================================================
// 도담 — 지원 가능성 분석 (페이지) /policies/[id]/eligibility
// 상세 모달과 동일한 EligibilityResult 내용 컴포넌트를 일반 라우트로 렌더해
// 딥링크·새로고침·공유가 가능하게 한다. (모달은 정책 상세에서 호출)
// =========================================================================
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import EligibilityResult from "@/app/components/EligibilityResult";
import { getPolicy } from "@/app/data/policies";

const ENTRY_SOURCE = {
  POLICY_DETAIL: "policy-detail",
  RECOMMENDATION: "recommendation",
};

export default function EligibilityPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const policy = getPolicy(id);
  const requestId = searchParams.get("requestId");
  const source = searchParams.get("source") || "policy-detail";
  const recommendationRequestId = searchParams.get("recommendationRequestId");
  const isRecommendationSource = source === ENTRY_SOURCE.RECOMMENDATION;
  const backHref =
    isRecommendationSource && recommendationRequestId
      ? `/recommend/result?requestId=${encodeURIComponent(recommendationRequestId)}`
      : isRecommendationSource
        ? "/recommend/result"
        : `/policies/${id}`;
  const backLabel = isRecommendationSource
    ? "추천 결과로"
    : `${policy ? policy.name : "정책"} 상세로`;
  const title = "지원 가능성 분석";
  const description = isRecommendationSource
    ? "추천받을 때 입력한 조건으로 이 정책의 지원 가능성을 확인하고 있어요."
    : "입력 조건과 정책 기준을 비교해 확인하고 있어요.";

  return (
    <div className="dd-page">
      <Header activeHref={isRecommendationSource ? "/recommend" : undefined} />
      <main className="dd-shell dd-shell-narrow" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <div className="mb-3">
          <Link
            href={backHref}
            className={`dd-btn dd-btn-sm ${isRecommendationSource ? "dd-btn-coral" : "dd-btn-ghost"}`}
          >
            <Icon name="ArrowLeft" size={15} />
            {backLabel}
          </Link>
        </div>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="dd-icon-tile dd-tile-blue" style={{ width: 46, height: 46 }}>
            <Icon name="ShieldCheck" size={22} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 26 }}>{title}</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>{description}</p>
          </div>
        </div>
        {requestId && !isRecommendationSource && (
          <p className="dd-disclaimer mb-3">
            <Icon name="Clock3" size={13} /> 분석 요청이 진행 중입니다.
          </p>
        )}
        <EligibilityResult
          policyId={id}
          requestId={requestId}
          entrySource={source}
          recommendationRequestId={recommendationRequestId}
        />
      </main>
    </div>
  );
}
