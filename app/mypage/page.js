"use client";

// =========================================================================
// 도담 — 마이페이지 (/mypage)
// 의도: 사용자의 가족 프로필·관심 정책·신청 진행·이력을 한 페이지에서
//       탭 전환(state)으로 모아본다. 별도 라우트 없이 탭만 전환.
// 탭: 가족 프로필 / 관심 정책 / 신청 체크리스트 / 추천 이력 / 비교 이력 / 상담 이력
// 저장 리스트(관심·추천·비교·상담)는 개별 삭제 + 전체 삭제를 지원한다.
// =========================================================================
import { startTransition, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCard from "@/app/components/PolicyCard";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { AuthContext } from "@/contexts/AuthContext";
import familyProfileApi from "@/apis/familyProfileApi";
import { getPolicy, getPolicies } from "@/app/data/policies";
import {
  DEFAULT_FAMILY,
  FAMILY_OPTIONS,
  createFamilyProfilePayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";
import { useLiked } from "@/app/data/useLiked";

const TABS = [
  { key: "profile", label: "가족 프로필", icon: "User" },
  { key: "liked", label: "관심 정책", icon: "Heart" },
  { key: "checklist", label: "신청 체크리스트", icon: "ListChecks" },
  { key: "recHistory", label: "추천 이력", icon: "Target" },
  { key: "compare", label: "비교 이력", icon: "GitCompare" },
  { key: "chatHistory", label: "상담 이력", icon: "MessageCircle" },
];

// 더미 저장 데이터(초기값) — 실제로는 API/스토리지에서 로드
const CHECKLIST = [
  { id: "parent-allowance", done: 3, total: 4, status: "진행 중" },
  { id: "first-meet", done: 4, total: 4, status: "신청 완료" },
  { id: "postnatal-care", done: 1, total: 4, status: "시작 전" },
];
const INIT_REC = [
  { id: 1, date: "2026.06.10", note: "출산 직후 · 0세 · 맞벌이 기준", count: 5 },
  { id: 2, date: "2026.05.28", note: "임신 중 · 서울 기준", count: 4 },
];
// 비교 이력 — 비교한 두 정책(a, b) + 비교 날짜 + 한 줄 메모/태그
const INIT_COMPARE = [
  { id: 1, a: "parent-allowance", b: "child-allowance", date: "2026.06.14", note: "매달 현금으로 받는 두 지원 비교", tag: "양육비·수당" },
  { id: 2, a: "first-meet", b: "postnatal-care", date: "2026.06.07", note: "출산 직후 챙겨야 할 바우처", tag: "바우처" },
  { id: 3, a: "care-service", b: "parent-allowance", date: "2026.05.30", note: "복직 전 돌봄 공백 어떻게 메울까", tag: "돌봄" },
];
const INIT_CHAT = [
  { id: 1, date: "2026.06.12", q: "부모급여랑 아동수당 뭐가 달라?", tag: "비교" },
  { id: 2, date: "2026.06.09", q: "첫만남이용권 신청 준비물", tag: "신청준비" },
  { id: 3, date: "2026.06.01", q: "어린이집 다녀도 아이돌봄 되나요?", tag: "가능성" },
];

const tileTone = (t) => (t === "coral" ? "rose" : t);

// 리스트 상단 — 건수 + 전체 삭제
function ListHeader({ text, onClear, label = "전체 삭제" }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <span className="dd-subtle" style={{ fontSize: 14 }}>{text}</span>
      <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={onClear}>
        <Icon name="Trash2" size={16} /> {label}
      </button>
    </div>
  );
}

// 개별 삭제 버튼
function DelBtn({ onClick, style }) {
  return (
    <button type="button" className="dd-del-btn" onClick={onClick} aria-label="삭제" style={style}>
      <Icon name="Trash2" size={16} />
    </button>
  );
}

// 빈 상태
function EmptyState({ icon, tile = "rose", title, desc, href, cta, ctaIcon, maxWidth = 560 }) {
  return (
    <div className="dd-card-soft text-center" style={{ padding: "44px 24px", maxWidth }}>
      <span className={"dd-icon-tile dd-tile-" + tile + " mx-auto mb-3"} style={{ width: 56, height: 56 }}>
        <Icon name={icon} size={26} />
      </span>
      <strong className="d-block mb-2" style={{ fontSize: 17 }}>{title}</strong>
      <p className="dd-subtle mb-3" style={{ fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
      <Link href={href} className="dd-btn dd-btn-coral">
        {ctaIcon && <Icon name={ctaIcon} size={16} />} {cta}
      </Link>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  const [tab, setTab] = useState("profile");
  const [familyProfile, setFamilyProfile] = useState(DEFAULT_FAMILY);
  const [familyDraft, setFamilyDraft] = useState(DEFAULT_FAMILY);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [familySaved, setFamilySaved] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [isSavingFamily, setIsSavingFamily] = useState(false);
  const { ids: likedIds, remove: removeLiked, clear: clearLiked } = useLiked();
  const [recs, setRecs] = useState(INIT_REC);
  const [compares, setCompares] = useState(INIT_COMPARE);
  const [chats, setChats] = useState(INIT_CHAT);

  const liked = getPolicies(likedIds);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    const loadFamilyProfile = async () => {
      try {
        const nextFamily = await familyProfileApi.getMe();
        if (ignore || !nextFamily) {
          return;
        }

        const normalizedFamily = normalizeFamilyProfile(nextFamily);
        startTransition(() => {
          setFamilyProfile(normalizedFamily);
          setFamilyDraft(normalizedFamily);
          setFamilyError("");
        });
      } catch {
        if (!ignore) {
          setFamilyError("가족 프로필을 불러오지 못했어요.");
        }
      }
    };

    loadFamilyProfile();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isLoading]);

  const setFamilyDraftValue = (key, value) => {
    setFamilyDraft((family) => ({ ...family, [key]: value }));
    setFamilySaved(false);
  };

  const toggleFamilyDraftSpecial = (value) => {
    setFamilyDraft((family) => ({
      ...family,
      special: family.special.includes(value)
        ? family.special.filter((item) => item !== value)
        : [...family.special, value],
    }));
    setFamilySaved(false);
  };

  const selectFamilyDraftChildAge = (value) => {
    setFamilyDraft((family) => {
      return {
        ...family,
        childAge: value,
        childrenAges: [value],
      };
    });
    setFamilySaved(false);
  };

  const startFamilyEdit = () => {
    setFamilyDraft(familyProfile);
    setFamilySaved(false);
    setIsEditingFamily(true);
  };

  const cancelFamilyEdit = () => {
    setFamilyDraft(familyProfile);
    setFamilySaved(false);
    setIsEditingFamily(false);
  };

  const saveFamilyProfile = async () => {
    if (isSavingFamily) {
      return;
    }

    const nextFamily = normalizeFamilyProfile(familyDraft);

    setIsSavingFamily(true);
    setFamilySaved(false);
    setFamilyError("");

    try {
      const savedFamily = await familyProfileApi.updateMe(
        createFamilyProfilePayload(nextFamily)
      );
      const normalizedFamily = normalizeFamilyProfile(savedFamily || nextFamily);

      setFamilyProfile(normalizedFamily);
      setFamilyDraft(normalizedFamily);
      setIsEditingFamily(false);
      setFamilySaved(true);
    } catch {
      setFamilyError("가족 상황을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSavingFamily(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
          <div className="dd-card dd-card-lg" style={{ padding: 24, maxWidth: 520 }}>
            <strong style={{ fontSize: 16 }}>
              {isLoading ? "로그인 상태 확인 중..." : "로그인 페이지로 이동 중..."}
            </strong>
          </div>
        </main>
      </div>
    );
  }

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
                {isEditingFamily ? (
                  <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={cancelFamilyEdit}>
                    <Icon name="X" size={15} /> 취소
                  </button>
                ) : (
                  <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={startFamilyEdit}>
                    <Icon name="Pencil" size={15} /> 수정하기
                  </button>
                )}
              </div>
              {isEditingFamily ? (
                <div className="d-flex flex-column gap-3">
                  <div>
                    <label className="dd-label">가족 구성</label>
                    <div className="dd-radio-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                      {FAMILY_OPTIONS.stage.map((o) => (
                        <label key={o.value} className={"dd-choice" + (familyDraft.stage === o.value ? " is-checked" : "")}>
                          <input type="radio" name="mypage-stage" checked={familyDraft.stage === o.value} onChange={() => setFamilyDraftValue("stage", o.value)} />
                          {o.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="dd-label">자녀 연령대 <span className="dd-subtle" style={{ fontWeight: 400 }}>(하나 선택)</span></label>
                    <div className="d-flex flex-wrap gap-2">
                      {FAMILY_OPTIONS.childAge.map((o) => {
                        const on = normalizeFamilyProfile(familyDraft).childAge === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                            onClick={() => selectFamilyDraftChildAge(o.value)}
                            style={{ padding: "9px 14px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                          >
                            {on && <Icon name="Check" size={14} />}
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className="dd-label">가구 소득</label>
                      <select className="dd-select" value={familyDraft.income} onChange={(e) => setFamilyDraftValue("income", e.target.value)}>
                        {FAMILY_OPTIONS.income.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="dd-label">거주 지역</label>
                      <select className="dd-select" value={familyDraft.region} onChange={(e) => setFamilyDraftValue("region", e.target.value)}>
                        {FAMILY_OPTIONS.region.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="dd-label">특수 상황 <span className="dd-subtle" style={{ fontWeight: 400 }}>(해당되는 항목 모두 선택)</span></label>
                    <div className="d-flex flex-wrap gap-2">
                      {FAMILY_OPTIONS.special.map((o) => {
                        const on = familyDraft.special.includes(o.value);
                        return (
                          <button
                            key={o.value}
                            type="button"
                            className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                            onClick={() => toggleFamilyDraftSpecial(o.value)}
                            style={{ padding: "9px 14px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                          >
                            {on && <Icon name="Check" size={14} />}
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="d-flex gap-2 justify-content-end flex-wrap">
                    <button type="button" className="dd-btn dd-btn-ghost" onClick={cancelFamilyEdit} disabled={isSavingFamily}>
                      취소
                    </button>
                    <button type="button" className="dd-btn dd-btn-coral" onClick={saveFamilyProfile} disabled={isSavingFamily}>
                      <Icon name="Check" size={16} /> {isSavingFamily ? "저장 중..." : "저장하기"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {familyRows(familyProfile).map((r) => (
                    <div key={r.label} className="d-flex justify-content-between align-items-start gap-3 py-2" style={{ borderBottom: "1px solid var(--dd-stone-100)", fontSize: 14 }}>
                      <span className="dd-subtle">{r.label}</span>
                      <span className="fw-semibold text-end" style={{ color: "var(--dd-ink-80)" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {familySaved && (
                <p className="dd-disclaimer mt-3 mb-0" style={{ color: "var(--dd-green)" }}>
                  <Icon name="Check" size={13} /> 가족 상황이 저장됐어요.
                </p>
              )}
              {familyError && (
                <p className="dd-disclaimer mt-3 mb-0" style={{ color: "var(--dd-coral)" }}>
                  <Icon name="CircleAlert" size={13} /> {familyError}
                </p>
              )}
              <div className="mt-3"><DisclaimerNote /></div>
            </div>
          )}

          {/* 관심 정책 */}
          {tab === "liked" && (
            liked.length ? (
              <div>
                <ListHeader text={`저장한 정책 ${liked.length}개`} onClear={clearLiked} label="전체 비우기" />
                <div className="row g-4">
                  {liked.map((p) => (
                    <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                      <div className="position-relative h-100">
                        <DelBtn onClick={() => removeLiked(p.id)} style={{ position: "absolute", top: 14, right: 14, zIndex: 2 }} />
                        <PolicyCard policy={p} showMeta>
                          <Link href={`/policies/${p.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                            <Icon name="FileText" size={15} /> 상세보기
                          </Link>
                          <Link href={`/policies/${p.id}/apply`} className="dd-btn dd-btn-green dd-btn-sm">
                            <Icon name="HandHeart" size={15} /> 신청 준비
                          </Link>
                        </PolicyCard>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState icon="Heart" title="관심 정책이 비어 있어요" desc="정책 리스트에서 하트를 눌러 우리 가족에게 맞는 정책을 모아보세요." href="/policies" cta="정책 보러 가기" />
            )
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
            <div style={{ maxWidth: 720 }}>
              {recs.length ? (
                <>
                  <ListHeader text={`추천 받은 기록 ${recs.length}건`} onClear={() => setRecs([])} />
                  <div className="d-flex flex-column gap-2">
                    {recs.map((h) => (
                      <div key={h.id} className="dd-card dd-card-hover d-flex align-items-center justify-content-between gap-3" style={{ padding: 18 }}>
                        <Link href="/recommend/result" className="d-flex align-items-center gap-3 text-decoration-none flex-grow-1">
                          <span className="dd-icon-tile dd-tile-rose" style={{ width: 42, height: 42 }}><Icon name="Target" size={20} /></span>
                          <div>
                            <strong style={{ fontSize: 15, color: "var(--dd-ink)" }}>맞춤 추천 {h.count}건</strong>
                            <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>{h.note}</p>
                          </div>
                        </Link>
                        <div className="d-flex align-items-center gap-2">
                          <span className="dd-subtle" style={{ fontSize: 13 }}>{h.date}</span>
                          <DelBtn onClick={() => setRecs((v) => v.filter((x) => x.id !== h.id))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="Target" title="추천 이력이 없어요" desc="가족 상황을 입력하면 맞춤 정책을 추천해 드려요." href="/recommend" cta="맞춤 추천 받으러 가기" />
              )}
            </div>
          )}

          {/* 비교 이력 */}
          {tab === "compare" && (
            <div style={{ maxWidth: 760 }}>
              {compares.length ? (
                <>
                  <ListHeader text={`비교한 기록 ${compares.length}건`} onClear={() => setCompares([])} />
                  <div className="d-flex flex-column gap-3">
                    {compares.map((c) => {
                      const a = getPolicy(c.a);
                      const b = getPolicy(c.b);
                      if (!a || !b) return null;
                      return (
                        <div key={c.id} className="dd-card" style={{ padding: "18px 20px" }}>
                          <div className="d-flex align-items-start justify-content-between gap-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ flex: 1 }}>
                              <span className="dd-cmp-chip">
                                <span className={"dd-icon-tile dd-tile-" + tileTone(a.tagTone)} style={{ width: 30, height: 30, borderRadius: 999 }}><Icon name={a.icon} size={16} /></span>
                                <span className="fw-semibold" style={{ fontSize: 14 }}>{a.name}</span>
                              </span>
                              <span style={{ color: "var(--dd-amber)" }}><Icon name="GitCompare" size={16} /></span>
                              <span className="dd-cmp-chip">
                                <span className={"dd-icon-tile dd-tile-" + tileTone(b.tagTone)} style={{ width: 30, height: 30, borderRadius: 999 }}><Icon name={b.icon} size={16} /></span>
                                <span className="fw-semibold" style={{ fontSize: 14 }}>{b.name}</span>
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2" style={{ flex: "none" }}>
                              <span className="dd-subtle d-flex align-items-center gap-1" style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                                <Icon name="CalendarDays" size={14} /> {c.date}
                              </span>
                              <DelBtn onClick={() => setCompares((v) => v.filter((x) => x.id !== c.id))} />
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2 mt-3">
                            <span className={"dd-pill dd-pill-" + a.tagTone}>{c.tag}</span>
                            <span style={{ fontSize: 14, color: "var(--dd-stone-600)" }}>{c.note}</span>
                          </div>
                          <hr className="dd-divider my-3" />
                          <div className="d-flex justify-content-end">
                            <Link href={`/compare?a=${c.a}&b=${c.b}`} className="dd-btn dd-btn-amber dd-btn-sm">
                              <Icon name="Repeat" size={15} /> 다시 비교하기
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <EmptyState icon="GitCompare" tile="amber" title="아직 비교한 정책이 없어요" desc="관심 있는 정책 두 개를 나란히 두고 우리 가족에게 더 맞는 쪽을 찾아보세요." href="/compare" cta="정책 비교하러 가기" ctaIcon="GitCompare" />
              )}
            </div>
          )}

          {/* 상담 이력 */}
          {tab === "chatHistory" && (
            <div style={{ maxWidth: 720 }}>
              {chats.length ? (
                <>
                  <ListHeader text={`상담한 기록 ${chats.length}건`} onClear={() => setChats([])} />
                  <div className="d-flex flex-column gap-2">
                    {chats.map((h) => (
                      <div key={h.id} className="dd-card dd-card-hover d-flex align-items-center justify-content-between gap-3" style={{ padding: 18 }}>
                        <Link href="/chat" className="d-flex align-items-center gap-3 text-decoration-none flex-grow-1">
                          <span className="dd-icon-tile dd-tile-blue" style={{ width: 42, height: 42 }}><Icon name="MessageCircle" size={20} /></span>
                          <div>
                            <strong style={{ fontSize: 15, color: "var(--dd-ink)" }}>{h.q}</strong>
                            <div className="dd-pill dd-pill-stone" style={{ marginTop: 4 }}>{h.tag}</div>
                          </div>
                        </Link>
                        <div className="d-flex align-items-center gap-2">
                          <span className="dd-subtle" style={{ fontSize: 13 }}>{h.date}</span>
                          <DelBtn onClick={() => setChats((v) => v.filter((x) => x.id !== h.id))} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState icon="MessageCircle" tile="blue" title="상담 이력이 없어요" desc="챗봇에게 우리 가족 상황을 물어보세요." href="/chat" cta="챗봇 상담하러 가기" />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
