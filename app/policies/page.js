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

const STAGES = [{ value: "", label: "전체 대상" }, ...FAMILY_OPTIONS.stage];

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

function getPolicySlug(item) {
  return item.slug || item.policy_slug || item.policy_id;
}

function getPoliciesData(response) {
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data?.items || [];
}

function getPoliciesMeta(response, fallback) {
  const pagination = response?.data?.pagination;
  return response?.meta || pagination || fallback;
}

function getVisiblePageNumbers(currentPage, totalPages, maxVisible = 5) {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(maxVisible / 2);
  const maxStart = totalPages - maxVisible + 1;
  const start = Math.min(Math.max(currentPage - half, 1), maxStart);

  return Array.from({ length: maxVisible }, (_, index) => start + index);
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || /^(null|undefined|NaN)$/i.test(text)) return fallback;
  return text;
}

function toPolicyCard(item) {
  const tag = safeText(item.tags?.[0] || item.category, "복지 정책");
  const toneIndex = [...tag].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return {
    ...item,
    id: getPolicySlug(item),
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag,
    tagTone: TONES[toneIndex % TONES.length],
    summary:
      safeText(item.summary) ||
      safeText(item.benefit_summary) ||
      "정책 상세 내용은 공식 안내에서 확인해 주세요.",
    amount: safeText(item.benefit_type, "지원 유형 확인 필요"),
  };
}

function LoadingSkeleton() {
  return (
    <div className="row g-4 mt-0" aria-label="정책 목록을 불러오는 중">
      {Array.from({ length: 6 }, (_, index) => (
        <div className="col-12 col-sm-6 col-lg-4" key={index}>
          <div
            className="dd-card h-100"
            style={{ padding: 20, minHeight: 230 }}
          >
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
  const [detailKeyword, setDetailKeyword] = useState("");
  const [debouncedDetailKeyword, setDebouncedDetailKeyword] = useState("");
  const [stage, setStage] = useState("");
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedDetailKeyword(
        detailKeyword
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
          .join(" "),
      );
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [detailKeyword]);

  const hasSearchKeyword = Boolean(debouncedQuery || debouncedDetailKeyword);
  const effectiveSort = hasSearchKeyword ? "relevance" : "updated_at";

  useEffect(() => {
    const controller = new AbortController();

    async function loadPolicies() {
      setLoading(true);
      setError("");
      try {
        const response = await policyApi.getPolicies({
          query: debouncedQuery,
          detailQuery: debouncedDetailKeyword,
          category,
          stage,
          sort: effectiveSort,
          page,
          size: PAGE_SIZE,
          signal: controller.signal,
        });
        setItems(getPoliciesData(response));
        setMeta(
          getPoliciesMeta(response, {
            page,
            size: PAGE_SIZE,
            total: 0,
            total_pages: 0,
          }),
        );
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
          setError(
            requestError.message ||
              "정책 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
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
    debouncedDetailKeyword,
    category,
    stage,
    effectiveSort,
    page,
    retryKey,
  ]);

  const policies = useMemo(() => items.map(toPolicyCard), [items]);
  const totalPages = Number(meta.total_pages || meta.totalPages || 0);
  const currentPage = Math.min(
    Math.max(Number(meta.page || page || 1), 1),
    totalPages || 1,
  );
  const visiblePageNumbers = useMemo(
    () => getVisiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

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
    setDetailKeyword("");
    setDebouncedDetailKeyword("");
    setStage("");
    setPage(1);
  };

  const goToPage = (nextPage) => {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages || 1);
    if (normalizedPage !== page) setPage(normalizedPage);
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
          정책 목록
        </h1>
        <p className="mt-2" style={{ color: "var(--dd-stone-600)" }}>
          정책명으로 먼저 찾고, 필요한 경우 상세 조건을 따로 추가해 보세요.
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
                placeholder="정책명으로 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="정책명 검색"
              />
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-auto">
            <button
              type="button"
              className="dd-btn dd-btn-ghost w-100"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((current) => !current)}
            >
              <Icon name="SlidersHorizontal" size={16} />
              상세 조건
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
              <label className="col-12 col-lg-6">
                <span className="dd-label">대상·지원내용·조건 검색</span>
                <input
                  className="dd-input"
                  value={detailKeyword}
                  placeholder="예: 출산, 청소년, 방문 돌봄"
                  onChange={(event) =>
                    updateFilter(setDetailKeyword)(event.target.value)
                  }
                />
                <span className="dd-subtle" style={{ fontSize: 12 }}>
                  정책명 검색과 분리해서 대상, 지원내용, 조건 설명에서 찾아요.
                </span>
              </label>
              <label className="col-12 col-lg-6">
                <span className="dd-label">지원 대상</span>
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
            {loading
              ? "정책 목록을 불러오는 중이에요."
              : `총 ${meta.total || 0}개 정책`}
          </p>
          {!loading && meta.total_pages > 0 && (
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
                        {inBasket ? "비교 담김" : "비교 담기"}
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

            {totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-2 mt-4 flex-wrap">
                <button
                  type="button"
                  className="dd-btn dd-btn-ghost dd-btn-sm"
                  disabled={currentPage <= 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  이전
                </button>
                {visiblePageNumbers.map((pageNumber) => {
                  const isCurrent = pageNumber === currentPage;
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={
                        "dd-btn dd-btn-sm " +
                        (isCurrent ? "dd-btn-coral" : "dd-btn-ghost")
                      }
                      onClick={() => goToPage(pageNumber)}
                      aria-current={isCurrent ? "page" : undefined}
                      aria-label={`${pageNumber}페이지로 이동`}
                      style={{ minWidth: 38, justifyContent: "center" }}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="dd-btn dd-btn-ghost dd-btn-sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => goToPage(currentPage + 1)}
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
