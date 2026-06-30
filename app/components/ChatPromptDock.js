"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const getOptionLabel = (option) =>
  option?.label ||
  option?.name ||
  option?.policy_name ||
  option?.policyName ||
  option?.title ||
  option?.text ||
  String(option?.value || option?.policy_id || option?.policyId || option?.id || "");

const getOptionValue = (option) =>
  option?.value ||
  option?.policy_id ||
  option?.policyId ||
  option?.id ||
  option?.slug ||
  getOptionLabel(option);

const normalizeOptions = (options = []) =>
  options.map((opt) =>
    typeof opt === "string"
      ? { label: opt, value: opt }
      : { ...opt, label: getOptionLabel(opt), value: getOptionValue(opt) }
  );

const UNKNOWN_VALUE = "__UNKNOWN__";

const FIELD_OPTION_FALLBACKS = {
  stage: [
    { label: "임신 준비·임신 중", value: "pregnant" },
    { label: "출산 직후·신생아", value: "newborn" },
    { label: "영유아", value: "infant" },
    { label: "아동", value: "child" },
    { label: "청소년", value: "teen" },
  ],
  childAge: [
    { label: "출생 전", value: "preborn" },
    { label: "0세 (12개월 미만)", value: "0" },
    { label: "1세", value: "1" },
    { label: "2~5세", value: "2-5" },
    { label: "6~12세", value: "6-12" },
    { label: "13세 이상", value: "13+" },
  ],
  child_age: [
    { label: "출생 전", value: "preborn" },
    { label: "0세 (12개월 미만)", value: "0" },
    { label: "1세", value: "1" },
    { label: "2~5세", value: "2-5" },
    { label: "6~12세", value: "6-12" },
    { label: "13세 이상", value: "13+" },
  ],
  income: [
    { label: "중위소득 50% 이하", value: "low" },
    { label: "중위소득 51~100%", value: "mid1" },
    { label: "중위소득 101~150%", value: "mid2" },
    { label: "중위소득 150% 초과", value: "high" },
  ],
  region: [
    { label: "서울", value: "seoul" },
    { label: "경기", value: "gyeonggi" },
    { label: "인천", value: "incheon" },
    { label: "부산", value: "busan" },
    { label: "대구", value: "daegu" },
    { label: "대전", value: "daejeon" },
    { label: "광주", value: "gwangju" },
    { label: "울산", value: "ulsan" },
    { label: "세종", value: "sejong" },
    { label: "강원", value: "gangwon" },
    { label: "충북", value: "chungbuk" },
    { label: "충남", value: "chungnam" },
    { label: "전북", value: "jeonbuk" },
    { label: "전남", value: "jeonnam" },
    { label: "경북", value: "gyeongbuk" },
    { label: "경남", value: "gyeongnam" },
    { label: "제주", value: "jeju" },
  ],
  special: [
    { label: "한부모·조손 가정", value: "single" },
    { label: "다문화·탈북민 가정", value: "multi" },
    { label: "장애인 가구", value: "disabled" },
    { label: "다자녀 가정(2명 이상)", value: "many" },
    { label: "맞벌이", value: "dual" },
  ],
};

const getFieldOptions = (field) => {
  const explicitOptions = normalizeOptions(field?.options || field?.choices || []);
  if (explicitOptions.length > 0) return explicitOptions;
  return FIELD_OPTION_FALLBACKS[field?.key] || [];
};

const getQuestionKey = (question, index) =>
  question?.field_name ||
  question?.fieldName ||
  question?.key ||
  question?.name ||
  question?.id ||
  `question_${index + 1}`;

const getQuestionLabel = (question, index) =>
  question?.label ||
  question?.question_text ||
  question?.questionText ||
  question?.question ||
  question?.text ||
  question?.prompt ||
  `추가 질문 ${index + 1}`;

const getFieldIssueText = (field) => {
  const label = field?.label || "이 항목";
  const message = field?.message || field?.reason || "";
  const issueType = field?.issue_type || field?.issueType || "";

  if (issueType === "ambiguous" || /ambiguous|multiple/i.test(message)) {
    return `${label} 값이 여러 개로 해석되어 하나로 확정하지 못했어요.`;
  }
  if (issueType === "invalid" || /unsupported|invalid/i.test(message)) {
    return `${label} 값이 지원하는 선택지와 맞지 않아요.`;
  }
  if (issueType === "missing" || /missing/i.test(message)) {
    return `${label} 정보가 아직 없어요.`;
  }
  return message;
};

const normalizeFillingPrompt = (prompt) => {
  if (!prompt) return null;

  if (Array.isArray(prompt.fields)) {
    return prompt;
  }

  const questions = Array.isArray(prompt.questions)
    ? prompt.questions
    : Array.isArray(prompt.follow_up_questions)
      ? prompt.follow_up_questions
      : Array.isArray(prompt.followUpQuestions)
        ? prompt.followUpQuestions
        : [];

  return {
    ...prompt,
    fields: questions.map((question, index) => {
      const source = typeof question === "string" ? { question } : question;
      return {
        key: getQuestionKey(source, index),
        label: getQuestionLabel(source, index),
        reason: source?.reason,
        message: source?.message,
        issue_type: source?.issue_type || source?.issueType,
        options: source?.options || source?.choices || FIELD_OPTION_FALLBACKS[getQuestionKey(source, index)] || [],
      };
    }),
    multi: Array.from(new Set([
      ...(prompt.multi || prompt.multi_fields || prompt.multiFields || []),
      ...questions
        .map((question, index) => {
          const source = typeof question === "string" ? { question } : question;
          return getQuestionKey(source, index);
        })
        .filter((key) => key === "special"),
    ])),
  };
};

// ─── profile_confirm ──────────────────────────────────────────────────────────
function ProfileConfirmDock({ profileConfirm, onSubmit, disabled }) {
  const { summary = [], options = [] } = profileConfirm;
  const [highlighted, setHighlighted] = useState(0);
  const groupRef = useRef(null);

  useEffect(() => {
    if (!disabled) {
      groupRef.current?.focus();
    }
  }, [disabled]);

  const submitOption = useCallback(
    (option) => {
      if (disabled || !option) return;
      onSubmit(option.label);
    },
    [disabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (disabled || options.length === 0) return;
      if (["ArrowRight", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        setHighlighted((index) => Math.min(index + 1, options.length - 1));
      } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setHighlighted((index) => Math.max(index - 1, 0));
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        submitOption(options[highlighted]);
      }
    },
    [disabled, highlighted, options, submitOption]
  );

  return (
    <div style={{
      padding: "14px 16px",
      background: disabled ? "var(--dd-stone-50)" : "var(--dd-coral-50)",
      borderRadius: 14,
      border: `1px solid ${disabled ? "var(--dd-stone-200)" : "var(--dd-coral-200)"}`,
      marginBottom: 10,
      opacity: disabled ? 0.6 : 1,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--dd-stone-500)", marginBottom: 8 }}>
        저장된 정보로 진행할까요?
      </div>
      {summary.length > 0 && (
        <ul style={{ margin: "0 0 12px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          {summary.map((item, i) => (
            <li key={i} style={{ fontSize: 13, color: "var(--dd-stone-600)" }}>· {item}</li>
          ))}
        </ul>
      )}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label="저장된 정보 사용 여부"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          outline: "none",
        }}
      >
        {options.map((opt, index) => {
          const isPrimary = opt.value === "yes";
          const isHighlighted = !disabled && highlighted === index;
          return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isHighlighted}
            className={`dd-btn dd-btn-sm ${isPrimary ? "dd-btn-coral" : "dd-btn-ghost"}`}
            onMouseEnter={() => !disabled && setHighlighted(index)}
            onFocus={() => !disabled && setHighlighted(index)}
            onClick={() => submitOption(opt)}
            disabled={disabled}
            style={{
              boxShadow: isHighlighted
                ? "0 0 0 3px rgba(244, 87, 124, 0.22), 0 10px 24px rgba(244, 87, 124, 0.14)"
                : undefined,
              transform: isHighlighted ? "translateY(-1px)" : undefined,
              borderColor: isHighlighted && !isPrimary ? "var(--dd-coral-200)" : undefined,
              transition: "box-shadow 0.16s, transform 0.16s, border-color 0.16s",
            }}
          >
            {opt.label}
          </button>
        );
        })}
      </div>
    </div>
  );
}

// ─── slot_request step-wizard ─────────────────────────────────────────────────
function SlotDock({ slotRequest, onSubmit, disabled, flowType, requestId, targetPolicyId }) {
  const { fields = [], multi = [] } = slotRequest;
  const [step, setStep] = useState(0);
  // single-select: string | undefined  /  multi-select: string[]
  const [selected, setSelected] = useState({});
  const [skipped, setSkipped] = useState({});
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef(null);

  const currentField = fields[step] ?? null;
  const isLastStep = step === fields.length - 1;
  const isMulti = currentField ? multi.includes(currentField.key) : false;
  const opts = currentField
    ? getFieldOptions(currentField).concat([{ label: "잘 모르겠어요", value: UNKNOWN_VALUE }])
    : [];
  const currentIssueText = currentField ? getFieldIssueText(currentField) : "";
  const submitLabel = flowType === "eligibility" ? "이대로 분석하기" : "이대로 추천하기";

  // 스텝 전환 시 listbox 포커스
  useEffect(() => {
    listRef.current?.focus();
  }, [step]);

  const moveStep = useCallback((nextStep) => {
    setHighlighted(0);
    setStep(nextStep);
  }, []);

  const getOptionLabel = useCallback(
    (field, value) => {
      const option = getFieldOptions(field).find((opt) => opt.value === value);
      return option?.label || value;
    },
    []
  );

  const isOptionSelected = useCallback(
    (value) => {
      if (!currentField) return false;
      const val = selected[currentField.key];
      return isMulti ? Array.isArray(val) && val.includes(value) : val === value;
    },
    [currentField, isMulti, selected]
  );

  const toggleOption = useCallback((key, value, multi) => {
    setSelected((prev) => {
      if (multi) {
        const arr = Array.isArray(prev[key]) ? prev[key] : [];
        return {
          ...prev,
          [key]: arr.includes(value)
            ? arr.filter((v) => v !== value)
            : [...arr, value],
        };
      }
      return { ...prev, [key]: prev[key] === value ? undefined : value };
    });
    // 클릭은 선택만 — 전송하지 않음
  }, []);

  // override 인자로 state 비동기 문제 우회 (skip+submit, enter+submit 동시 처리)
  const buildAnswers = useCallback(
    (overrideSkipped = skipped, overrideSelected = selected) => {
      return fields.reduce((acc, field) => {
        if (overrideSkipped[field.key]) return acc;
        const value = overrideSelected[field.key];
        if (Array.isArray(value) && value.length > 0) {
          acc[field.key] = value.includes(UNKNOWN_VALUE) ? UNKNOWN_VALUE : value;
        } else if (value) {
          acc[field.key] = value === UNKNOWN_VALUE ? UNKNOWN_VALUE : value;
        }
        return acc;
      }, {});
    },
    [fields, selected, skipped]
  );

  const buildText = useCallback(
    (overrideSkipped = skipped, overrideSelected = selected) => {
      const parts = fields
        .filter((f) => {
          if (overrideSkipped[f.key]) return false;
          const val = overrideSelected[f.key];
          return Array.isArray(val) ? val.length > 0 : !!val;
        })
        .map((f) => {
          const val = overrideSelected[f.key];
          const displayValue = Array.isArray(val)
            ? val.map((item) => getOptionLabel(f, item)).join(", ")
            : getOptionLabel(f, val);
          return `${f.label}: ${displayValue}`;
        });
      return parts.length > 0 ? parts.join(" / ") : "잘 모르겠어요";
    },
    [fields, getOptionLabel, selected, skipped]
  );

  const submitValue = useCallback(
    (overrideSkipped = skipped, overrideSelected = selected) => {
      const text = buildText(overrideSkipped, overrideSelected);

      if (!flowType) {
        onSubmit(text);
        return;
      }

      onSubmit({
        flowType,
        requestId,
        targetPolicyId,
        text,
        raw_answer: text,
        answers: buildAnswers(overrideSkipped, overrideSelected),
      });
    },
    [buildAnswers, buildText, flowType, onSubmit, requestId, selected, skipped, targetPolicyId]
  );

  // 동기적으로 선택 상태를 계산 (setSelected 비동기 우회용)
  const applyToggle = useCallback(
    (key, value, multi) => {
      if (multi) {
        const arr = Array.isArray(selected[key]) ? selected[key] : [];
        return {
          ...selected,
          [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
        };
      }
      return { ...selected, [key]: selected[key] === value ? undefined : value };
    },
    [selected]
  );

  const handleSkip = () => {
    if (disabled || !currentField) return;
    const key = currentField.key;
    const nextSkipped = { ...skipped, [key]: true };
    setSkipped(nextSkipped);
    setSelected((prev) => ({ ...prev, [key]: isMulti ? [] : undefined }));
    if (isLastStep) {
      submitValue(nextSkipped);
    } else {
      moveStep((s) => s + 1);
    }
  };

  const handleSend = () => {
    submitValue();
  };

  // listbox 키보드: ↑↓ 하이라이트, Enter/Space는 선택만
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, opts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === " ") {
      // Space: 선택 토글만 (multi-select에서 여러 항목 고를 때)
      e.preventDefault();
      if (opts[highlighted]) {
        toggleOption(currentField.key, opts[highlighted].value, isMulti);
      }
    } else if (e.key === "Enter") {
      // Enter: 선택 효과를 잠깐 보여준 뒤 다음 스텝 이동 또는 전송
      e.preventDefault();
      let nextSelected = selected;
      if (opts[highlighted]) {
        nextSelected = applyToggle(currentField.key, opts[highlighted].value, isMulti);
        setSelected(nextSelected);
      }
      // 선택 CSS 효과가 렌더된 뒤 이동하도록 160ms 대기
      setTimeout(() => {
        if (isLastStep) {
          submitValue(skipped, nextSelected);
        } else {
          moveStep((s) => s + 1);
        }
      }, 160);
    }
  };

  if (!currentField) return null;

  return (
    <div style={{
      padding: "14px 16px",
      background: disabled ? "var(--dd-stone-50)" : "var(--dd-coral-50)",
      borderRadius: 14,
      border: `1px solid ${disabled ? "var(--dd-stone-200)" : "var(--dd-coral-200)"}`,
      marginBottom: 10,
      opacity: disabled ? 0.6 : 1,
    }}>
      {/* 스텝 인디케이터 */}
      {fields.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 12 }}>
          {fields.map((_, i) => (
            <span
              key={i}
              style={{
                height: 5,
                width: i === step ? 18 : 5,
                borderRadius: 3,
                background: i <= step ? "var(--dd-coral)" : "var(--dd-stone-200)",
                transition: "width 0.2s, background 0.2s",
              }}
            />
          ))}
          <span style={{ fontSize: 11, color: "var(--dd-stone-400)", marginLeft: 4 }}>
            {step + 1} / {fields.length}
          </span>
        </div>
      )}

      {/* 필드 헤더 */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "var(--dd-ink-80)", minWidth: 0 }}>
          <span>{currentField.label}</span>
          {isMulti && (
            <span style={{ fontSize: 11, fontWeight: 400, color: "var(--dd-stone-400)", marginLeft: 6 }}>
              복수 선택 가능
            </span>
          )}
          {currentIssueText && (
            <span style={{ display: "block", marginTop: 6, fontSize: 12, fontWeight: 500, color: "var(--dd-stone-500)", lineHeight: 1.45 }}>
              {currentIssueText}
            </span>
          )}
        </span>
	          <button
          type="button"
          style={{
            background: "none",
            border: "1px solid var(--dd-stone-200)",
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 11,
            color: "var(--dd-stone-500)",
            cursor: disabled ? "default" : "pointer",
            lineHeight: 1.6,
          }}
          onClick={handleSkip}
          disabled={disabled}
        >
          건너뛰기
        </button>
      </div>

      {/* 세로 listbox */}
      <ul
        ref={listRef}
        role="listbox"
        aria-multiselectable={isMulti}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          outline: "none",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxHeight: 224,
          overflowY: "auto",
        }}
      >
        {opts.map((opt, i) => {
          const sel = isOptionSelected(opt.value);
          const hi = !disabled && highlighted === i;
          return (
            <li
              key={opt.value}
              role="option"
              aria-selected={sel}
              onMouseEnter={() => !disabled && setHighlighted(i)}
              onClick={() => !disabled && toggleOption(currentField.key, opt.value, isMulti)}
              style={{
                padding: "9px 14px",
                borderRadius: 10,
                fontSize: 14,
                cursor: disabled ? "default" : "pointer",
                background: sel ? "var(--dd-coral)" : hi ? "var(--dd-coral-100)" : "#fff",
                color: sel ? "#fff" : "var(--dd-ink-80)",
                border: `1px solid ${sel ? "var(--dd-coral)" : hi ? "var(--dd-coral-200)" : "var(--dd-stone-200)"}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "background 0.1s, border-color 0.1s",
                userSelect: "none",
              }}
            >
              {/* 선택 지시자 (라디오 or 체크박스 형태) */}
              <span style={{
                flexShrink: 0,
                width: 16,
                height: 16,
                borderRadius: isMulti ? 4 : "50%",
                border: `1.5px solid ${sel ? "rgba(255,255,255,0.7)" : "var(--dd-stone-400)"}`,
                background: sel ? "rgba(255,255,255,0.2)" : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {sel && isMulti && <Icon name="Check" size={10} color="#fff" />}
                {sel && !isMulti && (
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", display: "block" }} />
                )}
              </span>
              <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{opt.label}</span>
            </li>
          );
        })}
      </ul>

      {/* 하단 액션 */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {step > 0 ? (
          <button
            type="button"
            style={{
              background: "none",
              border: "none",
              padding: "6px 4px",
              fontSize: 13,
              color: "var(--dd-stone-500)",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => !disabled && moveStep((s) => s - 1)}
            disabled={disabled}
          >
            <Icon name="ChevronLeft" size={14} /> 이전
          </button>
        ) : (
          <span />
        )}

        {isLastStep ? (
          <button
            type="button"
            className="dd-btn dd-btn-coral dd-btn-sm"
            onClick={handleSend}
            disabled={disabled}
          >
	            <Icon name="Send" size={14} /> {submitLabel}
	          </button>
        ) : (
          <button
            type="button"
            style={{
              background: "var(--dd-coral-100)",
              border: "none",
              borderRadius: 999,
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--dd-coral-strong)",
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
            onClick={() => !disabled && moveStep((s) => s + 1)}
            disabled={disabled}
          >
            다음 <Icon name="ChevronRight" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 루트 ─────────────────────────────────────────────────────────────────────
export default function ChatPromptDock({
  slotRequest,
  conditionFilling,
  profileConfirm,
  prompt,
  flowType,
  requestId,
  targetPolicyId,
  onSubmit,
  disabled,
}) {
  const fillingPrompt = normalizeFillingPrompt(conditionFilling || prompt || slotRequest);

  if (!fillingPrompt && !profileConfirm) return null;

  if (profileConfirm) {
    return (
      <ProfileConfirmDock
        profileConfirm={profileConfirm}
        onSubmit={onSubmit}
        disabled={disabled}
      />
    );
  }

  return (
    <SlotDock
      slotRequest={fillingPrompt}
      onSubmit={onSubmit}
      disabled={disabled}
      flowType={flowType}
      requestId={requestId}
      targetPolicyId={targetPolicyId}
    />
  );
}
