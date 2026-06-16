"use client";

// =========================================================================
// 도담 — 마이페이지 (/mypage)
// 의도: 사용자의 가족 프로필·관심 정책·신청 진행·이력을 한 페이지에서
//       탭 전환(state)으로 모아본다. 별도 라우트 없이 탭만 전환.
// 탭: 가족 프로필 / 관심 정책 / 신청 체크리스트 / 추천 이력 / 상담 이력
// =========================================================================
import { useState } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCard from "@/app/components/PolicyCard";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { getPolicy, getPolicies } from "@/app/data/policies";
import { familyRows, DEFAULT_FAMILY } from "@/app/data/family";

const TABS = [
  { key: "profile", label: "가족 프로필", icon: "User" },
  { key: "liked", label: "관심 정책", icon: "Heart" },
  { key: "checklist", label: "신청 체크리스트", icon: "ListChecks" },
  { key: "recHistory", label: "추천 이력", icon: "Target" },
  { key: "chatHistory", label: "상담 이력", icon: "MessageCircle" },
];

// 더미 저장 데이터
const LIKED_IDS = ["parent-allowance", "first-meet", "care-service"];
const CHECKLIST = [
  { id: "parent-allowance", done: 3, total: 4, status: "진행 중" },
  { id: "first-meet", done: 4, total: 4, status: "신청 완료" },
  { id: "postnatal-care", done: 1, total: 4, status: "시작 전" },
];
const REC_HISTORY = [
  { date: "2026.06.10", note: "출산 직후 · 0세 · 맞벌이 기준", count: 5 },
  { date: "2026.05.28", note: "임신 중 · 서울 기준", count: 4 },
];
const CHAT_HISTORY = [
  { date: "2026.06.12", q: "부모급여랑 아동수당 뭐가 달라?", tag: "비교" },
  { date: "2026.06.09", q: "첫만남이용권 신청 준비물", tag: "신청준비" },
  { date: "2026.06.01", q: "어린이집 다녀도 아이돌봄 되나요?", tag: "가능성" },
];

export default function MyPage() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {/* 프로필 헤더 */}
        <div className="d-flex align-items-center gap-3 mb-4">
          <span className="dd-icon-tile dd-tile-rose" style={{ width: 60, height: 60 }}>
            <Icon name="User" size={28} />
          </span>
          <div>
            <h1 className="dd-title" style={{ fontSize: 26 }}>마이페이지</h1>
            <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>저장한 정보와 진행 상황을 한눈에 확인하세요.</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="dd-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={"dd-tab" + (tab === t.key ? " is-active" : "")} onClick={() => setTab(t.key)}>
              <span className="d-inline-flex align-items-center gap-1"><Icon name={t.icon} size={14} /> {t.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {/* 가족 프로필 */}
          {tab === "profile" && (
            <div className="dd-card dd-card-lg" style={{ padding: 24, maxWidth: 640 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <strong style={{ fontSize: 16 }}>저장된 가족 상황</strong>
                <Link href="/recommend" className="dd-btn dd-btn-ghost dd-btn-sm">
                  <Icon name="Pencil" size={15} /> 수정하기
                </Link>
              </div>
              <div className="d-flex flex-column gap-2">
                {familyRows(DEFAULT_FAMILY).map((r) => (
                  <div key={r.label} className="d-flex justify-content-between align-items-start gap-3 py-2" style={{ borderBottom: "1px solid var(--dd-stone-100)", fontSize: 14 }}>
                    <span className="dd-subtle">{r.label}</span>
                    <span className="fw-semibold text-end" style={{ color: "var(--dd-ink-80)" }}>{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3"><DisclaimerNote /></div>
            </div>
          )}

          {/* 관심 정책 */}
          {tab === "liked" && (
            <div className="row g-4">
              {getPolicies(LIKED_IDS).map((p) => (
                <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                  <PolicyCard policy={p} showMeta>
                    <Link href={`/policies/${p.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                      <Icon name="FileText" size={15} /> 상세보기
                    </Link>
                    <Link href={`/policies/${p.id}/apply`} className="dd-btn dd-btn-green dd-btn-sm">
                      <Icon name="HandHeart" size={15} /> 신청 준비
                    </Link>
                  </PolicyCard>
                </div>
              ))}
            </div>
          )}

          {/* 신청 체크리스트 */}
          {tab === "checklist" && (
            <div className="d-flex flex-column gap-3" style={{ maxWidth: 720 }}>
              {CHECKLIST.map((c) => {
                const p = getPolicy(c.id);
                const pct = Math.round((c.done / c.total) * 100);
                const tone = pct === 100 ? "green" : pct === 0 ? "stone" : "coral";
                return (
                  <div key={c.id} className="dd-card" style={{ padding: 18 }}>
                    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                      <div className="d-flex align-items-center gap-3">
                        <span className="dd-icon-tile dd-tile-rose" style={{ width: 42, height: 42 }}>
                          <Icon name={p.icon} size={20} />
                        </span>
                        <div>
                          <strong style={{ fontSize: 15 }}>{p.name}</strong>
                          <div className={"dd-pill dd-pill-" + tone} style={{ marginTop: 2 }}>{c.status}</div>
                        </div>
                      </div>
                      <Link href={`/policies/${c.id}/apply`} className="dd-btn dd-btn-ghost dd-btn-sm">이어서 준비 <Icon name="ArrowRight" size={14} /></Link>
                    </div>
                    <div className="mt-3 d-flex align-items-center gap-3">
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--dd-stone-100)", overflow: "hidden" }}>
                        <div style={{ width: pct + "%", height: "100%", background: "var(--dd-coral-grad)", borderRadius: 999 }} />
                      </div>
                      <span className="fw-semibold" style={{ fontSize: 13, color: "var(--dd-stone-500)" }}>{c.done}/{c.total}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 추천 이력 */}
          {tab === "recHistory" && (
            <div className="d-flex flex-column gap-2" style={{ maxWidth: 720 }}>
              {REC_HISTORY.map((h, i) => (
                <Link key={i} href="/recommend/result" className="dd-card dd-card-hover text-decoration-none d-flex align-items-center justify-content-between gap-3" style={{ padding: 18 }}>
                  <div className="d-flex align-items-center gap-3">
                    <span className="dd-icon-tile dd-tile-rose" style={{ width: 42, height: 42 }}><Icon name="Target" size={20} /></span>
                    <div>
                      <strong style={{ fontSize: 15, color: "var(--dd-ink)" }}>맞춤 추천 {h.count}건</strong>
                      <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>{h.note}</p>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="dd-subtle" style={{ fontSize: 13 }}>{h.date}</span>
                    <Icon name="ChevronRight" size={16} style={{ color: "var(--dd-stone-400)" }} />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* 상담 이력 */}
          {tab === "chatHistory" && (
            <div className="d-flex flex-column gap-2" style={{ maxWidth: 720 }}>
              {CHAT_HISTORY.map((h, i) => (
                <Link key={i} href="/chat" className="dd-card dd-card-hover text-decoration-none d-flex align-items-center justify-content-between gap-3" style={{ padding: 18 }}>
                  <div className="d-flex align-items-center gap-3">
                    <span className="dd-icon-tile dd-tile-blue" style={{ width: 42, height: 42 }}><Icon name="MessageCircle" size={20} /></span>
                    <div>
                      <strong style={{ fontSize: 15, color: "var(--dd-ink)" }}>{h.q}</strong>
                      <div className="dd-pill dd-pill-stone" style={{ marginTop: 4 }}>{h.tag}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="dd-subtle" style={{ fontSize: 13 }}>{h.date}</span>
                    <Icon name="ChevronRight" size={16} style={{ color: "var(--dd-stone-400)" }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
