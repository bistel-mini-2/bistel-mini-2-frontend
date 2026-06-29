// =========================================================================
// 도담 — 스텝 인디케이터
// 정책추천 흐름: 1 가족 상황 입력 / 2 추가 정보(필요시) / 3 추천 결과
// 추가 정보는 부족할 때만 입력과 결과 사이에서 받는 조건부 단계다.
// current(1-base)보다 작으면 완료, 같으면 활성.
// =========================================================================
import Icon from "@/app/components/Icon";

const DEFAULT_STEPS = [
  "가족 상황 입력",
  "추가 정보",
  "추천 결과",
];

export default function StepIndicator({ current = 1, steps = DEFAULT_STEPS }) {
  return (
    <div className="dd-steps" role="list" aria-label="진행 단계">
      {steps.map((label, i) => {
        const n = i + 1;
        const state =
          n < current ? "is-done" : n === current ? "is-active" : "";
        return (
          <div key={label} className="d-flex align-items-center" role="listitem">
            <div className={"dd-step " + state}>
              <span className="dd-step-dot">
                {n < current ? <Icon name="Check" size={15} /> : n}
              </span>
              <span className="dd-step-label">{label}</span>
            </div>
            {i < steps.length - 1 && <span className="dd-step-bar mx-2" />}
          </div>
        );
      })}
    </div>
  );
}
