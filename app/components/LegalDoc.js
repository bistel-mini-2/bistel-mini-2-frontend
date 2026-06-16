"use client";

// =========================================================================
// 도담 — 약관/정책 문서 공용 레이아웃
// 제목 + 최종 개정일 + 목차(앵커) + 조항 카드. terms/privacy 가 함께 사용.
// sections: [{ id, title, body(ReactNode) }]
// =========================================================================
import Link from "next/link";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";

export default function LegalDoc({ title, updated, intro, sections = [] }) {
  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 28, paddingBottom: 64 }}>
        <Link href="/signup" className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> 회원가입으로
        </Link>

        {/* 제목 */}
        <div className="d-flex align-items-start gap-3">
          <span className="dd-icon-tile dd-tile-rose" style={{ width: 52, height: 52 }}>
            <Icon name="FileText" size={26} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 28 }}>{title}</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>최종 개정일 {updated} · 데모용 샘플 문서</p>
          </div>
        </div>

        {intro && (
          <div className="dd-card-soft mt-4" style={{ padding: 18, border: "1px solid var(--dd-coral-100)" }}>
            <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>{intro}</p>
          </div>
        )}

        <div className="row g-4 mt-1">
          {/* 목차 */}
          <div className="col-12 col-lg-3 order-lg-2">
            <nav className="dd-card" style={{ padding: 16, position: "sticky", top: 84 }} aria-label="목차">
              <p className="fw-bold mb-2" style={{ fontSize: 13, color: "var(--dd-stone-500)" }}>목차</p>
              <ul className="list-unstyled d-flex flex-column gap-1 mb-0">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={"#" + s.id} className="text-decoration-none d-block" style={{ fontSize: 13, color: "var(--dd-stone-600)", padding: "4px 0" }}>
                      {i + 1}. {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* 본문 */}
          <div className="col-12 col-lg-9 order-lg-1">
            <div className="d-flex flex-column gap-3">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="dd-card" style={{ padding: 24, scrollMarginTop: 80 }}>
                  <h2 className="fw-bold" style={{ fontSize: 17, color: "var(--dd-ink)" }}>
                    제{i + 1}조 ({s.title})
                  </h2>
                  <div className="mt-2" style={{ fontSize: 14.5, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            <p className="dd-disclaimer mt-4">
              <Icon name="ShieldCheck" size={13} /> 본 문서는 도담 데모 서비스용 샘플이며, 실제 법적 효력을 갖지 않습니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
