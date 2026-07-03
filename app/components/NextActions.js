"use client";

import Link from "next/link";
import Icon from "@/app/components/Icon";

const ACTION_META = {
  recommend: { label: "맞춤 추천 화면에서 자세히", short: "맞춤 추천", icon: "Target", variant: "coral" },
  eligibility: { label: "지원 가능성 자세히 분석", short: "지원 가능성 확인", icon: "ShieldCheck", variant: "blue" },
  compare: { label: "정책 비교 화면으로", short: "비슷한 정책 비교", icon: "GitCompare", variant: "amber" },
  apply: { label: "신청 준비 체크리스트", short: "신청 준비", icon: "HandHeart", variant: "green" },
  chat: { label: "AI 챗봇에 질문하기", short: "챗봇 질문", icon: "MessageCircle", variant: "blue" },
};

const defaultHref = (key, policySlug) => {
  switch (key) {
    case "recommend":
      return "/recommend";
    case "eligibility":
      return policySlug ? `/policies/${policySlug}/eligibility` : "/eligibility";
    case "compare":
      return "/compare";
    case "apply":
      return policySlug ? `/policies/${policySlug}/apply` : "/policies";
    case "chat":
      return "/chat";
    default:
      return "/";
  }
};

const normalizeAction = (action, index) => {
  if (typeof action === "string") {
    return { action, primary: index === 0 };
  }

  if (!action || typeof action !== "object") return null;

  return {
    ...action,
    action: action.action || action.key || action.type,
    primary: !!action.primary || index === 0,
  };
};

export default function NextActions({ actions = [], policySlug }) {
  const normalized = actions
    .map(normalizeAction)
    .filter((item) => item?.action && item.action !== "chat" && item.action !== "eligibility")
    .slice(0, 3)
    .map((item, index) => ({ ...item, primary: index === 0 }));

  if (normalized.length === 0) return null;

  return (
    <div className="dd-next-actions">
      {normalized.map((item, index) => {
        const key = item.action;
        const meta = ACTION_META[key] || { label: item.label || key, short: item.label || key, icon: "ArrowRight", variant: "blue" };
        const primary = item.primary || index === 0;
        const label = item.label || (primary ? meta.label : meta.short);
        const className = primary ? "dd-na-btn dd-na-coral" : `dd-na-btn dd-na-${meta.variant}`;

        return (
          <Link
            key={`${key}-${index}`}
            href={item.href || defaultHref(key, policySlug)}
            className={className}
          >
            <Icon name={meta.icon} size={15} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
