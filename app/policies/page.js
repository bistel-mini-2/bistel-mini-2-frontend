"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCard from "@/app/components/PolicyCard";
import { FAMILY_OPTIONS } from "@/app/data/family";
import { useLiked } from "@/app/data/useLiked";
import policyApi from "@/apis/policyApi";

const PAGE_SIZE = 12;

const CATEGORIES = [
  "임신·출산",
  "보육",
  "보호·돌봄",
  "생활지원",
  "신체건강",
  "정신건강",
  "교육",
  "주거",
  "서민금융",
  "법률",
  "입양·위탁",
  "문화·여가",
  "고용",
];

const REGIONS = [
  { value: "", label: "전체 지역" },
  { value: "national", label: "전국" },
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "incheon", label: "인천" },
  { value: "busan", label: "부산" },
  { value: "daegu", label: "대구" },
  { value: "gwangju", label: "광주" },
  { value: "daejeon", label: "대전" },
  { value: "ulsan", label: "울산" },
  { value: "sejong", label: "세종" },
  { value: "gangwon", label: "강원" },
  { value: "chungbuk", label: "충북" },
  { value: "chungnam", label: "충남" },
  { value: "jeonbuk", label: "전북" },
  { value: "jeonnam", label: "전남" },
  { value: "gyeongbuk", label: "경북" },
  { value: "gyeongnam", label: "경남" },
  { value: "jeju", label: "제주" },
];

const SORTS = [
  { value: "updated_at", label: "최근 갱신순" },
  { value: "name", label: "이름순" },
  { value: "category", label: "분야순" },
];

const STAGES = [
  { value: "", label: "전체 대상" },
  ...FAMILY_OPTIONS.stage,
];

const CATEGORY_ICONS = {
  "임신·출산": "Baby",
  보육: "Baby",
  "보호·돌봄": "HandHeart",
  생활지원: "Wallet",
  신체건강: "Stethoscope",
  정신건강: "Heart",
  교육: "FileText",
  주거: "Building2",
};

const TONES = ["coral", "green", "blue", "amber"];

function toPolicyCard(item) {
  const tag = item.tags?.[0] || item.category || "복지정책";
  const toneIndex = [...tag].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  );

  return {
    ...item,
    id: item.slug,
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag,
    tagTone: TONES[toneIndex % TONES.length],
    summary:
      item.summary ||
      item.benefit_summary ||
      "정책 상세 내용은 공식 안내에서 확인할 수 있어요.",
    amount: item.benefit_type || "지원 유형 확인 필요",
    period:
      item.application_period_text ||
      (item.application_status === "ONLINE_AVAILABLE"
        ? "온라인 신청 가능"
        : "신청 기간 상세 확인"),
  };
}

function LoadingSkeleton() {
  return (
    <div className="row g-4 mt-0" aria-label="정책 목록을 불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="col-12 col-sm-6 col-lg-4" key={index}>
          <div className="dd-card h-100" style={{ padding: 20, minHeight: 230 }}>
            <div className="placeholder-glow">
              <span className="placeholder col-3 rounded mb-3" />
              <span className="placeholder col-9 rounded d-block mb-3" />
              <span className="placeholder col-12 rounded d-block mb-2" />
              <span className="placeholder col-10 rounded d-block mb-4" />
              <span className="placeholder col-6 rounded d-block" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PoliciesPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState("updated_at");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    size: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [basket, setBasket] = useState([]);
  const {
    has: isLiked,
    toggle: toggleLike,
    pendingIds: pendingLikeIds,
    error: favoriteError,
  } = useLiked();

  const tags = useMemo(
    () =>
      [...new Set(tagInput.split(",").map((tag) => tag.trim()).filter(Boolean))],
    [tagInput]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPolicies() {
      setLoading(true);
      setError("");
      try {
        const response = await policyApi.getPolicies({
          query: debouncedQuery,
          category,
          tags,
          regionCode,
          stage,
          sort,
          page,
          size: PAGE_SIZE,
          signal: controller.signal,
        });
        setItems(response.data || []);
        setMeta(
          response.meta || {
            page,
            size: PAGE_SIZE,
            total: 0,
            total_pages: 0,
          }
        );
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
          setError(
            requestError.message ||
              "정책 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPolicies();
    return () => controller.abort();
  }, [
    debouncedQuery,
    category,
    tags,
    regionCode,
    stage,
    sort,
    page,
    retryKey,
  ]);

  const policies = useMemo(() => items.map(toPolicyCard), [items]);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const toggleCategory = (value) => {
    setCategory((current) => (current === value ? "" : value));
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setDebouncedQuery("");
    setCategory("");
    setTagInput("");
    setRegionCode("");
    setStage("");
    setSort("updated_at");
    setPage(1);
  };

  const toggleBasket = (policy) => {
    setBasket((current) => {
      if (current.some((item) => item.id === policy.id)) {
        return current.filter((item) => item.id !== policy.id);
      }
      return current.length >= 2 ? [current[1], policy] : [...current, policy];
    });
  };

  return (
    <div className="dd-page">
      <Header />
      <main
        className="dd-shell"
        style={{ paddingTop: 32, paddingBottom: basket.length ? 110 : 64 }}
      >
        <h1 className="dd-title" style={{ fontSize: 30 }}>
          정책 리스트
        </h1>
        <p className="mt-2" style={{ color: "var(--dd-stone-600)" }}>
          복지정책을 검색하고 분야별로 살펴보세요.
        </p>

        <div className="row g-2 mt-2 align-items-center">
          <div className="col-12 col-lg">
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--dd-stone-400)",
                }}
              >
                <Icon name="Search" size={18} />
              </span>
              <input
                className="dd-input"
                style={{ paddingLeft: 44, borderRadius: 999 }}
                placeholder="정책 이름이나 키워드로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-auto">
            <select
              className="dd-select"
              value={sort}
              onChange={(event) => updateFilter(setSort)(event.target.value)}
              aria-label="정책 정렬"
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-lg-auto">
            <button
              type="button"
              className="dd-btn dd-btn-ghost w-100"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((current) => !current)}
            >
              <Icon name="SlidersHorizontal" size={16} />
              필터
            </button>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            className={"dd-tab" + (category === "" ? " is-active" : "")}
            onClick={() => {
              setCategory("");
              setPage(1);
            }}
          >
            전체
          </button>
          {CATEGORIES.map((item) => (
            <button
              key={item}
              type="button"
              className={"dd-tab" + (category === item ? " is-active" : "")}
              onClick={() => toggleCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="dd-card mt-3" style={{ padding: 20 }}>
            <div className="row g-3">
              <label className="col-12 col-lg-4">
                <span className="dd-label">태그</span>
                <input
                  className="dd-input"
                  value={tagInput}
                  placeholder="예: 청년, 임신·출산"
                  onChange={(event) =>
                    updateFilter(setTagInput)(event.target.value)
                  }
                />
                <span className="dd-subtle" style={{ fontSize: 12 }}>
                  여러 태그는 쉼표로 구분하며 모두 일치하는 정책을 찾습니다.
                </span>
              </label>
              <label className="col-12 col-md-6 col-lg-4">
                <span className="dd-label">지역</span>
                <select
                  className="dd-select"
                  value={regionCode}
                  onChange={(event) =>
                    updateFilter(setRegionCode)(event.target.value)
                  }
                >
                  {REGIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-12 col-md-6 col-lg-4">
                <span className="dd-label">대상</span>
                <select
                  className="dd-select"
                  value={stage}
                  onChange={(event) =>
                    updateFilter(setStage)(event.target.value)
                  }
                >
                  {STAGES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="d-flex justify-content-end mt-3">
              <button
                type="button"
                className="dd-btn dd-btn-ghost dd-btn-sm"
                onClick={resetFilters}
              >
                전체 초기화
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 d-flex justify-content-between gap-3">
          <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
            총 {meta.total}개 정책
          </p>
          {meta.total_pages > 0 && (
            <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
              {meta.page} / {meta.total_pages} 페이지
            </p>
          )}
        </div>

        {favoriteError && (
          <p
            className="dd-disclaimer mt-3 mb-0"
            style={{ color: "var(--dd-coral)" }}
          >
            <Icon name="CircleAlert" size={13} /> {favoriteError}
          </p>
        )}

        {error && (
          <div
            className="dd-card-soft mt-4 text-center"
            style={{ padding: 32, color: "var(--dd-coral)" }}
          >
            <p className="mb-3">{error}</p>
            <button
              type="button"
              className="dd-btn dd-btn-ghost dd-btn-sm"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              다시 시도
            </button>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {!loading && !error && (
          <>
            <div className="row g-4 mt-0">
              {policies.map((policy) => {
                const inBasket = basket.some((item) => item.id === policy.id);
                return (
                  <div className="col-12 col-sm-6 col-lg-4" key={policy.id}>
                    <PolicyCard
                      policy={policy}
                      showMeta
                      liked={isLiked(policy.id)}
                      onToggleLike={() => toggleLike(policy.id)}
                      likeDisabled={pendingLikeIds.includes(policy.id)}
                    >
                      <Link
                        href={`/policies/${policy.id}`}
                        className="dd-btn dd-btn-ghost dd-btn-sm"
                      >
                        <Icon name="FileText" size={15} /> 상세보기
                      </Link>
                      <button
                        type="button"
                        className={
                          "dd-btn dd-btn-sm " +
                          (inBasket ? "dd-btn-amber" : "dd-btn-ghost")
                        }
                        onClick={() => toggleBasket(policy)}
                      >
                        <Icon
                          name={inBasket ? "Check" : "GitCompare"}
                          size={15}
                        />
                        {inBasket ? "비교 담음" : "비교 담기"}
                      </button>
                    </PolicyCard>
                  </div>
                );
              })}

              {policies.length === 0 && (
                <div className="col-12">
                  <div
                    className="dd-card-soft text-center"
                    style={{ padding: 40, color: "var(--dd-stone-500)" }}
                  >
                    검색 결과가 없어요. 다른 조건으로 찾아보세요.
                  </div>
                </div>
              )}
            </div>

            {meta.total_pages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                <button
                  type="button"
                  className="dd-btn dd-btn-ghost dd-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  이전
                </button>
                <strong style={{ fontSize: 14 }}>
                  {page} / {meta.total_pages}
                </strong>
                <button
                  type="button"
                  className="dd-btn dd-btn-ghost dd-btn-sm"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {basket.length > 0 && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1040,
            background: "rgba(255,255,255,0.95)",
            borderTop: "1px solid var(--dd-coral-100)",
          }}
        >
          <div
            className="dd-shell d-flex align-items-center justify-content-between gap-3"
            style={{ paddingTop: 14, paddingBottom: 14 }}
          >
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Icon name="GitCompare" size={18} />
              <strong style={{ fontSize: 14 }}>비교 바구니</strong>
              {basket.map((policy) => (
                <span key={policy.id} className="dd-pill dd-pill-amber">
                  {policy.name}
                </span>
              ))}
              <span className="dd-subtle" style={{ fontSize: 13 }}>
                {basket.length}/2
              </span>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="dd-btn dd-btn-ghost dd-btn-sm"
                onClick={() => setBasket([])}
              >
                비우기
              </button>
              <button
                type="button"
                className="dd-btn dd-btn-coral dd-btn-sm"
                disabled={basket.length < 2}
                onClick={() =>
                  router.push(`/compare?a=${basket[0].id}&b=${basket[1].id}`)
                }
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
