"use client";

// =========================================================================
// 도담 — 정책추천 조건 입력 (/recommend)
// 의도: 가족 상황을 쉬운 질문으로 받아 맞춤 추천의 입력값을 만든다.
// 구성: 스텝 인디케이터(1단계 활성) · 좌측 입력 폼 · 우측 입력 요약 카드 ·
//       하단 코랄 CTA "추천 정책 확인하기" → 추천 요청 생성 후 /recommend/result.
// =========================================================================
import { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecommendationRequest } from "@/apis/recommendationApi";
import familyProfileApi from "@/apis/familyProfileApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import { AuthContext } from "@/contexts/AuthContext";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import {
  DEFAULT_FAMILY,
  FAMILY_OPTIONS,
  RECOMMENDATION_INPUT_KEY,
  createRecommendationPayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";

export default function RecommendPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useContext(AuthContext);
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [rawQuery, setRawQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const normalizedFamily = normalizeFamilyProfile(family);
  // 저장 프로필 자동 반영은 1회만, 그리고 사용자가 이미 폼을 건드렸으면 덮어쓰지 않는다.
  const hydratedRef = useRef(false);
  const userEditedRef = useRef(false);

  const set = (key, value) => {
    userEditedRef.current = true;
    setFamily((f) => ({ ...f, [key]: value }));
  };
  const selectChildAge = (value) => {
    userEditedRef.current = true;
    setFamily((family) => ({
      ...family,
      childAge: value,
      childrenAges: [value],
    }));
  };
  const toggleSpecial = (value) => {
    userEditedRef.current = true;
    setFamily((f) => ({
      ...f,
      special: f.special.includes(value)
        ? f.special.filter((s) => s !== value)
        : [...f.special, value],
    }));
  };

  // 로그인 사용자면 저장된 가족 프로필을 불러와 입력 폼 기본값으로 채운다.
  // 없거나 조회 실패(401 등)면 DEFAULT_FAMILY 그대로 둔다.
  useEffect(() => {
    if (typeof window === "undefined" || authLoading || !isAuthenticated) {
      return;
    }
    if (hydratedRef.current || userEditedRef.current) {
      return;
    }

    let ignore = false;
    (async () => {
      try {
        const saved = await familyProfileApi.getMe();
        if (ignore || !saved || hydratedRef.current || userEditedRef.current) {
          return;
        }
        hydratedRef.current = true;
        setFamily(normalizeFamilyProfile(saved));
      } catch {
        // 저장 프로필 없음/조회 실패 → 기본값 유지(폼 깨지지 않음).
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, authLoading]);

  const summaryRows = familyRows(normalizedFamily);

  const submitRecommendation = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const selectedConditions = createRecommendationPayload(normalizedFamily);
      const trimmedRawQuery = rawQuery.trim();
      const recommendationPayload = {
        source_type: "FORM",
        ...(trimmedRawQuery ? { raw_query: trimmedRawQuery } : {}),
        selected_conditions: selectedConditions,
      };
      const { requestId } = await createRecommendationRequest(recommendationPayload);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          RECOMMENDATION_INPUT_KEY,
          JSON.stringify({
            requestId,
            family: normalizedFamily,
            rawQuery: trimmedRawQuery,
            selectedConditions,
          })
        );
      }

      router.push(`/recommend/result?requestId=${encodeURIComponent(requestId)}`);
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          "추천 요청을 생성하지 못했어요. 잠시 후 다시 시도해주세요."
        )
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <StepIndicator current={1} />

        <div className="mt-4">
          <h1 className="dd-title" style={{ fontSize: 30 }}>우리 가족의 상황을 알려주세요</h1>
          <p className="mt-2" style={{ fontSize: 16, color: "var(--dd-stone-600)" }}>
            몇 가지만 선택하면 받을 수 있는 지원을 AI가 찾아드려요. 어려운 용어는 몰라도 괜찮아요.
          </p>
        </div>

        <div className="row g-4 mt-1">
          {/* 입력 폼 */}
          <div className="col-12 col-lg-8">
            <div className="dd-card dd-card-lg" style={{ padding: 28 }}>
              {/* 자연어 입력 */}
              <div className="mb-4">
                <label className="dd-label">상황 설명</label>
                <textarea
                  className="dd-input"
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  placeholder="예: 서울에 살고 있고 8개월 아이를 키우고 있어요. 받을 수 있는 양육 지원을 알고 싶어요."
                  rows={4}
                  maxLength={500}
                  disabled={isSubmitting}
                  style={{ minHeight: 112, resize: "vertical", lineHeight: 1.5 }}
                />
              </div>

              {/* 가족 구성 */}
              <div className="mb-4">
                <label className="dd-label">가족 구성</label>
                <div className="dd-radio-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {FAMILY_OPTIONS.stage.map((o) => (
                    <label key={o.value} className={"dd-choice" + (family.stage === o.value ? " is-checked" : "")}>
                      <input
                        type="radio"
                        name="stage"
                        checked={family.stage === o.value}
                        onChange={() => set("stage", o.value)}
                        disabled={isSubmitting}
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="row g-3">
                {/* 가구 소득 */}
                <div className="col-12 col-sm-6">
                  <label className="dd-label">가구 소득</label>
                  <select
                    className="dd-select"
                    value={family.income}
                    onChange={(e) => set("income", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {FAMILY_OPTIONS.income.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* 거주 지역 */}
                <div className="col-12 col-sm-6">
                  <label className="dd-label">거주 지역</label>
                  <select
                    className="dd-select"
                    value={family.region}
                    onChange={(e) => set("region", e.target.value)}
                    disabled={isSubmitting}
                  >
                    {FAMILY_OPTIONS.region.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 신청자 나이 — 자녀 나이와 구분(청소년산모 등 신청자 나이 기반 정책 정확도) */}
              <div className="mt-3">
                <label className="dd-label">
                  신청자(보호자) 나이{" "}
                  <span className="dd-subtle" style={{ fontWeight: 400 }}>(선택)</span>
                </label>
                <input
                  type="number"
                  className="dd-input"
                  style={{ maxWidth: 200 }}
                  min={1}
                  max={120}
                  inputMode="numeric"
                  placeholder="예: 34"
                  value={family.age ?? ""}
                  onChange={(e) => set("age", e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="dd-subtle mt-1 mb-0" style={{ fontSize: 13 }}>
                  자녀 나이와 구분해  나이 기준이 있는 정책을 정확히 추천해요.
                </p>
              </div>

              {/* 자녀 연령 */}
              <div className="mt-4">
                <label className="dd-label">자녀 연령대 <span className="dd-subtle" style={{ fontWeight: 400 }}>(하나 선택)</span></label>
                <div className="d-flex flex-wrap gap-2">
                  {FAMILY_OPTIONS.childAge.map((o) => {
                    const on = normalizedFamily.childAge === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => selectChildAge(o.value)}
                        disabled={isSubmitting}
                        className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                        style={{ padding: "9px 16px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                      >
                        {on && <Icon name="Check" size={14} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 특수 상황 */}
              <div className="mt-4">
                <label className="dd-label">특수 상황 <span className="dd-subtle" style={{ fontWeight: 400 }}>(해당되는 항목 모두 선택)</span></label>
                <div className="d-flex flex-wrap gap-2">
                  {FAMILY_OPTIONS.special.map((o) => {
                    const on = family.special.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleSpecial(o.value)}
                        disabled={isSubmitting}
                        className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                        style={{ padding: "9px 16px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                      >
                        {on && <Icon name="Check" size={14} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 입력 요약 카드 */}
          <div className="col-12 col-lg-4">
            <div className="dd-card dd-card-lg" style={{ padding: 22, position: "sticky", top: 84 }}>
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center gap-2">
                  <Icon name="ClipboardList" size={18} style={{ color: "var(--dd-coral)" }} />
                  <strong style={{ fontSize: 16 }}>입력 정보 요약</strong>
                </div>
              </div>
              <div className="d-flex flex-column gap-2">
                {summaryRows.map((r) => (
                  <div key={r.label} className="d-flex justify-content-between align-items-start gap-3" style={{ fontSize: 14 }}>
                    <span className="dd-subtle" style={{ flex: "none" }}>{r.label}</span>
                    <span className="fw-semibold text-end" style={{ color: "var(--dd-ink-80)" }}>{r.value}</span>
                  </div>
                ))}
              </div>
              <hr className="dd-divider my-3" />
              <button
                type="button"
                className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-block"
                onClick={() => {
                  setFamily(DEFAULT_FAMILY);
                  setRawQuery("");
                  setSubmitError("");
                }}
                disabled={isSubmitting}
              >
                <Icon name="Pencil" size={15} /> 처음부터 다시 입력
              </button>
              <button
                type="button"
                className="dd-btn dd-btn-coral dd-btn-block mt-2"
                onClick={submitRecommendation}
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? "추천 요청 중..." : "추천 정책 확인하기"}
                {!isSubmitting && <Icon name="ArrowRight" size={18} />}
              </button>
              {submitError && (
                <p
                  className="mt-2 mb-0 text-center"
                  role="alert"
                  style={{ color: "var(--dd-coral)", fontSize: 13, lineHeight: 1.5 }}
                >
                  {submitError}
                </p>
              )}
              <div className="mt-3 text-center">
                <DisclaimerNote />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
