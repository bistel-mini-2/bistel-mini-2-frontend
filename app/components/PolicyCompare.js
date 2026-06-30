"use client";

// =========================================================================
// 도담 - 정책 비교 (내용 컴포넌트)
// /compare 페이지와 상세 모달이 함께 사용한다.
// =========================================================================
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/Icon";
import PolicySelect from "@/app/components/PolicySelect";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { POLICIES, getPolicy } from "@/app/data/policies";
import compareApi from "@/apis/compareApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";

const DEFAULT_COMPARE_ERROR_MESSAGE =
  "정책 비교 결과를 불러오지 못했어요. 정책을 다시 선택해 주세요.";

const toApiSlug = (value) => {
  const policy = getPolicy(value);
  return policy?.backendSlug || value;
};

const toSelectOption = (policy) => {
  if (!policy?.slug) return null;
  return {
    id: policy.slug,
    name: policy.name,
    tag: policy.summary?.condition || "비교 중인 정책",
  };
};

const toStaticSelectOption = (value) => {
  const policy = POLICIES.find(
    (item) => item.id === value || item.backendSlug === value
  );
  if (!policy) return null;
  return {
    id: toApiSlug(policy.id),
    name: policy.name,
    tag: policy.tag,
  };
};

const COMPARE_FIELD_LABELS = {
  target: "지원 대상",
  target_summary: "지원 대상",
  target_conditions: "대상 조건",
  condition: "지원 조건",
  income: "소득 조건",
  income_conditions: "소득 조건",
  benefit: "지원 내용",
  application: "신청 방법",
  documents: "필요 서류",
  cautions: "유의 사항",
  period: "신청 기간",
  agency: "담당 기관",
};

const VALUE_REPLACEMENTS = [
  [/target_summary/g, "지원 대상"],
  [/target_conditions/g, "대상 조건"],
  [/income_conditions/g, "소득 조건"],
  [/manual_check_points/g, "추가 확인 조건"],
  [/missing_conditions/g, "추가 확인 조건"],
  [/matched_conditions/g, "충족 조건"],
  [/field\s*:/g, "조건 항목: "],
  [/operator\s*:/g, "비교 방식: "],
  [/value\s*:/g, "기준값: "],
  [/matching_strength\s*:/g, "판단 중요도: "],
  [/condition_group\s*:/g, "조건 묶음: "],
  [/rule_group\s*:/g, "조건 묶음: "],
  [/\bAND\b/g, "모두 충족"],
  [/\bOR\b/g, "하나 이상 충족"],
  [/\bIN\b/g, "포함"],
  [/\bLTE\b/g, "이하"],
  [/\bGTE\b/g, "이상"],
  [/\bTRUE\b|\bFALSE\b|\bNULL\b/gi, ""],
  [/\bstage\b/g, "가족 상황"],
  [/\bchildAge\b|\bchild_age\b/g, "자녀 연령"],
  [/\bincome_status\b|\bbenefit_status\b/g, "수급 여부"],
  [/\bmedian_income_percent\b/g, "중위소득 비율"],
  [/\bspecial_condition\b|\bspecial\b/g, "가구 특성"],
  [/\bdebt_status\b/g, "채무 상황"],
  [/\btarget_type\b|\btarget_context\b/g, "지원 대상"],
];

const formatCompareField = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return "비교 항목";
  }

  return COMPARE_FIELD_LABELS[text] || text.replace(/_/g, " ");
};

const normalizeCompareText = (value) => {
  let text = String(value || "").trim();
  VALUE_REPLACEMENTS.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text
    .replace(/[{}[\]"]/g, "")
    .replace(/\s*[,|]\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/^[,\s]+|[,\s]+$/g, "");
};

const displayValue = (value) => {
  if (value == null || value === "") {
    return "공식 안내 확인 필요";
  }
  if (Array.isArray(value)) {
    return value.map(displayValue).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, itemValue]) => itemValue !== null && itemValue !== undefined && itemValue !== "")
      .map(([key, itemValue]) => `${formatCompareField(key)}: ${displayValue(itemValue)}`)
      .join(", ");
  }
  return normalizeCompareText(value);
};

const compactValue = (value, maxLength = 120) => {
  const text = displayValue(value);
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
};

const isDocumentRow = (field) => formatCompareField(field) === "제출 서류";

const displayItems = (value) => {
  if (value == null || value === "") {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => displayValue(item))
      .filter((item) => item && item !== "공식 안내 확인 필요");
  }
  return displayValue(value)
    .split(/\s*,\s*/)
    .map((item) => item.trim())
    .filter((item) => item && item !== "공식 안내 확인 필요");
};

function CompareCell({ label, value, documentRow }) {
  const items = documentRow ? displayItems(value) : [];

  return (
    <div
      style={{
        background: "var(--dd-stone-50)",
        border: "1px solid var(--dd-stone-100)",
        borderRadius: 12,
        padding: "10px 12px",
      }}
      title={displayValue(value)}
    >
      <span className="dd-pill dd-pill-amber mb-2" style={{ fontSize: 11 }}>
        {label}
      </span>
      {documentRow ? (
        items.length > 0 ? (
          <ul className="mb-0 ps-3" style={{ color: "var(--dd-stone-600)", fontSize: 13, lineHeight: 1.6 }}>
            {items.slice(0, 5).map((item) => (
              <li key={item}>{item}</li>
            ))}
            {items.length > 5 && <li>외 {items.length - 5}개 서류</li>}
          </ul>
        ) : (
          <p className="mb-0" style={{ color: "var(--dd-stone-600)", fontSize: 13, lineHeight: 1.55 }}>
            공식 안내에서 제출 서류를 확인해 주세요.
          </p>
        )
      ) : (
        <p className="mb-0" style={{ color: "var(--dd-stone-600)", fontSize: 13, lineHeight: 1.55 }}>
          {compactValue(value)}
        </p>
      )}
    </div>
  );
}

function CompareRowCard({ row }) {
  const documentRow = isDocumentRow(row.field);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(120px, 0.55fr) minmax(0, 1fr) minmax(0, 1fr)",
        gap: 12,
        padding: "14px 0",
        borderTop: "1px solid var(--dd-stone-100)",
        alignItems: "stretch",
      }}
    >
      <div className="d-flex align-items-center gap-2">
        <strong style={{ fontSize: 14, color: "var(--dd-ink)", lineHeight: 1.35 }}>{formatCompareField(row.field)}</strong>
      </div>
      {[
        ["정책 A", row.a],
        ["정책 B", row.b],
      ].map(([label, value], index) => (
        <CompareCell
          key={index}
          label={label}
          value={value}
          documentRow={documentRow}
        />
      ))}
    </div>
  );
}

function SectionTitle({ icon, title, desc, tone = "amber" }) {
  return (
    <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-wrap">
      <div className="d-flex align-items-center gap-2">
        <span className={`dd-icon-tile dd-tile-${tone}`} style={{ width: 34, height: 34, borderRadius: 12 }}>
          <Icon name={icon} size={16} />
        </span>
        <div>
          <strong style={{ fontSize: 15, color: "var(--dd-ink)" }}>{title}</strong>
          {desc && <p className="mb-0 dd-subtle" style={{ fontSize: 12 }}>{desc}</p>}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ policy, slot }) {
  return (
    <div
      className="dd-card h-100"
      style={{
        padding: 18,
        borderTop: "4px solid var(--dd-amber-200)",
        minHeight: 190,
      }}
    >
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
        <span className="dd-pill dd-pill-amber">정책 {slot}</span>
        {policy && <span className="dd-pill dd-pill-stone">선택됨</span>}
      </div>
      {policy ? (
        <>
          <div className="d-flex align-items-center gap-2">
            <span className="dd-icon-tile dd-tile-amber" style={{ width: 40, height: 40 }}>
              <Icon name="FileText" size={20} />
            </span>
            <strong style={{ fontSize: 16, lineHeight: 1.35 }}>{policy.name}</strong>
          </div>
          <p className="mt-2 mb-0" style={{ fontSize: 13, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>
            {displayValue(policy.summary?.condition)}
          </p>
          <div className="mt-2 d-flex align-items-center gap-2" style={{ fontSize: 13, color: "var(--dd-amber)" }}>
            <Icon name="Wallet" size={14} />
            <span className="fw-semibold">{displayValue(policy.summary?.benefit)}</span>
          </div>
        </>
      ) : (
        <div className="d-flex align-items-center gap-2" style={{ minHeight: 90 }}>
          <Icon name="MousePointerClick" size={18} style={{ color: "var(--dd-stone-400)" }} />
          <p className="dd-subtle mb-0">비교할 정책을 선택해 주세요.</p>
        </div>
      )}
    </div>
  );
}

export default function PolicyCompare({
  initialA = "",
  initialB = "",
}) {
  const [aId, setAId] = useState(toApiSlug(initialA));
  const [bId, setBId] = useState(toApiSlug(initialB));
  const [compareResult, setCompareResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!aId || !bId) {
      return;
    }

    const controller = new AbortController();

    async function loadCompareResult() {
      setLoading(true);
      setErrorMessage("");

      try {
        const result = await compareApi.comparePolicies({
          policyA: aId,
          policyB: bId,
          signal: controller.signal,
        });
        setCompareResult(result);
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        setCompareResult(null);
        setErrorMessage(
          getApiErrorMessage(error, DEFAULT_COMPARE_ERROR_MESSAGE)
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCompareResult();

    return () => controller.abort();
  }, [aId, bId]);

  const policyA = compareResult?.policy_a || null;
  const policyB = compareResult?.policy_b || null;
  const relatedPolicies = compareResult?.related_policies || [];
  const extraOptions = useMemo(
    () =>
      [
        toStaticSelectOption(aId),
        toStaticSelectOption(bId),
        toSelectOption(policyA),
        toSelectOption(policyB),
      ].filter(Boolean),
    [aId, bId, policyA, policyB]
  );

  return (
    <div className="d-flex flex-column gap-4">
      <div className="dd-card" style={{ padding: 18 }}>
        <SectionTitle
          icon="SlidersHorizontal"
          title="비교할 정책 선택"
          desc="정책 목록에서 넘어온 slug를 그대로 유지해 비교합니다."
        />
        <div className="row g-3 align-items-end">
          <div className="col-12 col-lg-5">
            <PolicySelect
              label="정책 A"
              value={aId}
              onChange={(value) => setAId(toApiSlug(value))}
              exclude={[bId]}
              extraOptions={extraOptions}
            />
          </div>
          <div className="col-12 col-lg-2 d-none d-lg-flex justify-content-center pb-1">
            <span className="dd-icon-tile dd-tile-amber" style={{ width: 38, height: 38 }}>
              <Icon name="ArrowLeftRight" size={18} />
            </span>
          </div>
          <div className="col-12 col-lg-5">
            <PolicySelect
              label="정책 B"
              value={bId}
              onChange={(value) => setBId(toApiSlug(value))}
              exclude={[aId]}
              extraOptions={extraOptions}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="dd-card d-flex align-items-center gap-3" style={{ padding: 18 }}>
          <span className="spinner-border spinner-border-sm" aria-hidden="true" />
          <span className="dd-subtle" style={{ fontSize: 14 }}>
            두 정책의 차이점을 불러오는 중이에요.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="dd-card-soft" style={{ padding: 18, borderColor: "var(--dd-amber-200)" }}>
          <div className="d-flex align-items-center gap-2 mb-2" style={{ color: "var(--dd-amber)" }}>
            <Icon name="CircleAlert" size={17} />
            <strong style={{ fontSize: 15 }}>비교 결과를 불러오지 못했어요</strong>
          </div>
          <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
            {errorMessage}
          </p>
        </div>
      )}

      {!errorMessage && (
        <div className="row g-3">
          <div className="col-12 col-sm-6">
            <SummaryCard policy={policyA} slot="A" />
          </div>
          <div className="col-12 col-sm-6">
            <SummaryCard policy={policyB} slot="B" />
          </div>
        </div>
      )}

      {!errorMessage && policyA && policyB && (
        <div className="dd-card" style={{ padding: 18 }}>
          <div>
            <SectionTitle
              icon="TableProperties"
              title="항목별 비교"
              desc="지원 대상, 신청 방법, 제출 서류를 같은 기준으로 확인합니다."
            />
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span className="dd-pill dd-pill-stone">A · {policyA.name}</span>
            <span className="dd-pill dd-pill-stone">B · {policyB.name}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 720 }}>
              {(compareResult?.diff_table || []).map((row) => (
                <CompareRowCard key={row.field} row={row} />
              ))}
            </div>
          </div>
        </div>
      )}

      {!errorMessage && compareResult?.selection_guide && (
        <div className="dd-card" style={{ padding: 18 }}>
          <div className="d-flex align-items-start gap-3">
            <span className="dd-icon-tile dd-tile-amber" style={{ width: 42, height: 42, flex: "none" }}>
              <Icon name="Target" size={19} />
            </span>
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <strong style={{ fontSize: 15 }}>상황별 선택 가이드</strong>
                <span className="dd-pill dd-pill-amber">추천 기준</span>
              </div>
              <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.75 }}>
                {compareResult.selection_guide}
              </p>
            </div>
          </div>
        </div>
      )}

      {!errorMessage && relatedPolicies.length > 0 && (
        <div className="dd-card-soft" style={{ padding: 18 }}>
          <SectionTitle
            icon="Sparkles"
            title="함께 확인하면 좋은 정책"
            desc="비교한 정책과 조건이나 분야가 가까운 정책입니다."
          />
          <div className="row g-2">
            {relatedPolicies.map((policy) => (
              <div className="col-12 col-md-4" key={policy.slug || policy.policy_id}>
                <Link
                  href={`/policies/${policy.slug}`}
                  className="dd-card dd-card-hover text-decoration-none d-flex align-items-center gap-2 h-100"
                  style={{ padding: 12, color: "var(--dd-ink)" }}
                >
                  <span className="dd-icon-tile dd-tile-amber" style={{ width: 34, height: 34, borderRadius: 12, flex: "none" }}>
                    <Icon name="FileText" size={15} />
                  </span>
                  <span className="fw-semibold" style={{ fontSize: 13, lineHeight: 1.4 }}>
                    {policy.name}
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <DisclaimerNote />
    </div>
  );
}
