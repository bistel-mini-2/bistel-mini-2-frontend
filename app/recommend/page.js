"use client";

// =========================================================================
// 도담 — 정책추천 조건 입력 (/recommend)
// 의도: 가족 상황을 쉬운 질문으로 받아 맞춤 추천의 입력값을 만든다.
// 구성: 스텝 인디케이터(1단계 활성) · 좌측 입력 폼 · 우측 입력 요약 카드 ·
//       하단 코랄 CTA "추천 정책 확인하기" → /recommend/result.
// =========================================================================
import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import {
  DEFAULT_FAMILY,
  FAMILY_OPTIONS,
  FAMILY_PROFILE_KEY,
  createRecommendationPayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";

export default function RecommendPage() {
  const router = useRouter();
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const normalizedFamily = normalizeFamilyProfile(family);

  const set = (key, value) => setFamily((f) => ({ ...f, [key]: value }));
  const selectChildAge = (value) =>
    setFamily((family) => ({
      ...family,
      childAge: value,
      childrenAges: [value],
    }));
  const toggleSpecial = (value) =>
    setFamily((f) => ({
      ...f,
      special: f.special.includes(value)
        ? f.special.filter((s) => s !== value)
        : [...f.special, value],
    }));

  const summaryRows = familyRows(normalizedFamily);

  const goResult = () => {
    const recommendationPayload = createRecommendationPayload(normalizedFamily);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        FAMILY_PROFILE_KEY,
        JSON.stringify({
          ...normalizedFamily,
          ...recommendationPayload,
        })
      );
    }

    router.push("/recommend/result");
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
              {/* 가족 구성 */}
              <div className="mb-4">
                <label className="dd-label">가족 구성</label>
                <div className="dd-radio-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  {FAMILY_OPTIONS.stage.map((o) => (
                    <label key={o.value} className={"dd-choice" + (family.stage === o.value ? " is-checked" : "")}>
                      <input type="radio" name="stage" checked={family.stage === o.value} onChange={() => set("stage", o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="row g-3">
                {/* 가구 소득 */}
                <div className="col-12 col-sm-6">
                  <label className="dd-label">가구 소득</label>
                  <select className="dd-select" value={family.income} onChange={(e) => set("income", e.target.value)}>
                    {FAMILY_OPTIONS.income.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {/* 거주 지역 */}
                <div className="col-12 col-sm-6">
                  <label className="dd-label">거주 지역</label>
                  <select className="dd-select" value={family.region} onChange={(e) => set("region", e.target.value)}>
                    {FAMILY_OPTIONS.region.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
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
              <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-block" onClick={() => setFamily(DEFAULT_FAMILY)}>
                <Icon name="Pencil" size={15} /> 처음부터 다시 입력
              </button>
              <button type="button" className="dd-btn dd-btn-coral dd-btn-block mt-2" onClick={goResult}>
                추천 정책 확인하기 <Icon name="ArrowRight" size={18} />
              </button>
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
