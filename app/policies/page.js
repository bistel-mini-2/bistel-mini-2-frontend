"use client";

// =========================================================================
// 도담 — 정책 리스트/탐색 (/policies)
// 의도: 전체 복지정책을 검색·분야 필터·정렬로 탐색하고, 관심 정책 2개를
//       비교 바구니에 담아 /compare 로 연결한다.
// 구성: 검색창 + 카테고리 칩 필터 + 정렬 셀렉트 · 정책 카드 그리드 ·
//       하단 고정 비교 바.
// =========================================================================
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCard from "@/app/components/PolicyCard";
import { POLICIES, CATEGORIES } from "@/app/data/policies";

const SORTS = [
  { value: "name", label: "이름순" },
  { value: "category", label: "분야순" },
];

export default function PoliciesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState("name");
  const [basket, setBasket] = useState([]);

  const list = useMemo(() => {
    let arr = POLICIES.filter((p) => {
      const matchCat = cat === "all" || p.category === cat;
      const matchQ =
        !query ||
        p.name.includes(query) ||
        p.summary.includes(query) ||
        p.tag.includes(query);
      return matchCat && matchQ;
    });
    arr = [...arr].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "ko") : a.category.localeCompare(b.category)
    );
    return arr;
  }, [query, cat, sort]);

  const toggleBasket = (id) =>
    setBasket((b) => (b.includes(id) ? b.filter((x) => x !== id) : b.length >= 2 ? [b[1], id] : [...b, id]));

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: basket.length ? 110 : 64 }}>
        <h1 className="dd-title" style={{ fontSize: 30 }}>정책 리스트</h1>
        <p className="mt-2" style={{ fontSize: 16, color: "var(--dd-stone-600)" }}>
          육아·출산 관련 복지정책을 한곳에서 찾아보세요. 관심 정책 2개를 담아 비교할 수 있어요.
        </p>

        {/* 검색 + 정렬 */}
        <div className="row g-2 mt-2 align-items-center">
          <div className="col-12 col-sm">
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--dd-stone-400)" }}>
                <Icon name="Search" size={18} />
              </span>
              <input
                className="dd-input"
                style={{ paddingLeft: 44, borderRadius: 999 }}
                placeholder="정책 이름이나 키워드로 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-auto">
            <div className="d-flex align-items-center gap-2">
              <Icon name="SlidersHorizontal" size={16} style={{ color: "var(--dd-stone-400)" }} />
              <select className="dd-select" style={{ width: "auto", borderRadius: 999, padding: "10px 16px" }} value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* 카테고리 칩 */}
        <div className="d-flex flex-wrap gap-2 mt-3">
          {CATEGORIES.map((c) => (
            <button key={c.key} type="button" className={"dd-tab" + (cat === c.key ? " is-active" : "")} onClick={() => setCat(c.key)}>
              {c.label}
            </button>
          ))}
        </div>

        {/* 결과 수 */}
        <p className="mt-3 mb-0 dd-subtle" style={{ fontSize: 14 }}>총 {list.length}개 정책</p>

        {/* 그리드 */}
        <div className="row g-4 mt-0">
          {list.map((p) => {
            const inBasket = basket.includes(p.id);
            return (
              <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                <PolicyCard policy={p} showMeta>
                  <Link href={`/policies/${p.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                    <Icon name="FileText" size={15} /> 상세보기
                  </Link>
                  <button
                    type="button"
                    className={"dd-btn dd-btn-sm " + (inBasket ? "dd-btn-amber" : "dd-btn-ghost")}
                    onClick={() => toggleBasket(p.id)}
                  >
                    <Icon name={inBasket ? "Check" : "GitCompare"} size={15} />
                    {inBasket ? "비교 담음" : "비교 담기"}
                  </button>
                </PolicyCard>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="col-12">
              <div className="dd-card-soft text-center" style={{ padding: 40, color: "var(--dd-stone-500)" }}>
                검색 결과가 없어요. 다른 키워드로 찾아보세요.
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 하단 고정 비교 바 */}
      {basket.length > 0 && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 1040, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--dd-coral-100)", boxShadow: "0 -6px 20px rgba(28,25,23,0.06)" }}>
          <div className="dd-shell d-flex align-items-center justify-content-between gap-3" style={{ paddingTop: 14, paddingBottom: 14 }}>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Icon name="GitCompare" size={18} style={{ color: "var(--dd-amber)" }} />
              <strong style={{ fontSize: 14 }}>비교 바구니</strong>
              {basket.map((id) => {
                const p = POLICIES.find((x) => x.id === id);
                return <span key={id} className="dd-pill dd-pill-amber">{p?.name}</span>;
              })}
              <span className="dd-subtle" style={{ fontSize: 13 }}>{basket.length}/2</span>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" onClick={() => setBasket([])}>비우기</button>
              <button
                type="button"
                className="dd-btn dd-btn-coral dd-btn-sm"
                disabled={basket.length < 2}
                onClick={() => router.push("/compare")}
              >
                선택한 정책 비교하기 <Icon name="ArrowRight" size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
