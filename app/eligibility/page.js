"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import EligibilityResult from "@/app/components/EligibilityResult";
import { getPolicy } from "@/app/data/policies";

function EligibilityPageContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get("policyId") || "";
  const requestId = searchParams.get("requestId");
  const source = searchParams.get("source") || "policy-detail";
  const recommendationRequestId = searchParams.get("recommendationRequestId");
  const policy = getPolicy(policyId);
  const backHref =
    source === "recommendation"
      ? `/recommend/result${
          recommendationRequestId ? `?requestId=${recommendationRequestId}` : ""
        }`
      : policyId
        ? `/policies/${policyId}`
        : "/policies";
  const backLabel =
    source === "recommendation" ? "추천 결과로" : `${policy ? policy.name : "정책"} 상세로`;

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell dd-shell-narrow" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <Link
          href={backHref}
          className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3"
          style={{ fontSize: 14 }}
        >
          <Icon name="ArrowLeft" size={15} /> {backLabel}
        </Link>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="dd-icon-tile dd-tile-blue" style={{ width: 46, height: 46 }}>
            <Icon name="ShieldCheck" size={22} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 26 }}>지원 가능성 분석</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
              입력 조건과 정책 기준을 비교해 확인하고 있어요.
            </p>
          </div>
        </div>
        {requestId && (
          <p className="dd-disclaimer mb-3">
            <Icon name="Clock3" size={13} /> 분석 요청 #{requestId}
          </p>
        )}
        {policyId ? (
          <EligibilityResult
            policyId={policyId}
            requestId={requestId}
            entrySource={source}
            recommendationRequestId={recommendationRequestId}
          />
        ) : (
          <p className="dd-subtle">분석할 정책 정보를 찾을 수 없어요.</p>
        )}
      </main>
    </div>
  );
}

export default function EligibilityPage() {
  return (
    <Suspense fallback={null}>
      <EligibilityPageContent />
    </Suspense>
  );
}
