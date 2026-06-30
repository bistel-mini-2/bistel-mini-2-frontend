"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import SimilarPolicies from "@/app/components/SimilarPolicies";
import { useLiked } from "@/app/data/useLiked";
import policyApi from "@/apis/policyApi";
import eligibilityApi from "@/apis/eligibilityApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";

const AI_SUMMARY_POLL_INTERVAL_MS = 2500;
const AI_SUMMARY_MAX_POLLS = 30;
const AI_SUMMARY_WAITING_STATUSES = new Set(["READY", "PROCESSING"]);

const DETAIL_FALLBACK = "공식 안내에서 확인해 주세요.";
const SUMMARY_FALLBACK = "정책 상세 내용을 기준으로 요약을 준비 중이에요.";
const EVIDENCE_FALLBACK =
  "근거는 공식 안내의 지원 대상, 지원 내용, 신청 방법을 기준으로 확인해 주세요.";

const TABS = [
  { key: "target", label: "지원 대상", icon: "Users" },
  { key: "content", label: "지원 내용", icon: "Gift" },
  { key: "method", label: "신청 방법", icon: "ClipboardList" },
  { key: "cautions", label: "유의 사항", icon: "CircleAlert" },
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

const STATUS_LABELS = {
  AVAILABLE: "신청 가능",
  ONLINE_AVAILABLE: "온라인 신청 가능",
  OFFLINE_ONLY: "방문 신청",
  CLOSED: "신청 마감",
  UNKNOWN: "공식 안내 확인 필요",
};

const STAGE_LABELS = {
  pregnant: "임신·출산",
  newborn: "신생아",
  infant: "영유아",
  child: "아동",
  teen: "청소년",
  youth: "청년",
  young_adult: "청년",
  adult: "성인",
  senior: "노년",
  all: "모든 생애 단계",
};

const QUALITY_FLAG_LABELS = {
  condition_validation_adjusted: "세부 자격 조건은 담당 기관 안내와 함께 확인해 주세요.",
  review_required: "신청 전 대상 조건과 제출 서류를 한 번 더 확인해 주세요.",
  unsupported_condition: "자동으로 판단하기 어려운 조건이 있어 담당 기관 확인이 필요해요.",
  source_text_missing: "정책 원문에 세부 조건이 충분히 정리되어 있지 않을 수 있어요.",
  NEEDS_REVIEW: "세부 자격 조건은 담당 기관 안내와 함께 확인해 주세요.",
};

const GENERIC_CAUTION_PATTERNS = [
  /선정\s*기준은?\s*지원\s*대상.*참고/i,
  /공식\s*안내\s*확인\s*필요/i,
  /공식\s*안내에서\s*.*확인/i,
  /다시\s*확인해\s*주세요/i,
  /세부\s*조건은?\s*담당\s*기관\s*안내에서\s*확인/i,
  /정확한\s*신청\s*가능\s*여부/i,
];

const GENERIC_TARGET_PATTERNS = [
  /전\s*연령\s*대상입니다\.\s*세부\s*조건은?\s*공식\s*안내에서\s*함께\s*확인해\s*주세요\.?/i,
  /전\s*연령\s*대상$/i,
  /모든\s*생애\s*단계\s*대상$/i,
  /공식\s*안내에서\s*지원\s*대상을\s*확인해\s*주세요\.?/i,
];

const TARGET_KEYWORDS = [
  "지원대상",
  "지원 대상",
  "선정기준",
  "선정 기준",
  "대상",
  "가구",
  "아동",
  "영유아",
  "임산부",
  "산모",
  "장애",
  "입양",
  "돌봄",
  "질병",
  "사고",
  "보호자",
  "위기",
  "출산",
  "소득",
];

const INTERNAL_PATTERNS = [
  /\b(pregnant|newborn|infant|child|teen)\b/i,
  /condition_validation_adjusted|review_required|unsupported_condition|source_text_missing/i,
  /\b(field|operator|value|matching_strength)\b/i,
  /policy_condition_profile|condition_json|quality_flags/i,
  /SERVICE_FIELD|RULE_|INTERNAL|DEBUG|RAG chunk/i,
  /\b(null|undefined|NaN)\b/i,
  /^[A-Z_]{3,}$/,
  /^\s*[\[{].*[\]}]\s*$/,
];

function getPolicySlug(item) {
  return item?.slug || item?.policy_slug || item?.policy_id || item?.id || "";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBlank(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return Number.isNaN(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    return (
      trimmed === "" ||
      /^(null|undefined|NaN)$/i.test(trimmed) ||
      trimmed === "[]" ||
      trimmed === "{}"
    );
  }
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function looksInternal(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  return INTERNAL_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanText(value, fallback = "") {
  if (isBlank(value)) return fallback;
  if (Array.isArray(value)) {
    const joined = value.map((item) => cleanText(item)).filter(Boolean).join(", ");
    return joined || fallback;
  }
  if (isPlainObject(value)) {
    const candidate =
      value.display_text ||
      value.displayText ||
      value.label ||
      value.name ||
      value.title ||
      value.summary ||
      value.snippet ||
      value.content;
    return cleanText(candidate, fallback);
  }

  const text = String(value).replace(/\r\n/g, "\n").trim();
  if (!text || looksInternal(text)) return fallback;
  return text;
}

function splitTextItems(value) {
  if (isBlank(value)) return [];
  const items = Array.isArray(value)
    ? value
    : String(value).split(/\r?\n|(?:^|\s)[•·*-]\s+/);

  return items
    .map((item) => cleanText(item))
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function firstClean(values, fallback = DETAIL_FALLBACK) {
  for (const value of values) {
    const text = cleanText(value);
    if (text) return text;
  }
  return fallback;
}

function uniqueTexts(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = cleanText(value);
    if (!text) return false;
    const key = text.replace(/\s+/g, " ").trim().toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shortEvidencePhrase(value, limit = 70) {
  const text = cleanText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= limit) return text;
  return text.slice(0, limit).trim();
}

function formatCategory(item) {
  return [cleanText(item.category), cleanText(item.sub_category)]
    .filter(Boolean)
    .join(" / ");
}

function formatStageValue(value) {
  if (isBlank(value)) return "";
  if (Array.isArray(value)) {
    const labels = value.map(formatStageValue).filter(Boolean);
    return labels.length ? [...new Set(labels)].join(", ") : "";
  }
  const text = String(value).trim();
  return STAGE_LABELS[text] || cleanText(text);
}

function formatStage(item, conditionProfile) {
  if (item.all_age === true || conditionProfile?.all_age === true) {
    return "전 연령 대상";
  }

  return firstClean(
    [
      item.target_stage_display,
      item.life_stage_display,
      conditionProfile?.target_stage_display,
      conditionProfile?.life_stage_display,
      formatStageValue(item.target_stage || item.target_stages),
      formatStageValue(conditionProfile?.target_stage),
    ],
    ""
  );
}

function formatAge(item, conditionProfile) {
  if (item.all_age === true || conditionProfile?.all_age === true) {
    return "전 연령 대상";
  }
  return firstClean([item.display_age, conditionProfile?.display_age], "");
}

function formatAgeDisplay(ageText, stageText) {
  const values = uniqueTexts([ageText, stageText]);
  if (values.some((value) => /전\s*연령|모든\s*연령|모든\s*생애/.test(value))) {
    return "전 연령 대상";
  }
  if (values.length === 0) return DETAIL_FALLBACK;
  if (values.length === 1) return values[0];
  return values.join(" · ");
}

function formatStatus(status) {
  if (isBlank(status)) return "공식 안내 확인 필요";
  const value = String(status).trim();
  return STATUS_LABELS[value] || cleanText(value, "공식 안내 확인 필요");
}

function getConditionProfile(item) {
  return item.policy_condition_profile || item.condition_profile || null;
}

function isGenericTargetText(value) {
  const text = cleanText(value).replace(/\s+/g, " ").trim();
  if (!text) return true;
  return GENERIC_TARGET_PATTERNS.some((pattern) => pattern.test(text));
}

function splitCandidateSentences(value) {
  const text = cleanText(value).replace(/\r\n/g, "\n");
  if (!text) return [];

  return text
    .split(/(?<=[.!?。！？다요함음임됨)])\s+|\r?\n|[;；]/)
    .map((sentence) =>
      sentence
        .replace(/^\s*(?:\[?(?:지원대상|지원 대상|선정기준|선정 기준|대상자|조건|원문)\]?[:：]?)\s*/i, "")
        .replace(/^[•·*\-\s]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function extractTargetSectionsFromSource(value) {
  const text = cleanText(value).replace(/\r\n/g, "\n");
  if (!text) return [];

  const sections = [];
  let current = [];
  let collecting = false;
  const flush = () => {
    const section = current.join("\n").trim();
    if (section) sections.push(section);
    current = [];
  };

  text.split("\n").forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;
    const labelMatch = line.match(/^\[\s*([^\]]+)\s*\]\s*(.*)$/);
    if (labelMatch) {
      if (collecting) flush();
      const label = labelMatch[1].replace(/\s+/g, "");
      const rest = labelMatch[2].trim();
      collecting =
        ["지원대상", "선정기준", "대상자", "조건"].some((keyword) =>
          label.includes(keyword)
        ) && !label.includes("지원내용");
      if (collecting && rest) current.push(rest);
      return;
    }
    if (collecting) current.push(line);
  });

  if (collecting) flush();
  return sections;
}

function shortenTargetText(value, limit = 220) {
  const text = cleanText(value).replace(/\s+/g, " ").trim();
  if (!text || isGenericTargetText(text)) return "";
  if (text.length <= limit) return text;

  const sentence = splitCandidateSentences(text).find((item) =>
    TARGET_KEYWORDS.some((keyword) => item.includes(keyword))
  );
  const candidate = sentence || text;
  if (candidate.length <= limit) return candidate;

  const window = candidate.slice(0, limit).trim();
  const lastSentenceEnd = Math.max(
    window.lastIndexOf("다."),
    window.lastIndexOf("요."),
    window.lastIndexOf(".")
  );
  if (lastSentenceEnd >= 50) {
    return window.slice(0, lastSentenceEnd + 1).trim();
  }
  return `${window.replace(/[\s,.;:，。]+$/g, "")}...`;
}

function extractConditionSourceTexts(value) {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) return value.flatMap(extractConditionSourceTexts);
  if (!isPlainObject(value)) return [];

  const texts = [
    value.source_text,
    value.sourceText,
    value.text,
    value.description,
    value.note,
  ].filter(Boolean);

  return [
    ...texts,
    ...Object.values(value)
      .filter((item) => item && typeof item === "object")
      .flatMap(extractConditionSourceTexts),
  ];
}

function firstSpecificTarget(values) {
  for (const value of values) {
    const text = shortenTargetText(value);
    if (text && !isGenericTargetText(text)) return text;
  }
  return "";
}

const LOW_VALUE_BENEFIT_PATTERNS = [
  /^(?:\d{4}년도\s*)?지원\s*단가는?\s*(?:아래|다음)과\s*같습니다\.?$/i,
  /^지원\s*내용은?\s*(?:아래|다음)과\s*같습니다\.?$/i,
  /^(?:아래|다음)\s*(?:표|내용)을?\s*참고/i,
  /^세부\s*내용은?\s*확인이?\s*필요/i,
  /^공식\s*안내에서\s*확인/i,
];

function cleanBenefitLine(value) {
  return cleanText(value)
    .replace(/\s+/g, " ")
    .replace(/^[?◈•·*\-\s]+/, "")
    .trim();
}

function isLowValueBenefitText(value) {
  const text = cleanBenefitLine(value);
  if (!text) return true;
  if (
    /(?:아래|다음)(?:와\s*같|과\s*같|의\s*표|의\s*내용|을?\s*참고)/.test(text) &&
    !/[0-9][0-9,]*(?:원|만원|천원|%)/.test(text)
  ) {
    return true;
  }
  return LOW_VALUE_BENEFIT_PATTERNS.some((pattern) => pattern.test(text));
}

function stripLowValueBenefitPrefix(value) {
  let text = cleanBenefitLine(value);
  text = text
    .replace(
      /^(?:\d{4}년도\s*)?지원\s*단가는?\s*(?:아래|다음)(?:와|과)\s*같습니다\.?\s*\/?\s*/,
      ""
    )
    .trim();
  if (/[0-9][0-9,]*(?:원|만원|천원|%)/.test(text)) {
    text = text
      .replace(
        /^.{0,90}?(?:아래|다음)(?:와|과)\s*같이\s*(?:차등\s*)?지원합니다\.?\s*\/?\s*/,
        ""
      )
      .trim();
  }
  return text.replace(/^[\s,.;:/]+|[\s,.;:/]+$/g, "");
}

function benefitSpecificityScore(value) {
  const text = cleanBenefitLine(value);
  if (!text || looksInternal(text)) return 0;
  let score = 0;
  if (/[0-9][0-9,]*(?:원|만원|천원|%)/.test(text)) score += 4;
  if (/(월|연간|최대|한도|회당|일당|시간당)\s*[0-9]/.test(text)) score += 3;
  if (/[0-9]\s*(?:세|개월|년|회|시간)/.test(text)) score += 2;
  if (/(지원|제공|지급|감면|서비스|급여|이용권|바우처)/.test(text)) score += 2;
  if (text.length >= 60) score += 1;
  if (isLowValueBenefitText(text)) score -= 5;
  return score;
}

function normalizeBenefitText(value, limit = 6) {
  if (isBlank(value)) return "";
  const rawItems = Array.isArray(value)
    ? value
    : String(value).replace(/\r\n/g, "\n").split(/\n+|(?<=다\.)\s+(?=\S)/);
  const lines = rawItems
    .map(cleanBenefitLine)
    .filter(Boolean)
    .filter((line) => !looksInternal(line));
  const meaningful = lines.filter((line) => !isLowValueBenefitText(line));
  const selected = meaningful.length > 0 ? meaningful : lines;
  const deduped = uniqueTexts(selected.map(stripLowValueBenefitPrefix).filter(Boolean));
  return deduped.slice(0, limit).join("\n");
}

function getTargetText(item, conditionProfile) {
  const stage = formatStage(item, conditionProfile);
  const age = formatAge(item, conditionProfile);
  const combined = [stage, age].filter(Boolean).join(" · ");
  const conditionJson =
    conditionProfile?.condition_json ||
    conditionProfile?.conditionJson ||
    item.condition_profile_json;
  const specificTarget = firstSpecificTarget([
    ...extractTargetSectionsFromSource(conditionProfile?.source_text),
    ...extractTargetSectionsFromSource(item.condition_profile_source_text),
    conditionProfile?.target_summary,
    item.condition_profile_target_summary,
    item.target_summary,
    ...extractConditionSourceTexts(conditionJson),
    item.target_description,
    item.conditions,
    combined,
  ]);

  if (specificTarget) return specificTarget;

  if (item.all_age === true || conditionProfile?.all_age === true) {
    return "전 연령 대상입니다. 세부 조건은 공식 안내에서 함께 확인해 주세요.";
  }
  return "공식 안내에서 지원 대상을 확인해 주세요.";
}

function getBenefitText(item) {
  const summaryCandidates = [
    item.benefit_summary_display,
    item.benefit_summary,
  ]
    .map((value) => normalizeBenefitText(value, 3))
    .filter(Boolean);
  const detailCandidates = [
    item.benefit_description,
    item.benefit,
  ]
    .map((value) => normalizeBenefitText(value))
    .filter(Boolean);
  const fallbackCandidates = [item.summary]
    .map((value) => normalizeBenefitText(value, 2))
    .filter(Boolean);

  const bestSummary = summaryCandidates.find((value) => !isLowValueBenefitText(value));
  const bestDetail = detailCandidates.find(Boolean);

  if (
    bestDetail &&
    (!bestSummary ||
      benefitSpecificityScore(bestDetail) > benefitSpecificityScore(bestSummary))
  ) {
    return bestDetail;
  }
  if (bestSummary) return bestSummary;
  if (bestDetail) return bestDetail;
  return (
    fallbackCandidates.find(Boolean) ||
    "이 정책은 대상자의 상황에 따라 서비스 또는 비용 지원을 제공하는 정책입니다. 세부 지원 금액과 기준은 공식 안내에서 확인해 주세요."
  );
}

function getApplicationSummary(item) {
  return firstClean([
    item.application_summary,
    item.application_method,
    item.how_to_apply,
    item.official_url ? "공식 안내에서 신청 방법을 확인해 주세요." : "",
  ]);
}

function formatPeriod(value) {
  const text = cleanText(value);
  if (!text) return DETAIL_FALLBACK;
  if (/^\d{1,4}$/.test(text) || /Invalid Date/i.test(text)) return DETAIL_FALLBACK;
  return text;
}

function buildMethodSections(item) {
  const responsibleAgency = getResponsibleAgency(item);
  return [
    {
      label: "신청 방법",
      icon: "ClipboardCheck",
      value: getApplicationSummary(item),
    },
    {
      label: "신청 기간",
      icon: "CalendarDays",
      value: formatPeriod(item.application_period_text || item.application_period),
    },
    {
      label: "문의처",
      icon: "Phone",
      value: firstClean([item.contact, responsibleAgency], DETAIL_FALLBACK),
    },
    {
      label: "필요 서류",
      icon: "FileText",
      value: firstClean([item.required_documents, item.documents], DETAIL_FALLBACK),
    },
  ];
}

function getResponsibleAgency(item) {
  const policyName = cleanText(item.policy_name || item.name || item.title);
  const candidates = [
    item.ministry,
    item.department,
    item.department_name,
    item.agency_name,
    item.provider_name,
    item.provider,
    item.organization,
    item.organization_name,
    item.responsible_agency,
    item.responsibleAgency,
    item.agency,
  ];

  for (const value of candidates) {
    const text = cleanText(value);
    if (!text || text === policyName) continue;
    return text;
  }
  return "";
}

function isGenericCaution(value) {
  const text = cleanText(value).replace(/\s+/g, " ").trim();
  if (!text) return true;
  return GENERIC_CAUTION_PATTERNS.some((pattern) => pattern.test(text));
}

function extractCautionText(value) {
  if (isBlank(value)) return "";
  if (isPlainObject(value)) {
    return extractCautionText(
      value.text ||
        value.display_text ||
        value.displayText ||
        value.message ||
        value.content ||
        value.source_text
    );
  }

  let text = String(value).replace(/\r\n/g, "\n").trim();
  const psObjectMatch = text.match(/(?:^|[;{]\s*)text=([^;}]*)/i);
  if (psObjectMatch) {
    text = psObjectMatch[1];
  }
  text = text
    .replace(/\s*(?:reason|source_text|field|operator|matching_strength)=.*$/i, "")
    .replace(/^[•·*\-\s]+/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s\-:;,.]+|[\s\-:;,.]+$/g, "");

  if (!text || looksInternal(text) || isGenericCaution(text)) return "";
  return text;
}

function collectConditionCautions(conditionProfile) {
  const conditionJson = conditionProfile?.condition_json || conditionProfile?.conditionJson;
  if (!isPlainObject(conditionJson)) return [];

  const candidates = [
    conditionJson.exclusions,
    conditionJson.special_notes,
    conditionJson.cautions,
    conditionJson.warnings,
    conditionJson.notes,
  ];

  return candidates
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map(extractCautionText)
    .filter(Boolean);
}

function buildCautions(item, conditionProfile) {
  const cautions = splitTextItems(item.caution || item.cautions)
    .map(extractCautionText)
    .filter(Boolean);
  const conditionCautions = collectConditionCautions(conditionProfile);
  const flags = Array.isArray(item.quality_flags)
    ? item.quality_flags
    : Array.isArray(conditionProfile?.quality_flags)
      ? conditionProfile.quality_flags
      : [];

  const flagMessages = flags
    .map((flag) => QUALITY_FLAG_LABELS[flag] || "")
    .filter(Boolean);

  if (conditionProfile?.review_required === true && cautions.length + conditionCautions.length === 0) {
    flagMessages.push("신청 전 지원 대상과 제출 서류를 다시 확인해 주세요.");
  }

  const realCautions = [...cautions, ...conditionCautions]
    .filter(Boolean)
    .filter((item) => !looksInternal(item) && !isGenericCaution(item));

  const safeFlags = flagMessages
    .filter(Boolean)
    .filter((item) => !looksInternal(item) && !isGenericCaution(item));
  const defaults = [
    "신청 전 대상 조건, 신청 기간, 제출 서류를 한 번에 확인해 주세요.",
    "거주지나 담당 기관 기준에 따라 세부 절차가 달라질 수 있어요.",
  ];

  const fallback = realCautions.length > 0 ? [] : [...safeFlags, ...defaults];
  return uniqueTexts([...realCautions, ...fallback]).slice(0, realCautions.length > 0 ? 5 : 2);
}

function buildEvidenceFromPolicy(policy, conditionProfile) {
  const basis = [];
  if (cleanText(policy.targetSummary || conditionProfile?.target_summary)) {
    basis.push(`지원 대상 안내에 "${shortEvidencePhrase(policy.targetSummary || conditionProfile?.target_summary)}" 내용이 있어 대상 정보를 이렇게 정리했어요.`);
  }
  if (cleanText(policy.benefitText)) {
    basis.push(`지원 내용에 "${shortEvidencePhrase(policy.benefitText)}" 내용이 있어 핵심 혜택으로 요약했어요.`);
  }
  if (cleanText(policy.applicationSummary)) {
    basis.push(`신청 안내에 "${shortEvidencePhrase(policy.applicationSummary)}" 내용이 있어 신청 전 확인할 부분으로 정리했어요.`);
  }
  if (conditionProfile?.review_required === true) {
    basis.push("일부 조건은 정책 원문에서 추가 확인이 필요해요.");
  }
  return basis.length ? basis : [EVIDENCE_FALLBACK];
}

function toPolicyDetail(item = {}, policySlug) {
  const conditionProfile = getConditionProfile(item);
  const targetText = getTargetText(item, conditionProfile);
  const benefitText = getBenefitText(item);
  const applicationSummary = getApplicationSummary(item);
  const stageText = formatStage(item, conditionProfile);
  const ageText = formatAge(item, conditionProfile);
  const category = formatCategory(item);

  return {
    id: getPolicySlug(item) || policySlug,
    policyId: item.policy_id,
    name: firstClean([item.policy_name, item.name, item.title], "정책명 확인 필요"),
    icon: CATEGORY_ICONS[item.category] || "Sparkles",
    tag: cleanText(item.category, "복지 정책"),
    category: category || cleanText(item.category, "분야 확인 필요"),
    status: formatStatus(item.application_status || item.status),
    agency: getResponsibleAgency(item),
    contact: firstClean([item.contact, getResponsibleAgency(item)], DETAIL_FALLBACK),
    url: cleanText(item.official_url, ""),
    targetText,
    benefitText,
    applicationSummary,
    stageText,
    ageText,
    easySummary: firstClean(
      [
        item.easy_summary,
        item.ai_summary,
        item.summary,
        item.benefit_summary_display,
        item.benefit_summary,
      ],
      SUMMARY_FALLBACK
    ),
    methodSections: buildMethodSections(item),
    cautions: buildCautions(item, conditionProfile),
    conditionProfile,
    evidenceBasis: buildEvidenceFromPolicy(
      { targetSummary: targetText, benefitText, applicationSummary },
      conditionProfile
    ),
  };
}

function getAiSummaryPayload(response) {
  if (response?.data && typeof response.data === "object") {
    return response.data;
  }
  return response || {};
}

function normalizeAiSummaryStatus(status, summary) {
  const value = String(status || "").trim().toUpperCase();

  if (["COMPLETED", "COMPLETE", "DONE", "SUCCESS", "SUCCEEDED"].includes(value)) {
    return "COMPLETED";
  }
  if (["FAILED", "FAILURE", "ERROR"].includes(value)) {
    return "FAILED";
  }
  if (["READY", "PROCESSING", "PENDING", "RUNNING", "LOADING"].includes(value)) {
    return "PROCESSING";
  }
  return summary ? "COMPLETED" : "PROCESSING";
}

function getAiSummaryData(payload) {
  const rawSummary =
    payload?.easy_summary ||
    payload?.ai_summary ||
    payload?.summary ||
    payload?.data?.summary ||
    null;

  const rawEvidences =
    payload?.evidences ||
    payload?.evidence ||
    payload?.evidence_chunks ||
    payload?.data?.evidences ||
    [];

  if (rawSummary && typeof rawSummary === "object" && !Array.isArray(rawSummary)) {
    return {
      ...rawSummary,
      easy_summary: rawSummary.easy_summary || rawSummary.ai_summary || rawSummary.summary,
      evidences: rawSummary.evidences || rawSummary.evidence || rawSummary.evidence_chunks || rawEvidences,
    };
  }

  if (rawSummary || payload?.key_points || rawEvidences) {
    return {
      ...payload,
      easy_summary: cleanText(rawSummary, ""),
      evidences: rawEvidences,
    };
  }

  return null;
}

function getSummaryTextItems(value) {
  if (isBlank(value)) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return cleanText(item);
        return cleanText([item?.label, item?.content].filter(Boolean).join(": "));
      })
      .filter(Boolean);
  }

  return String(value)
    .split(/\r?\n/)
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function hasCutOffText(value) {
  return /\.{3}|…/.test(String(value || ""));
}

function looksRawSourceText(value) {
  const text = String(value || "");
  return (
    looksInternal(text) ||
    hasCutOffText(text) ||
    /\[(정책명|대분류|하위분류|급여유형|OpenAPI|DB|원문|근거|출처|관련주제)\]/i.test(text) ||
    /OpenAPI|source_text|raw_|chunk|RAG/i.test(text)
  );
}

function looksGenericEvidence(value) {
  const text = String(value || "").trim();
  return [
    "공식 안내의 지원 대상 기준을 바탕으로 정리했어요.",
    "정책 상세 안내에 포함된 지원 내용을 기준으로 요약했어요.",
    "신청 방법과 제출 서류는 공식 안내 문구를 기준으로 정리했어요.",
    "공식 안내의 지원 대상 조건을 기준으로 확인했습니다.",
    "정책 상세 안내에 포함된 지원 내용을 기준으로 정리했습니다.",
    "신청 방법과 신청 전 확인사항은 공식 안내 문구를 기준으로 요약했습니다.",
    "정책 상세 안내에 있는 대상, 혜택, 신청 정보를 읽기 쉬운 문장으로 정리했어요.",
  ].includes(text);
}

function safeSummaryValue(value, fallback = "") {
  const text = cleanText(value);
  if (!text || looksRawSourceText(text)) return fallback;
  return text;
}

function looksGenericSummaryLine(value) {
  return /의 핵심 지원 내용을 간단히 정리했어요\.?$/.test(cleanText(value));
}

function normalizeSummaryText(value) {
  return getSummaryTextItems(value)
    .filter((line) => !looksGenericSummaryLine(line) && !looksRawSourceText(line))
    .join("\n");
}

function buildFriendlySummary(summary, policy, keyPoints) {
  const direct = firstClean(
    [
      normalizeSummaryText(summary?.easy_summary),
      normalizeSummaryText(summary?.ai_summary),
      normalizeSummaryText(summary?.summary),
      safeSummaryValue(keyPoints.join("\n")),
    ],
    ""
  );

  if (direct) return direct;

  const lines = [
    looksGenericSummaryLine(policy.easySummary) ? "" : safeSummaryValue(policy.easySummary),
    safeSummaryValue(policy.targetText)
      ? `지원 대상: ${policy.targetText}`
      : "",
    safeSummaryValue(policy.benefitText)
      ? `지원 내용: ${policy.benefitText}`
      : "",
    safeSummaryValue(policy.applicationSummary)
      ? `신청 전 확인: ${policy.applicationSummary}`
      : "",
  ].filter(Boolean);

  return lines.length ? lines.join("\n") : SUMMARY_FALLBACK;
}

function normalizeEvidenceItems(summary, policy) {
  const explicitEvidence = [
    summary?.evidences,
    summary?.evidence,
    summary?.evidence_chunks,
  ]
    .flatMap((value) => {
      if (isBlank(value)) return [];
      return Array.isArray(value) ? value : [value];
    })
    .map((item) => {
      if (typeof item === "string") return cleanText(item);
      if (isPlainObject(item)) {
        return cleanText(
          item.display_text || item.displayText || item.user_text || item.summary,
          ""
        );
      }
      return "";
    })
    .filter((text) => text && !looksRawSourceText(text) && !looksGenericEvidence(text));

  if (explicitEvidence.length > 0) {
    return [...new Set(explicitEvidence)];
  }

  return policy.evidenceBasis;
}

function truncateReferenceText(value, limit = 180) {
  const text = cleanText(value).replace(/\s+/g, " ").trim();
  if (!text || looksRawSourceText(text)) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).replace(/[\s,.;:，。]+$/g, "")}...`;
}

function buildReferenceItems(summary, policy) {
  const baseItems = [
    { label: "지원 대상", value: policy.targetText },
    { label: "지원 내용", value: policy.benefitText },
    { label: "신청 방법", value: policy.applicationSummary },
    { label: "유의 사항", value: Array.isArray(policy.cautions) ? policy.cautions[0] : "" },
    { label: "공식 안내", value: policy.url ? "공식 안내 페이지에서 세부 내용을 확인할 수 있어요." : "" },
  ]
    .map((item) => ({
      ...item,
      value: truncateReferenceText(item.value),
    }))
    .filter((item) => item.value && item.value !== DETAIL_FALLBACK);

  const labels = new Set(baseItems.map((item) => item.label));
  const evidenceItems = normalizeEvidenceItems(summary || {}, policy)
    .map((item) => truncateReferenceText(item))
    .filter(Boolean)
    .filter((item) => !looksGenericEvidence(item))
    .filter((item) => !baseItems.some((baseItem) => baseItem.value === item))
    .slice(0, Math.max(0, 5 - baseItems.length))
    .map((item) => ({ label: labels.has("공식 안내") ? "참고 내용" : "공식 안내", value: item }));

  return uniqueTexts([...baseItems, ...evidenceItems].map((item) => item.value))
    .map((value) => [...baseItems, ...evidenceItems].find((item) => item.value === value))
    .filter(Boolean)
    .slice(0, 5);
}

function PolicyAiSummarySection({
  status,
  summary,
  policy,
  errorMessage,
  canRetry,
  onRetry,
}) {
  const isWaiting = AI_SUMMARY_WAITING_STATUSES.has(status);
  const isFailed = status === "FAILED";
  const keyPoints = getSummaryTextItems(summary?.key_points).slice(0, 3);
  const summaryText = buildFriendlySummary(summary || {}, policy, keyPoints);
  const referenceItems = buildReferenceItems(summary || {}, policy);

  return (
    <section
      className="dd-card-soft mt-4"
      style={{ padding: 22, border: "1px solid var(--dd-green-200)" }}
      aria-live="polite"
    >
      <div className="d-flex align-items-center justify-content-between gap-2 mb-3 flex-wrap">
        <span className="dd-pill dd-pill-green">
          <Icon name="Sparkles" size={13} /> AI 쉬운 요약
        </span>
        {isFailed && canRetry && (
          <button
            type="button"
            className="dd-btn dd-btn-ghost dd-btn-sm"
            onClick={onRetry}
          >
            <Icon name="RefreshCcw" size={14} /> 다시 시도
          </button>
        )}
      </div>

      {isWaiting && (
        <div className="d-flex align-items-center gap-3">
          <span className="dd-analysis-loader" style={{ width: 36, height: 36 }}>
            <Icon name="LoaderCircle" size={18} />
          </span>
          <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7 }}>
            정책 내용을 정리하고 있어요. 잠시 후 다시 확인해 주세요.
          </p>
        </div>
      )}

      {isFailed && (
        <p className="mb-0" role="alert" style={{ fontSize: 14, color: "var(--dd-coral)", lineHeight: 1.7 }}>
          <Icon name="CircleAlert" size={14} />{" "}
          {errorMessage || "요약을 불러오지 못했어요. 기본 정책 정보를 확인해 주세요."}
        </p>
      )}

      {!isWaiting && !isFailed && (
        <>
          <div className="mb-3">
            <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-700, #44403c)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
              {summaryText}
            </p>
          </div>

          <p className="mb-2" style={{ fontSize: 13, color: "var(--dd-stone-500)", lineHeight: 1.6 }}>
            이 요약은 공식 안내와 정책 상세 정보를 바탕으로 쉽게 정리했어요.
          </p>

          {referenceItems.length > 0 && (
            <details className="dd-summary-reference">
              <summary className="dd-summary-reference-toggle">
                <span className="dd-summary-reference-closed">참고한 정보 보기</span>
                <span className="dd-summary-reference-open">참고한 정보 접기</span>
                <Icon name="ChevronDown" size={14} className="dd-summary-reference-chevron" />
              </summary>
              <div className="dd-summary-reference-body">
                <p className="dd-summary-reference-title">AI가 참고한 정보</p>
                <ul className="dd-summary-reference-list">
                  {referenceItems.map((item) => (
                    <li key={`${item.label}-${item.value}`}>
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const policySlug = String(id || "");
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(policySlug));
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState("target");
  const [summaryRetryKey, setSummaryRetryKey] = useState(0);
  const [eligibilityPending, setEligibilityPending] = useState(false);
  const [eligibilityError, setEligibilityError] = useState("");
  const [aiSummaryState, setAiSummaryState] = useState({
    status: "READY",
    summary: null,
    errorMessage: "",
    canRetry: false,
  });
  const {
    has: isLiked,
    toggle: toggleLike,
    pendingIds,
    error: favoriteError,
    syncFromPolicy,
  } = useLiked();

  useEffect(() => {
    if (!policySlug) return;

    const controller = new AbortController();

    async function loadPolicy() {
      setLoading(true);
      setLoadError("");
      try {
        const response = await policyApi.getPolicyDetail(policySlug, {
          signal: controller.signal,
        });
        syncFromPolicy(response);
        setPolicy(toPolicyDetail(response, policySlug));
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
          setPolicy(null);
          setLoadError(
            getApiErrorMessage(requestError, "정책 정보를 불러오지 못했어요.")
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadPolicy();
    return () => controller.abort();
  }, [policySlug, retryKey, syncFromPolicy]);

  const aiSummarySlug = policy?.id || policySlug;

  useEffect(() => {
    if (!aiSummarySlug) return;

    const controller = new AbortController();
    let pollCount = 0;
    let timerId = null;

    async function loadAiSummary() {
      setAiSummaryState((current) => ({
        ...current,
        status: current.summary ? current.status : "PROCESSING",
        errorMessage: "",
        canRetry: false,
      }));

      try {
        const response = await policyApi.getPolicyAiSummary(aiSummarySlug, {
          signal: controller.signal,
        });
        const payload = getAiSummaryPayload(response);
        const summary = getAiSummaryData(payload);
        const status = normalizeAiSummaryStatus(payload.status || summary?.status, summary);

        if (controller.signal.aborted) return;

        setAiSummaryState({
          status,
          summary: status === "COMPLETED" ? summary : null,
          errorMessage: "",
          canRetry: false,
        });

        if (AI_SUMMARY_WAITING_STATUSES.has(status)) {
          if (pollCount < AI_SUMMARY_MAX_POLLS) {
            pollCount += 1;
            timerId = window.setTimeout(loadAiSummary, AI_SUMMARY_POLL_INTERVAL_MS);
          } else {
            setAiSummaryState({
              status: "FAILED",
              summary: null,
              errorMessage:
                "요약을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
              canRetry: true,
            });
          }
        }
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED" &&
          !controller.signal.aborted
        ) {
          setAiSummaryState({
            status: "FAILED",
            summary: null,
            errorMessage: getApiErrorMessage(
              requestError,
              "요약을 불러오지 못했어요. 기본 정책 정보를 확인해 주세요."
            ),
            canRetry: true,
          });
        }
      }
    }

    loadAiSummary();

    return () => {
      controller.abort();
      if (timerId) window.clearTimeout(timerId);
    };
  }, [aiSummarySlug, summaryRetryKey]);

  const likeSlug = policy?.id || policySlug;
  const liked = isLiked(likeSlug);

  const infoRows = useMemo(() => {
    if (!policy) return [];
    return [
      { label: "담당 부처", value: policy.agency || "공식 안내에서 확인" },
      { label: "분야", value: policy.category },
      { label: "지원 대상", value: policy.targetText },
      { label: "연령", value: formatAgeDisplay(policy.ageText, policy.stageText) },
      { label: "신청 안내", value: policy.status },
      { label: "문의처", value: policy.contact },
    ].filter((row) => cleanText(row.value));
  }, [policy]);

  const renderMethodTab = () => (
    <div className="row g-3">
      {policy.methodSections.map((section) => (
        <div className="col-12 col-md-6" key={section.label}>
          <div className="dd-card-soft h-100" style={{ padding: 16 }}>
            <p className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ fontSize: 14, color: "var(--dd-ink)" }}>
              <Icon name={section.icon} size={15} /> {section.label}
            </p>
            <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {section.value}
            </p>
          </div>
        </div>
      ))}
      {policy.url && (
        <div className="col-12">
          <a href={policy.url} target="_blank" rel="noreferrer" className="dd-btn dd-btn-coral dd-btn-sm">
            <Icon name="ExternalLink" size={15} /> 공식 안내 바로가기
          </a>
        </div>
      )}
    </div>
  );

  const renderTab = () => {
    if (!policy) return null;

    if (tab === "method") return renderMethodTab();

    if (tab === "cautions") {
      return (
        <ul className="mb-0 ps-3" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8 }}>
          {policy.cautions.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    }

    const tabText = tab === "target" ? policy.targetText : policy.benefitText;
    return (
      <p className="mb-0" style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {tabText}
      </p>
    );
  };

  const handleEligibility = async () => {
    if (!likeSlug || eligibilityPending) return;

    setEligibilityPending(true);
    setEligibilityError("");

    try {
      const response = await eligibilityApi.createRequest({
        policyId: likeSlug,
        sourceType: "POLICY_DETAIL",
        sourceRefId: likeSlug,
      });
      const eligibilityRequestId = response?.request_id || response?.requestId;

      if (!eligibilityRequestId) {
        throw new Error("분석 요청 번호를 받지 못했어요.");
      }

      const params = new URLSearchParams({
        requestId: String(eligibilityRequestId),
        source: "policy-detail",
      });

      router.push(
        `/policies/${encodeURIComponent(likeSlug)}/eligibility?${params.toString()}`
      );
    } catch (error) {
      if (error?.status === 401) {
        const params = new URLSearchParams({
          next: `/policies/${encodeURIComponent(likeSlug)}`,
        });
        router.push(`/login?${params.toString()}`);
        return;
      }

      setEligibilityError(
        getApiErrorMessage(error, "지원 가능성 분석 요청을 시작하지 못했어요.")
      );
    } finally {
      setEligibilityPending(false);
    }
  };

  if (loading) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 60, textAlign: "center" }}>
          <p className="dd-subtle">정책 정보를 불러오는 중이에요.</p>
        </main>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="dd-page">
        <Header />
        <main className="dd-shell" style={{ paddingTop: 60, textAlign: "center" }}>
          <p className="mb-3" style={{ color: "var(--dd-coral)" }}>
            <Icon name="CircleAlert" size={15} />{" "}
            {loadError || "정책을 찾을 수 없어요."}
          </p>
          {loadError && (
            <button
              type="button"
              className="dd-btn dd-btn-ghost dd-btn-sm me-2"
              onClick={() => setRetryKey((current) => current + 1)}
            >
              다시 시도
            </button>
          )}
          <Link href="/policies" className="dd-link">
            정책 목록으로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 24, paddingBottom: 64 }}>
        <Link href="/policies" className="dd-subtle d-inline-flex align-items-center gap-1 text-decoration-none mb-3" style={{ fontSize: 14 }}>
          <Icon name="ArrowLeft" size={15} /> 정책 목록
        </Link>

        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <div className="d-flex align-items-start gap-3 min-w-0">
            <span className="dd-icon-tile dd-tile-rose" style={{ width: 56, height: 56, flex: "none" }}>
              <Icon name={policy.icon} size={28} />
            </span>
            <div className="min-w-0">
              <h1 className="dd-title" style={{ fontSize: 28, wordBreak: "keep-all", overflowWrap: "anywhere" }}>
                {policy.name}
              </h1>
              <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
                <span className="dd-pill dd-pill-coral">{policy.tag}</span>
                <span className="dd-pill dd-pill-green"><Icon name="BadgeCheck" size={13} /> {policy.status}</span>
                {policy.stageText && <span className="dd-pill dd-pill-blue">{policy.stageText}</span>}
              </div>
            </div>
          </div>
          <button
            type="button"
            className={"dd-btn dd-btn-sm " + (liked ? "dd-btn-coral" : "dd-btn-ghost")}
            onClick={() => toggleLike(likeSlug)}
            disabled={pendingIds.includes(likeSlug)}
            style={{ flex: "none" }}
            aria-pressed={liked}
            aria-label={liked ? "관심 정책 해제" : "관심 정책 추가"}
          >
            <Icon name="Heart" size={16} fill={liked ? "currentColor" : "none"} />
            {liked ? "관심 정책" : "관심 등록"}
          </button>
        </div>

        {favoriteError && (
          <p className="dd-disclaimer mt-3 mb-0" style={{ color: "var(--dd-coral)" }}>
            <Icon name="CircleAlert" size={13} /> {favoriteError}
          </p>
        )}

        <div className="row g-4 mt-1">
          <div className="col-12 col-lg-8">
            <div className="dd-card" style={{ overflow: "hidden" }}>
              <table className="dd-table">
                <tbody>
                  {infoRows.map((row) => (
                    <tr key={row.label}>
                      <th>{row.label}</th>
                      <td style={{ color: "var(--dd-stone-600)", wordBreak: "break-word", whiteSpace: "pre-wrap" }}>{row.value}</td>
                    </tr>
                  ))}
                  {policy.url && (
                    <tr>
                      <th>공식 안내</th>
                      <td>
                        <a href={policy.url} target="_blank" rel="noreferrer" className="dd-link" style={{ overflowWrap: "anywhere" }}>
                          공식 안내 바로가기
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <PolicyAiSummarySection
              status={aiSummaryState.status}
              summary={aiSummaryState.summary}
              policy={policy}
              errorMessage={aiSummaryState.errorMessage}
              canRetry={aiSummaryState.canRetry}
              onRetry={() => setSummaryRetryKey((current) => current + 1)}
            />

            <div className="mt-4">
              <div className="dd-tabs">
                {TABS.map((tabItem) => (
                  <button
                    key={tabItem.key}
                    type="button"
                    className={"dd-tab" + (tab === tabItem.key ? " is-active" : "")}
                    onClick={() => setTab(tabItem.key)}
                  >
                    <Icon name={tabItem.icon} size={14} /> {tabItem.label}
                  </button>
                ))}
              </div>
              <div className="dd-card mt-3" style={{ padding: 22 }}>
                <p className="fw-bold mb-2 d-flex align-items-center gap-2" style={{ fontSize: 15, color: "var(--dd-ink)" }}>
                  {TABS.find((tabItem) => tabItem.key === tab)?.label}
                </p>
                {renderTab()}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <SimilarPolicies
              policySlug={policy.id || policySlug}
              limit={3}
              title="함께 보면 좋은 정책"
              showEmpty
            />
          </div>
        </div>

        <div className="dd-card mt-4" style={{ padding: 22 }}>
          <p className="fw-bold mb-3" style={{ fontSize: 16, color: "var(--dd-ink)" }}>다음으로 무엇을 할까요?</p>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="dd-btn dd-btn-blue" onClick={handleEligibility} disabled={eligibilityPending}>
              <Icon name="ShieldCheck" size={17} /> 지원 가능성 분석
            </button>
            {policy.url && (
              <a href={policy.url} target="_blank" rel="noreferrer" className="dd-btn dd-btn-coral">
                <Icon name="ExternalLink" size={17} /> 공식 안내
              </a>
            )}
            <Link href="/chat" className="dd-btn dd-btn-ghost">
              <Icon name="MessageCircle" size={17} /> AI 채팅에 질문하기
            </Link>
          </div>
          {eligibilityError && (
            <p className="dd-disclaimer mt-3 mb-0" style={{ color: "var(--dd-coral)" }}>
              <Icon name="CircleAlert" size={13} /> {eligibilityError}
            </p>
          )}
          <div className="mt-3"><DisclaimerNote /></div>
        </div>
      </main>
    </div>
  );
}
