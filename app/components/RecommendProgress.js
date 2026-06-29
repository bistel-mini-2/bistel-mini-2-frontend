// 도담 — 추천 로딩 진행 단계
// <RecommendProgress activeStep={1} />
// i < activeStep → 완료(✓), i === activeStep → 진행(스피너), i > activeStep → 대기
const DEFAULT_STEPS = ["가족 조건 분석", "후보 정책 검색", "근거 정리·추천"];

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function RecommendProgress({ steps = DEFAULT_STEPS, activeStep = 0 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      <style>{"@keyframes ddSpin{to{transform:rotate(360deg)}}"}</style>
      {steps.map((label, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <span style={{
              width: 26, height: 26, borderRadius: "50%", flex: "none",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              border: "1px solid " + (done ? "var(--dd-coral-200, #ffc4d2)" : "var(--dd-stone-200, #e7e5e4)"),
              background: done ? "var(--dd-coral-50, #fff1f4)" : "#fff",
              color: "var(--dd-coral, #e8466f)",
            }}>
              {active && (
                <span style={{
                  width: 13, height: 13, borderRadius: "50%",
                  border: "2px solid var(--dd-coral-100, #ffe0e8)",
                  borderTopColor: "var(--dd-coral, #e8466f)",
                  animation: "ddSpin .7s linear infinite",
                }} />
              )}
              {done && <CheckIcon />}
            </span>
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: active
                ? "var(--dd-ink, #1c1917)"
                : done
                ? "var(--dd-stone-600, #57534e)"
                : "var(--dd-stone-400, #a8a29e)",
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
