"use client";

import Link from "next/link";
import Icon from "@/app/components/Icon";

const REQUEST_STATUS = {
  READY: "READY",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FOLLOW_UP_REQUIRED: "FOLLOW_UP_REQUIRED",
  FAILED: "FAILED",
};

const STATUS_META = {
  ok: { label: "충족", pill: "dd-pill-green", icon: "Check" },
  check: { label: "추가 확인", pill: "dd-pill-amber", icon: "CircleAlert" },
  missing: { label: "추가 확인", pill: "dd-pill-amber", icon: "CircleAlert" },
  conflict: { label: "입력 충돌", pill: "dd-pill-amber", icon: "CircleAlert" },
  no: { label: "미충족", pill: "dd-pill-coral", icon: "X" },
};

const FIELD_LABELS = {
  region: "거주 지역",
  stage: "가족 구성",
  childAge: "자녀 연령대",
  child_age: "자녀 연령대",
  age: "자녀 연령대",
  household_member_age: "자녀 연령대",
  income: "가구 소득",
  income_level: "가구 소득",
  income_bracket: "가구 소득",
  median_income_percent: "기준중위소득",
  special: "특수 상황",
};

const VALUE_LABELS = {
  pregnant: "임신",
  newborn: "출산 직후",
  infant: "영유아",
  child: "아동",
  teen: "청소년",
  preborn: "출생 전",
  low: "중위소득 50% 이하",
  mid1: "중위소득 51~100%",
  mid2: "중위소득 101~150%",
  high: "중위소득 150% 초과",
  unknown: "잘 모르겠어요",
  seoul: "서울",
  gyeonggi: "경기",
  incheon: "인천",
  busan: "부산",
  daegu: "대구",
  daejeon: "대전",
  gwangju: "광주",
  ulsan: "울산",
  sejong: "세종",
  gangwon: "강원",
  chungbuk: "충북",
  chungnam: "충남",
  jeonbuk: "전북",
  jeonnam: "전남",
  gyeongbuk: "경북",
  gyeongnam: "경남",
  jeju: "제주",
  single: "한부모",
  multi: "다문화",
  disabled: "장애",
  many: "다자녀",
  dual: "맞벌이",
};

const getEligibilityUserStatus = (result) =>
  result?.user_status ||
  result?.userStatus ||
  result?.result?.user_status ||
  result?.result?.userStatus ||
  null;

const getQuestions = (eligibility) => {
  if (Array.isArray(eligibility?.questions)) return eligibility.questions;
  if (Array.isArray(eligibility?.result?.questions)) return eligibility.result.questions;
  if (Array.isArray(eligibility?.result?.follow_up_questions)) return eligibility.result.follow_up_questions;
  if (Array.isArray(eligibility?.result?.followUpQuestions)) return eligibility.result.followUpQuestions;
  return [];
};

const getQuestionText = (question) =>
  question?.question_text ||
  question?.questionText ||
  question?.question ||
  question?.text ||
  question?.prompt ||
  FIELD_LABELS[question?.field_name || question?.fieldName] ||
  "추가 정보";

const normalizeStatus = (status) => {
  const value = String(status || "check").toLowerCase();
  if (value === "needs_confirmation") return "check";
  if (value === "recommendable" || value === "matched" || value === "satisfied") return "ok";
  if (value === "not_match" || value === "difficult_to_recommend" || value === "failed") return "no";
  return STATUS_META[value] ? value : "check";
};

const getCriterionNote = (criterion) => {
  const note =
    criterion?.note ||
    criterion?.message ||
    criterion?.reason ||
    criterion?.description ||
    criterion?.policy_condition ||
    criterion?.policyCondition ||
    "";
  return String(note || "").trim();
};

const getCriterionText = (criterion, status) => {
  const note = getCriterionNote(criterion);
  if (note) return note;
  if (status === "ok") return "입력한 조건이 이 기준에 맞아요.";
  if (status === "no") return "입력한 조건이 이 기준과 맞지 않아요.";
  if (status === "conflict") return "입력값끼리 충돌해서 다시 확인이 필요해요.";
  return "정확한 판정을 위해 추가 확인이 필요해요.";
};

const getCriteria = (eligibility) => {
  const raw =
    eligibility?.result?.criteria ||
    eligibility?.criteria ||
    eligibility?.result?.criteria_results ||
    eligibility?.result?.criteriaResults ||
    [];

  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((criterion, index) => {
      const status = normalizeStatus(criterion?.status || criterion?.result || criterion?.user_status);
      return {
        key: criterion?.key || criterion?.field_name || criterion?.fieldName || criterion?.label || index,
        label:
          criterion?.label ||
          criterion?.title ||
          FIELD_LABELS[criterion?.field_name || criterion?.fieldName] ||
          "확인 항목",
        status,
        text: getCriterionText(criterion, status),
      };
    });
  }

  const matched = eligibility?.result?.matched_conditions || eligibility?.result?.matchedConditions || [];
  const missing = eligibility?.result?.missing_conditions || eligibility?.result?.missingConditions || [];
  const manual = eligibility?.result?.manual_check_points || eligibility?.result?.manualCheckPoints || [];

  return [
    ...matched.map((item, index) => ({
      key: `matched-${index}`,
      label: String(item),
      status: "ok",
      text: `${item} - 충족`,
    })),
    ...missing.map((item, index) => ({
      key: `missing-${index}`,
      label: String(item),
      status: "check",
      text: `${item} 확인이 더 필요해요.`,
    })),
    ...manual.map((item, index) => ({
      key: `manual-${index}`,
      label: String(item),
      status: "check",
      text: `${item}은 공식 기준이나 실제 상황 확인이 필요해요.`,
    })),
  ];
};

const normalizeInputValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeInputValue).filter(Boolean).join(", ");
  }

  const text = String(value || "").trim();
  return VALUE_LABELS[text] || text;
};

const getInputSummary = (eligibility) => {
  const source =
    eligibility?.result?.input_summary ||
    eligibility?.result?.inputSummary ||
    eligibility?.result?.user_conditions ||
    eligibility?.result?.userConditions ||
    eligibility?.userConditions ||
    {};

  if (!source || typeof source !== "object" || Array.isArray(source)) return [];

  return Object.entries(source)
    .map(([key, value]) => ({
      key,
      label: FIELD_LABELS[key] || key,
      value: normalizeInputValue(value),
    }))
    .filter((item) => item.value);
};

const getStatusCopy = (userStatus, status) => {
  if (status === REQUEST_STATUS.FAILED) {
    return {
      title: "분석을 완료하지 못했어요",
      summary: "잠시 후 다시 시도해 주세요.",
      tone: "danger",
    };
  }

  if (userStatus === "DIFFICULT_TO_RECOMMEND") {
    return {
      title: "지원 가능성이 낮아요",
      summary: "조건과 맞지 않는 항목이 있어요. 아래 비교 내용을 확인해 주세요.",
      tone: "danger",
    };
  }

  if (userStatus === "NEEDS_CONFIRMATION") {
    return {
      title: "추가 확인이 필요해요",
      summary: "일부 조건은 더 확인해야 정확히 판단할 수 있어요.",
      tone: "warn",
    };
  }

  return {
    title: "지원 가능성이 높아요",
    summary: "조건 대부분을 충족해요. 신청 준비를 시작해보세요.",
    tone: "success",
  };
};

export default function EligibilityCardChat({ eligibility, policySlug }) {
  if (!eligibility) return null;

  const isProcessing =
    eligibility.status === REQUEST_STATUS.PROCESSING ||
    eligibility.status === REQUEST_STATUS.READY;
  const userStatus = getEligibilityUserStatus(eligibility.result);
  const criteria = getCriteria(eligibility);
  const inputSummary = getInputSummary(eligibility);
  const questions = getQuestions(eligibility);
  const policyName = eligibility.policyName || eligibility.result?.policy_name || eligibility.result?.policyName || "정책";
  const statusCopy = getStatusCopy(userStatus, eligibility.status);
  const summary =
    eligibility.result?.summary ||
    eligibility.result?.reason_summary ||
    eligibility.result?.reasonSummary ||
    eligibility.error ||
    statusCopy.summary;
  const detailHref = policySlug ? `/policies/${policySlug}` : "/policies";
  const showActions = eligibility.status === REQUEST_STATUS.COMPLETED || eligibility.status === REQUEST_STATUS.FAILED;

  return (
    <div className="dd-elig-result-card">
      {isProcessing ? (
        <div className="dd-elig-result-loading">
          <span className="dd-analysis-loader" aria-hidden="true">
            <Icon name="LoaderCircle" size={20} />
          </span>
          <span>
            <strong>지원 가능성 확인 중</strong>
            <p>{eligibility.loadingMessage || "입력한 조건을 정책 기준과 비교하고 있어요."}</p>
          </span>
        </div>
      ) : (
        <>
          <div className={`dd-elig-result-banner is-${statusCopy.tone}`}>
            <span className="dd-elig-result-icon">
              <Icon name="ShieldCheck" size={28} />
            </span>
            <span className="dd-elig-result-copy">
              <strong>
                {policyName} <span>{statusCopy.title}</span>
              </strong>
              <p>{summary || statusCopy.summary}</p>
            </span>
          </div>

          <section className="dd-elig-result-section">
            <h3>
              <Icon name="ListChecks" size={17} />
              정책 조건과 내 입력 비교
            </h3>
            <div className="dd-elig-criteria-list">
              {criteria.length === 0 ? (
                <div className="dd-elig-criteria-item">
                  <strong>분석 항목</strong>
                  <p>조건 비교 결과를 불러오지 못했어요.</p>
                </div>
              ) : (
                criteria.map((criterion) => {
                  const meta = STATUS_META[criterion.status] || STATUS_META.check;
                  return (
                    <div key={criterion.key} className="dd-elig-criteria-item">
                      <span>
                        <strong>{criterion.label}</strong>
                        <p>{criterion.text}</p>
                      </span>
                      <span className={`dd-pill ${meta.pill}`}>
                        <Icon name={meta.icon} size={13} />
                        {meta.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {questions.length > 0 && eligibility.status === REQUEST_STATUS.FOLLOW_UP_REQUIRED && (
            <section className="dd-elig-result-section">
              <h3>
                <Icon name="CircleAlert" size={17} />
                추가 확인 필요
              </h3>
              <div className="dd-elig-criteria-list">
                {questions.map((question, index) => (
                  <div key={question.field_name || question.fieldName || index} className="dd-elig-criteria-item">
                    <span>
                      <strong>{getQuestionText(question)}</strong>
                      <p>{question.reason || question.message || "이 정보가 확인되면 더 정확히 판단할 수 있어요."}</p>
                    </span>
                    <span className="dd-pill dd-pill-amber">
                      <Icon name="CircleAlert" size={13} />
                      추가 확인
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {inputSummary.length > 0 && (
            <section className="dd-elig-result-section dd-elig-input-section">
              <h3>
                <Icon name="ClipboardCheck" size={17} />
                입력 조건 기준
              </h3>
              <div className="dd-elig-input-chips">
                {inputSummary.map((item) => (
                  <span key={item.key}>
                    {item.label} <strong>{item.value}</strong>
                  </span>
                ))}
              </div>
            </section>
          )}

          {showActions && (
            <div className="dd-elig-result-actions">
              <Link href={detailHref} className="dd-acc-btn dd-acc-coral">
                <Icon name="FileText" size={15} /> 정책 상세보기
              </Link>
              {policySlug && (
                <>
                  <Link href={`/policies/${policySlug}/eligibility`} className="dd-acc-btn dd-acc-ghost">
                    <Icon name="ShieldCheck" size={15} /> 지원 가능성 자세히 분석
                  </Link>
                  <Link href={detailHref} className="dd-acc-btn dd-acc-green">
                    <Icon name="FileText" size={15} /> 정책 요약
                  </Link>
                </>
              )}
              <Link href="/compare" className="dd-acc-btn dd-acc-amber">
                <Icon name="GitCompare" size={15} /> 비슷한 정책 비교
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
