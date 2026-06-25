"use client";

// =========================================================================
// 도담 — 정책 선택 (비교 바구니 등에서 정책 A/B 선택)
// =========================================================================
import Icon from "@/app/components/Icon";
import { POLICIES } from "@/app/data/policies";

const shortenLabel = (value, maxLength = 34) => {
  if (!value) return "";
  return value.length > maxLength ? value.slice(0, maxLength - 1) + "…" : value;
};

export default function PolicySelect({
  value,
  onChange,
  label,
  exclude = [],
  extraOptions = [],
  placeholder = "정책을 선택하세요",
}) {
  const optionMap = new Map();
  [...extraOptions, ...POLICIES].forEach((policy) => {
    if (policy?.id) {
      optionMap.set(policy.id, policy);
    }
  });
  const options = [...optionMap.values()].filter(
    (p) => !exclude.includes(p.id) || p.id === value
  );

  return (
    <div>
      {label && <label className="dd-label">{label}</label>}
      <div style={{ position: "relative" }}>
        <select
          className="dd-select"
          value={value || ""}
          onChange={(e) => onChange?.(e.target.value)}
          style={{ appearance: "none", paddingRight: 40 }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {shortenLabel(p.name)}
            </option>
          ))}
        </select>
        <span
          style={{
            position: "absolute",
            right: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--dd-stone-400)",
            pointerEvents: "none",
          }}
        >
          <Icon name="ChevronDown" size={18} />
        </span>
      </div>
    </div>
  );
}
