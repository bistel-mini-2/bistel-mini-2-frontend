// =========================================================================
// 도담 — 인증 화면 공용 셸 (로그인/회원가입)
// 로고 전용 상단바 + 좌측 브랜드 패널(데스크톱) + 우측 카드 슬롯.
// =========================================================================
import Link from "next/link";
import Icon from "@/app/components/Icon";

const POINTS = [
  { icon: "Target", text: "우리 가족 상황에 맞는 정책만 골라드려요" },
  { icon: "ShieldCheck", text: "지원 가능성을 미리 가늠해볼 수 있어요" },
  { icon: "Bookmark", text: "관심 정책과 신청 진행을 한곳에 저장해요" },
];

export default function AuthShell({ aside, children, wide = false }) {
  return (
    <div className="dd-auth-page">
      {/* 상단 로고 */}
      <div className="dd-auth-top">
        <div className="dd-shell">
          <Link href="/" className="dd-logo" aria-label="도담 홈">
            <span className="dd-logo-mark"><Icon name="Baby" size={20} strokeWidth={2.2} /></span>
            <span className="dd-logo-text">
              <span className="dd-logo-name">도담</span>
              <span className="dd-logo-sub">가족·육아 복지 도우미</span>
            </span>
          </Link>
        </div>
      </div>

      <div className="dd-auth-body">
        {/* 브랜드 패널 */}
        <aside className="dd-auth-aside">
          <div className="dd-blob" style={{ width: 240, height: 240, left: -60, bottom: -40, background: "var(--dd-coral-200)" }} />
          <div style={{ position: "relative", maxWidth: 420 }}>
            <span className="dd-pill dd-pill-outline">
              <Icon name="Sparkles" size={15} /> AI 복지 추천 서비스
            </span>
            <h2 className="dd-title mt-3" style={{ fontSize: 32, lineHeight: 1.3 }}>
              {aside?.title || (
                <>복잡한 복지정책,<br />도담이 쉽게 안내해드려요</>
              )}
            </h2>
            <div className="mt-4 d-flex flex-column gap-3">
              {POINTS.map((p) => (
                <div key={p.text} className="d-flex align-items-center gap-3">
                  <span className="dd-icon-tile" style={{ width: 42, height: 42 }}>
                    <Icon name={p.icon} size={20} />
                  </span>
                  <span style={{ fontSize: 15, color: "var(--dd-stone-600)", fontWeight: 500 }}>{p.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 카드 영역 */}
        <main className="dd-auth-main">
          <div className={"dd-auth-card" + (wide ? " dd-auth-card-wide" : "")}>{children}</div>
        </main>
      </div>
    </div>
  );
}
