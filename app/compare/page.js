"use client";

// =========================================================================
// 도담 — 정책 비교 (페이지) /compare
// 상세 모달과 동일한 PolicyCompare 내용 컴포넌트를 일반 라우트로 렌더.
// ?a=&b= 쿼리로 초기 정책을 받을 수 있어 비교 바구니에서 딥링크 가능.
// =========================================================================
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCompare from "@/app/components/PolicyCompare";

function CompareInner() {
  const sp = useSearchParams();
  const a = sp.get("a") || "parent-allowance";
  const b = sp.get("b") || "child-allowance";

  return (
    <main className="dd-shell" style={{ paddingTop: 24, paddingBottom: 64 }}>
      <div className="d-flex align-items-center gap-2 mb-4">
        <span className="dd-icon-tile dd-tile-amber" style={{ width: 46, height: 46 }}>
          <Icon name="GitCompare" size={22} />
        </span>
        <div>
          <h1 className="dd-title" style={{ fontSize: 26 }}>정책 비교</h1>
          <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>두 정책을 나란히 두고 우리 가족에게 더 맞는 쪽을 찾아보세요.</p>
        </div>
      </div>
      <PolicyCompare initialA={a} initialB={b} />
    </main>
  );
}

export default function ComparePage() {
  return (
    <div className="dd-page">
      <Header />
      <Suspense fallback={<div className="dd-shell" style={{ paddingTop: 40 }}><p className="dd-subtle">불러오는 중…</p></div>}>
        <CompareInner />
      </Suspense>
    </div>
  );
}
