// =========================================================================
// 도담 — 홈 (/)
// 초안 디자인 그대로: 히어로(듀얼 CTA + 추천 미리보기 카드) → 3스텝 →
// 주요 기능 → 대표 정책 미리보기 → 신뢰·면책 배너 → 푸터.
// 공통 Header/Footer/PolicyCard 재사용. (정적 콘텐츠라 서버 컴포넌트)
// =========================================================================
import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { POLICIES, getRecommended } from "@/app/data/policies";

const STEPS = [
  { icon: "ClipboardList", tone: "rose", title: "가족 상황 입력", desc: "임신·출산·아이 나이·소득 등 몇 가지만 알려주세요. 어려운 용어는 몰라도 괜찮아요." },
  { icon: "Wand2", tone: "amber", title: "AI 맞춤 정책 추천", desc: "수많은 복지정책 중 우리 가족이 받을 수 있는 지원을 골라 알기 쉽게 정리해드려요." },
  { icon: "ClipboardCheck", tone: "green", title: "지원 가능성·신청 준비", desc: "받을 수 있는 가능성과 필요한 서류, 신청 방법까지 차근차근 안내해드려요." },
];

const FEATURES = [
  { icon: "Target", tone: "rose", title: "맞춤 정책 추천", desc: "우리 가족 상황에 딱 맞는 지원을 AI가 골라드려요." },
  { icon: "ShieldCheck", tone: "blue", title: "지원 가능성 분석", desc: "받을 수 있을지 가능성을 미리 가늠해볼 수 있어요." },
  { icon: "GitCompare", tone: "amber", title: "유사 정책 비교", desc: "비슷한 지원을 한눈에 비교해 더 유리한 쪽을 찾아요." },
  { icon: "HandHeart", tone: "green", title: "신청 준비 도우미", desc: "필요한 서류와 절차를 빠짐없이 챙겨드려요." },
];

export default function HomePage() {
  const heroPreview = getRecommended().slice(0, 3);
  const getDetailHref = (policy) =>
    `/policies/${encodeURIComponent(policy.backendSlug || policy.slug || policy.id)}`;

  return (
    <div className="dd-page">
      <Header />

      <main>
        {/* ===== Hero ===== */}
        <section style={{ position: "relative", overflow: "hidden" }}>
          <div className="dd-blob" style={{ width: 280, height: 280, left: -80, top: -90, background: "var(--dd-coral-200)" }} />
          <div className="dd-blob" style={{ width: 280, height: 280, right: -40, top: 40, background: "#fde68a" }} />
          <div className="dd-shell" style={{ position: "relative", paddingTop: 64, paddingBottom: 64 }}>
            <div className="row align-items-center g-5">
              <div className="col-12 col-lg-6 text-center text-lg-start">
                <span className="dd-pill dd-pill-outline">
                  <Icon name="Sparkles" size={15} />
                  AI 복지 추천 서비스
                </span>
                <h1 className="dd-title mt-3" style={{ fontSize: "clamp(30px, 5vw, 46px)", lineHeight: 1.2 }}>
                  내 상황에 맞는 육아·출산 지원,
                  <br />
                  <span className="dd-coral">AI가 찾아드려요</span>
                </h1>
                <p className="mt-3" style={{ fontSize: 17, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
                  복잡한 복지정책, 가족 상황만 입력하면 받을 수 있는 지원을 추천해드립니다.
                  어떤 정책이 있는지 몰라도 괜찮아요.
                </p>
                <div className="mt-4 d-flex flex-column flex-sm-row gap-2 justify-content-center justify-content-lg-start">
                  <Link href="/recommend" className="dd-btn dd-btn-coral dd-btn-lg">
                    내 상황 입력하고 추천받기
                    <Icon name="ArrowRight" size={19} />
                  </Link>
                  <Link href="/chat" className="dd-btn dd-btn-ghost dd-btn-lg">
                    <Icon name="MessageCircle" size={19} />
                    AI에게 바로 물어보기
                  </Link>
                </div>
                <p className="mt-3 d-inline-flex align-items-center gap-2" style={{ fontSize: 14, color: "var(--dd-stone-500)" }}>
                  <Icon name="ShieldCheck" size={15} style={{ color: "var(--dd-green-500)" }} />
                  회원가입 없이 1분이면 시작할 수 있어요.
                </p>
              </div>

              {/* 추천 미리보기 카드 */}
              <div className="col-12 col-lg-6">
                <div
                  style={{
                    maxWidth: 420,
                    margin: "0 auto",
                    borderRadius: 28,
                    padding: 22,
                    background: "linear-gradient(135deg, #ffe0e8, #fff0dd 55%, #e0f2fe)",
                    boxShadow: "0 20px 50px rgba(232,70,111,0.16)",
                  }}
                >
                  <div className="dd-card" style={{ padding: 20 }}>
                    <div className="d-flex align-items-center justify-content-between">
                      <strong style={{ fontSize: 15 }}>우리 가족 맞춤 추천</strong>
                      <span className="dd-pill dd-pill-coral">
                        <Icon name="Sparkles" size={13} /> AI
                      </span>
                    </div>
                    <p className="mt-1 mb-0" style={{ fontSize: 12, color: "var(--dd-stone-400)" }}>
                      생후 8개월 · 외벌이 가정 기준
                    </p>
                    <div className="mt-3 d-flex flex-column gap-2">
                      {heroPreview.map((p) => (
                        <div key={p.id} className="d-flex align-items-center gap-3 dd-card-soft" style={{ padding: 12 }}>
                          <span className="dd-icon-tile" style={{ width: 40, height: 40 }}>
                            <Icon name={p.icon} size={20} />
                          </span>
                          <div className="flex-grow-1 min-w-0">
                            <p className="mb-0 fw-semibold text-truncate" style={{ fontSize: 14 }}>{p.name}</p>
                            <p className="mb-0 text-truncate" style={{ fontSize: 12, color: "var(--dd-stone-500)" }}>{p.summary}</p>
                          </div>
                          <span className="dd-badge-match">
                            <Icon name="Star" size={11} fill="currentColor" />
                            {p.match}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== 3스텝 ===== */}
        <section style={{ background: "#fff" }}>
          <div className="dd-shell" style={{ paddingTop: 64, paddingBottom: 64 }}>
            <div className="text-center">
              <h2 className="dd-title" style={{ fontSize: "clamp(26px,4vw,36px)" }}>이렇게 도와드려요</h2>
              <p className="mt-2" style={{ fontSize: 17, color: "var(--dd-stone-600)" }}>
                딱 3단계면 우리 가족이 받을 수 있는 지원을 찾을 수 있어요.
              </p>
            </div>
            <div className="row g-4 mt-2">
              {STEPS.map((s, i) => (
                <div className="col-12 col-md-4" key={s.title}>
                  <div className="dd-card-soft h-100" style={{ padding: 28, position: "relative" }}>
                    <span style={{ position: "absolute", right: 22, top: 16, fontSize: 48, fontWeight: 800, color: "var(--dd-stone-100)" }}>{i + 1}</span>
                    <span className={"dd-icon-tile dd-tile-" + s.tone} style={{ width: 56, height: 56 }}>
                      <Icon name={s.icon} size={28} />
                    </span>
                    <h3 className="mt-3 fw-bold" style={{ fontSize: 20, color: "var(--dd-ink)" }}>{s.title}</h3>
                    <p className="mt-2 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 주요 기능 ===== */}
        <section style={{ background: "var(--dd-cream)" }}>
          <div className="dd-shell" style={{ paddingTop: 64, paddingBottom: 64 }}>
            <div className="text-center">
              <h2 className="dd-title" style={{ fontSize: "clamp(26px,4vw,36px)" }}>주요 기능</h2>
              <p className="mt-2" style={{ fontSize: 17, color: "var(--dd-stone-600)" }}>추천부터 신청 준비까지, 한 곳에서 끝내세요.</p>
            </div>
            <div className="row g-4 mt-2">
              {FEATURES.map((f) => (
                <div className="col-12 col-sm-6 col-lg-3" key={f.title}>
                  <div className="dd-card dd-card-hover h-100" style={{ padding: 26 }}>
                    <span className={"dd-icon-tile dd-tile-" + f.tone} style={{ width: 54, height: 54 }}>
                      <Icon name={f.icon} size={26} />
                    </span>
                    <h3 className="mt-3 fw-bold" style={{ fontSize: 18, color: "var(--dd-ink)" }}>{f.title}</h3>
                    <p className="mt-2 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 대표 정책 미리보기 ===== */}
        <section style={{ background: "#fff" }}>
          <div className="dd-shell" style={{ paddingTop: 64, paddingBottom: 64 }}>
            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-end justify-content-between gap-3">
              <div>
                <h2 className="dd-title" style={{ fontSize: "clamp(26px,4vw,36px)" }}>대표 정책 미리보기</h2>
                <p className="mt-2 mb-0" style={{ fontSize: 17, color: "var(--dd-stone-600)" }}>많은 가정이 함께 받고 있는 대표 지원이에요.</p>
              </div>
              <Link href="/policies" className="dd-btn dd-btn-ghost dd-btn-sm">
                전체 정책 보기 <Icon name="ArrowRight" size={15} />
              </Link>
            </div>
            <div className="row g-4 mt-2">
              {POLICIES.slice(0, 4).map((p) => (
                <div className="col-12 col-sm-6 col-lg-3" key={p.id}>
                  <Link href={getDetailHref(p)} className="text-decoration-none d-block h-100">
                    <div className="dd-card-soft dd-card-hover h-100 d-flex flex-column" style={{ padding: 22 }}>
                      <span className="dd-icon-tile" style={{ width: 48, height: 48 }}>
                        <Icon name={p.icon} size={24} />
                      </span>
                      <h3 className="mt-3 fw-bold" style={{ fontSize: 17, color: "var(--dd-ink)" }}>{p.name}</h3>
                      <p className="mt-2 flex-grow-1 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>{p.summary}</p>
                      <span className={"dd-pill dd-pill-" + p.tagTone} style={{ marginTop: 14, width: "fit-content" }}>{p.tag}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== 신뢰·면책 배너 ===== */}
        <section style={{ background: "var(--dd-cream)" }}>
          <div className="dd-shell" style={{ paddingTop: 64, paddingBottom: 64 }}>
            <div
              className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3"
              style={{ borderRadius: 24, padding: 32, background: "linear-gradient(135deg, #ffe0e8, #e0f2fe)" }}
            >
              <span className="dd-icon-tile dd-tile-green" style={{ width: 56, height: 56, flex: "none" }}>
                <Icon name="ShieldCheck" size={28} />
              </span>
              <div>
                <p className="mb-1 fw-bold" style={{ fontSize: 19, color: "var(--dd-ink)" }}>안심하고 참고하세요</p>
                <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
                  도담의 추천은 정책 정보를 쉽게 이해하도록 돕기 위한 안내예요.{" "}
                  <span className="fw-semibold" style={{ color: "var(--dd-ink-80)" }}>최종 신청 가능 여부는 공식 기관 확인이 필요합니다.</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
