"use client";

// =========================================================================
// 도담 — 유사 정책(SimilarPolicies) 공용 컴포넌트
// 의도: 기준 정책과 의미적으로 비슷한 정책을 벡터+에이전트로 찾아 보여준다.
//       정책상세·추천결과·비교·채팅 등 여러 화면에 드롭인으로 재사용한다.
// 레이아웃: "sidebar"(세로 리스트, 정책상세 우측) | "grid"(반응형 카드 그리드,
//       넓은 화면용 — 추천결과·비교). 둘 다 같은 데이터·로딩/에러 처리를 공유한다.
// 동작: policySlug로 GET /policies/{slug}/similar 호출. 결과가 없으면 아무것도
//       렌더하지 않아 화면을 깨지 않는다.
// =========================================================================
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon";
import policyApi from "@/apis/policyApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";

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

const iconForCategory = (category) => CATEGORY_ICONS[category] || "Sparkles";

// 메타는 분류만 노출(지역은 카드가 좁아 생략).
const metaLine = (item) => item.category || "";

// 카드 본문 조각(레이아웃 공통): 왜 비슷한지 → 다른 점 → 메타.
function Reason({ text }) {
  if (!text) return null;
  return (
    <p
      className="mb-0"
      style={{ fontSize: 12, color: "var(--dd-stone-600)", lineHeight: 1.5 }}
    >
      {text}
    </p>
  );
}

function Meta({ item }) {
  const text = metaLine(item);
  if (!text) return null;
  return (
    <p
      className="mb-0 mt-1 text-truncate"
      style={{ fontSize: 11, color: "var(--dd-stone-400)" }}
    >
      {text}
    </p>
  );
}

export default function SimilarPolicies({
  policySlug,
  // 외부에서 항목을 직접 받으면(챗 응답처럼) 그걸 그대로 렌더하고 fetch하지 않는다.
  items: providedItems,
  limit = 4,
  title = "이런 정책과 비슷해요",
  layout = "sidebar",
  sticky = true,
  // 결과가 없을 때: 기본은 섹션을 숨기고(null), true면 "없음" 메시지를 보여준다.
  // 사용자가 직접 펼친 경우(카드 '유사 정책' 토글)엔 true로 둬 빈 화면을 피한다.
  showEmpty = false,
}) {
  const usingProvided = Array.isArray(providedItems);
  const [fetchedItems, setFetchedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const items = usingProvided ? providedItems : fetchedItems;

  useEffect(() => {
    // 외부 제공 모드면 fetch하지 않는다.
    if (usingProvided || !policySlug) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadSimilar() {
      setLoading(true);
      setError("");
      try {
        const list = await policyApi.getSimilarPolicies(policySlug, {
          limit,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setFetchedItems(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (err?.code === "ERR_CANCELED") {
          return;
        }
        setFetchedItems([]);
        setError(getApiErrorMessage(err, "유사 정책을 불러오지 못했어요."));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadSimilar();

    return () => controller.abort();
  }, [policySlug, limit, usingProvided]);

  // 결과도 에러도 없으면(빈 목록): 기본은 섹션을 숨기고, showEmpty면 메시지를 남긴다.
  const isEmpty = !loading && !error && items.length === 0;
  if (isEmpty && !showEmpty) {
    return null;
  }

  const heading = (
    <div className="d-flex align-items-center gap-2 mb-3">
      <Icon name="Sparkles" size={16} style={{ color: "var(--dd-coral)" }} />
      <strong style={{ fontSize: 15 }}>{title}</strong>
    </div>
  );
  const loadingRow = (
    <div
      className="d-flex align-items-center gap-2 dd-subtle"
      style={{ fontSize: 13 }}
    >
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      유사 정책을 찾는 중이에요.
    </div>
  );
  const errorRow = (
    <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
      {error}
    </p>
  );
  const emptyRow = (
    <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
      비슷한 정책을 찾지 못했어요.
    </p>
  );

  // --- 넓은 화면용: 반응형 카드 그리드 ---
  if (layout === "grid") {
    return (
      <div>
        {heading}
        {loading ? (
          loadingRow
        ) : error ? (
          errorRow
        ) : isEmpty ? (
          emptyRow
        ) : (
          <div className="row g-3">
            {items.map((item) => {
              const slug = item.slug || item.policy_id;
              return (
                <div
                  className="col-12 col-sm-6 col-lg-3"
                  key={item.policy_id || slug}
                >
                  <Link
                    href={`/policies/${encodeURIComponent(slug)}`}
                    className="dd-card dd-card-hover h-100 text-decoration-none d-flex flex-column"
                    style={{ padding: 16 }}
                  >
                    <span
                      className="dd-icon-tile mb-2"
                      style={{ width: 40, height: 40 }}
                    >
                      <Icon name={iconForCategory(item.category)} size={19} />
                    </span>
                    <strong
                      className="d-block text-truncate"
                      style={{ fontSize: 14, color: "var(--dd-ink)" }}
                    >
                      {item.name}
                    </strong>
                    <div className="mt-1">
                      <Reason text={item.similarity_reason} />
                      <Meta item={item} />
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // --- 정책상세 우측: 세로 리스트(기본) ---
  const cardStyle = sticky
    ? { padding: 20, position: "sticky", top: 84 }
    : { padding: 20 };

  return (
    <div className="dd-card" style={cardStyle}>
      {heading}
      {loading ? (
        loadingRow
      ) : error ? (
        errorRow
      ) : isEmpty ? (
        emptyRow
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.map((item) => {
            const slug = item.slug || item.policy_id;
            return (
              <Link
                key={item.policy_id || slug}
                href={`/policies/${encodeURIComponent(slug)}`}
                className="d-flex align-items-start gap-3 dd-card-soft text-decoration-none dd-card-hover"
                style={{ padding: 12 }}
              >
                <span
                  className="dd-icon-tile"
                  style={{ width: 38, height: 38, flex: "none" }}
                >
                  <Icon name={iconForCategory(item.category)} size={18} />
                </span>
                <div className="flex-grow-1 min-w-0">
                  <p
                    className="mb-0 fw-semibold text-truncate"
                    style={{ fontSize: 14, color: "var(--dd-ink)" }}
                  >
                    {item.name}
                  </p>
                  <Reason text={item.similarity_reason} />
                  <Meta item={item} />
                </div>
                <Icon
                  name="ChevronRight"
                  size={16}
                  style={{ color: "var(--dd-stone-400)", flex: "none" }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
