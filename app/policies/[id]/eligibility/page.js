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

export default function EligibilityPage() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const policy = getPolicy(id);
  const requestId = searchParams.get("requestId");

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell dd-shell-narrow" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <Link href={`/policies/${id}`} className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> {policy ? policy.name : "정책"} 상세로
        </Link>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="dd-icon-tile dd-tile-blue" style={{ width: 46, height: 46 }}>
            <Icon name="ShieldCheck" size={22} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 26 }}>지원 가능성 분석</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>입력하신 가족 상황을 기준으로 분석한 결과예요.</p>
          </div>
        </div>
        {requestId && (
          <p className="dd-disclaimer mb-3">
            <Icon name="Clock3" size={13} /> 분석 요청 #{requestId}
          </p>
        )}
        <EligibilityResult policyId={id} requestId={requestId} />
      </main>
    </div>
  );
}
