"use client";

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

const STAGE_LABELS = {
  pregnant: "임신·출산",
  newborn: "신생아",
  infant: "영유아",
  child: "아동",
  teen: "청소년",
  all: "모든 생애 단계",
};

const INTERNAL_PATTERNS = [
  /\b(pregnant|newborn|infant|child|teen)\b/i,
  /condition_validation_adjusted|review_required|unsupported_condition|source_text_missing/i,
  /\b(field|operator|value|matching_strength)\b/i,
  /policy_condition_profile|condition_json|quality_flags/i,
  /SERVICE_FIELD|RULE_|INTERNAL|DEBUG/i,
  /\b(null|undefined|NaN)\b/i,
  /^[A-Z_]{3,}$/,
];

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "string") {
    const text = value.trim();
    return !text || /^(null|undefined|NaN)$/i.test(text) || text === "[]" || text === "{}";
  }
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function cleanText(value, fallback = "") {
  if (isBlank(value)) return fallback;
  if (Array.isArray(value)) {
    const joined = value.map((item) => cleanText(item)).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (typeof value === "object") {
    return cleanText(
      value.display_text || value.displayText || value.label || value.name || value.summary || value.snippet,
      fallback
    );
  }

  const text = String(value).trim();
  if (!text || INTERNAL_PATTERNS.some((pattern) => pattern.test(text))) return fallback;
  return text;
}

function truncateText(value, maxLength = 100) {
  const text = cleanText(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function iconForCategory(category) {
  return CATEGORY_ICONS[category] || "Sparkles";
}

function getPolicySlug(item) {
  return item?.slug || item?.policy_slug || item?.policy_id || item?.id || "";
}

function formatStage(item) {
  if (item?.all_age === true) return "전 연령 대상";
  const display = cleanText(item?.target_stage_display || item?.life_stage_display || item?.display_age);
  if (display) return display;

  const raw = item?.target_stage || item?.target_stages || item?.stage;
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const labels = values
    .map((value) => STAGE_LABELS[String(value).trim()] || cleanText(value))
    .filter(Boolean);
  return labels.length ? [...new Set(labels)].join(", ") : "";
}

function reasonText(item) {
  const criteria = item.related_match_criteria || item.match_criteria;
  const criteriaText = Array.isArray(criteria)
    ? criteria.map((value) => cleanText(value)).filter(Boolean).join(", ")
    : cleanText(criteria);
  const category = cleanText(item.category);
  const stage = formatStage(item);

  if (criteriaText) {
    return "같은 생애단계와 유사한 지원 분야를 기준으로 추천했어요.";
  }
  if (category && stage) {
    return `${category} 분야와 ${stage} 대상 기준이 비슷한 정책이에요.`;
  }
  if (category) return `${category} 분야가 비슷한 정책이에요.`;
  if (stage) return `${stage} 대상에게 함께 볼 만한 정책이에요.`;
  return "분야나 대상이 비슷한 정책이에요.";
}

function normalizePolicy(item) {
  const slug = getPolicySlug(item);
  return {
    slug,
    name: cleanText(item.policy_name || item.name || item.title, "정책명 확인 필요"),
    category: cleanText(item.category, "복지 정책"),
    stage: formatStage(item),
    summary: truncateText(
      item.benefit_summary_display ||
        item.benefit_summary ||
        item.summary ||
        item.easy_summary ||
        item.description,
      100
    ),
    reason: reasonText(item),
    icon: iconForCategory(item.category),
  };
}

function Reason({ text }) {
  if (!text) return null;
  return (
    <p className="mb-0" style={{ fontSize: 12, color: "var(--dd-stone-600)", lineHeight: 1.5 }}>
      {text}
    </p>
  );
}

function Meta({ item }) {
  const meta = [item.category, item.stage].filter(Boolean).join(" · ");
  if (!meta) return null;
  return (
    <p className="mb-0 mt-1" style={{ fontSize: 11, color: "var(--dd-stone-500)", lineHeight: 1.5 }}>
      {meta}
    </p>
  );
}

export default function SimilarPolicies({
  policySlug,
  items: providedItems,
  limit = 4,
  title = "함께 보면 좋은 정책",
  layout = "sidebar",
  sticky = true,
  showEmpty = false,
}) {
  const usingProvided = Array.isArray(providedItems);
  const [fetchedItems, setFetchedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const items = (usingProvided ? providedItems : fetchedItems)
    .map(normalizePolicy)
    .filter((item) => item.slug);

  useEffect(() => {
    if (usingProvided || !policySlug) return undefined;

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
        if (err?.code === "ERR_CANCELED") return;
        setFetchedItems([]);
        setError(getApiErrorMessage(err, "관련 정책을 불러오지 못했어요."));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadSimilar();
    return () => controller.abort();
  }, [policySlug, limit, usingProvided]);

  const isEmpty = !loading && !error && items.length === 0;
  if (isEmpty && !showEmpty) return null;

  const heading = (
    <div className="d-flex align-items-center gap-2 mb-2">
      <Icon name="Sparkles" size={16} style={{ color: "var(--dd-coral)" }} />
      <strong style={{ fontSize: 15 }}>{title}</strong>
    </div>
  );
  const helper = (
    <p className="dd-subtle mb-3" style={{ fontSize: 12, lineHeight: 1.5 }}>
      같은 생애단계와 유사한 지원 분야를 기준으로 최대 3개까지 보여줘요.
    </p>
  );
  const loadingRow = (
    <div className="d-flex align-items-center gap-2 dd-subtle" style={{ fontSize: 13 }}>
      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
      관련 정책을 찾고 있어요.
    </div>
  );
  const errorRow = <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>{error}</p>;
  const emptyRow = (
    <p className="mb-0 dd-subtle" style={{ fontSize: 13 }}>
      함께 볼 만한 정책을 찾지 못했어요.
    </p>
  );

  if (layout === "grid") {
    return (
      <div>
        {heading}
        {helper}
        {loading ? (
          loadingRow
        ) : error ? (
          errorRow
        ) : isEmpty ? (
          emptyRow
        ) : (
          <div className="row g-3">
            {items.map((item) => (
              <div className="col-12 col-sm-6 col-lg-3" key={item.slug}>
                <Link
                  href={`/policies/${encodeURIComponent(item.slug)}`}
                  className="dd-card dd-card-hover h-100 text-decoration-none d-flex flex-column"
                  style={{ padding: 16 }}
                >
                  <span className="dd-icon-tile mb-2" style={{ width: 40, height: 40 }}>
                    <Icon name={item.icon} size={19} />
                  </span>
                  <strong className="d-block" style={{ fontSize: 14, color: "var(--dd-ink)" }}>
                    {item.name}
                  </strong>
                  <Meta item={item} />
                  {item.summary && (
                    <p className="mt-2 mb-2" style={{ fontSize: 12, color: "var(--dd-stone-600)", lineHeight: 1.5 }}>
                      {item.summary}
                    </p>
                  )}
                  <Reason text={item.reason} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cardStyle = sticky
    ? { padding: 20, position: "sticky", top: 84 }
    : { padding: 20 };

  return (
    <div className="dd-card" style={cardStyle}>
      {heading}
      {helper}
      {loading ? (
        loadingRow
      ) : error ? (
        errorRow
      ) : isEmpty ? (
        emptyRow
      ) : (
        <div className="d-flex flex-column gap-2">
          {items.slice(0, 3).map((item) => (
            <Link
              key={item.slug}
              href={`/policies/${encodeURIComponent(item.slug)}`}
              className="d-flex align-items-start gap-3 dd-card-soft text-decoration-none dd-card-hover"
              style={{ padding: 12 }}
            >
              <span className="dd-icon-tile" style={{ width: 38, height: 38, flex: "none" }}>
                <Icon name={item.icon} size={18} />
              </span>
              <div className="flex-grow-1 min-w-0">
                <p className="mb-0 fw-semibold" style={{ fontSize: 14, color: "var(--dd-ink)", lineHeight: 1.4 }}>
                  {item.name}
                </p>
                <Meta item={item} />
                {item.summary && (
                  <p className="mt-1 mb-1" style={{ fontSize: 12, color: "var(--dd-stone-600)", lineHeight: 1.45 }}>
                    {item.summary}
                  </p>
                )}
                <Reason text={item.reason} />
                <span className="dd-link d-inline-flex align-items-center gap-1 mt-2" style={{ fontSize: 12 }}>
                  상세보기 <Icon name="ChevronRight" size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
