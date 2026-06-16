"use client";

// =========================================================================
// 도담 — 신청 준비 (페이지) /policies/[id]/apply
// 상세/챗봇 모달과 동일한 ApplyPrep 내용 컴포넌트를 일반 라우트로 렌더.
// =========================================================================
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import ApplyPrep from "@/app/components/ApplyPrep";
import { getPolicy } from "@/app/data/policies";

export default function ApplyPage() {
  const { id } = useParams();
  const policy = getPolicy(id);

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell dd-shell-narrow" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <Link href={`/policies/${id}`} className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> {policy ? policy.name : "정책"} 상세로
        </Link>
        <div className="d-flex align-items-center gap-2 mb-4">
          <span className="dd-icon-tile dd-tile-green" style={{ width: 46, height: 46 }}>
            <Icon name="HandHeart" size={22} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 26 }}>신청 준비 체크리스트</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>신청 전에 필요한 것들을 차근차근 챙겨보세요.</p>
          </div>
        </div>
        <ApplyPrep policyId={id} />
      </main>
    </div>
  );
}
