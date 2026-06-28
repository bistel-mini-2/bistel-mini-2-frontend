"use client";

// =========================================================================
// 도담 — "다음 액션" 버튼 세트
// 정책 상세/결과/챗봇 등에서 다음 행동을 제안.
//  - onAction(key) 가 있으면 버튼으로 동작(모달 열기 등)
//  - 없으면 기본 라우트로 이동하는 링크로 렌더(딥링크 가능)
// =========================================================================
import Link from "next/link";
import Icon from "@/app/components/Icon";
import { ACTION_META } from "@/app/data/constants";

function defaultHref(key, policyId) {
  switch (key) {
    case "eligibility":
      return policyId
        ? `/policies/${encodeURIComponent(policyId)}/eligibility?source=policy-detail`
        : "/recommend";
    case "apply":
      return policyId ? `/policies/${policyId}/apply` : "/policies";
    case "compare":
      return "/compare";
    case "chat":
      return "/chat";
    case "recommend":
      return "/recommend";
    default:
      return "/";
  }
}

export default function ActionButtons({
  actions = [],
  disabledActions = [],
  loadingActions = [],
  onAction,
  policyId,
  size,
}) {
  const cls = (variant) =>
    "dd-btn dd-btn-" + variant + (size === "sm" ? " dd-btn-sm" : "");

  return (
    <div className="d-flex flex-wrap gap-2">
      {actions.map((key) => {
        const meta = ACTION_META[key];
        if (!meta) return null;
        const inner = (
          <>
            <Icon name={meta.icon} size={size === "sm" ? 15 : 17} />
            {loadingActions.includes(key) ? "요청 중" : meta.label}
          </>
        );
        return onAction ? (
          <button
            key={key}
            type="button"
            className={cls(meta.variant)}
            disabled={disabledActions.includes(key)}
            onClick={() => onAction(key)}
          >
            {inner}
          </button>
        ) : (
          <Link key={key} href={defaultHref(key, policyId)} className={cls(meta.variant)}>
            {inner}
          </Link>
        );
      })}
    </div>
  );
}
