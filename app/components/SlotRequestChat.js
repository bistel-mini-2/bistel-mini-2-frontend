"use client";
import { useState } from "react";
import Icon from "./Icon";

export default function SlotRequestChat({ slotRequest, onSubmit, isDisabled }) {
  const [selected, setSelected] = useState({});

  if (!slotRequest?.fields?.length) return null;

  const { current, fields = [] } = slotRequest;

  const handleSelect = (key, option) => {
    setSelected((prev) => ({
      ...prev,
      [key]: prev[key] === option ? undefined : option,
    }));
  };

  const handleSubmit = () => {
    const parts = fields
      .filter((f) => selected[f.key])
      .map((f) => `${f.label}: ${selected[f.key]}`);
    if (parts.length === 0) return;
    onSubmit(parts.join(" / "));
  };

  const hasSelection = fields.some((f) => selected[f.key]);

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 16px",
        background: isDisabled ? "var(--dd-stone-50, #fafaf9)" : "var(--dd-coral-50)",
        borderRadius: 14,
        border: `1px solid ${isDisabled ? "var(--dd-stone-200, #e7e5e4)" : "var(--dd-coral-200)"}`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fields.map((field) => {
          const isCurrent = field.key === current && !isDisabled;
          return (
            <div key={field.key}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 12,
                  color: isCurrent ? "var(--dd-coral)" : "var(--dd-stone-500)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isCurrent && <span style={{ fontSize: 10 }}>▶</span>}
                {field.label}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {field.options.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`dd-chip-q${selected[field.key] === option ? " is-selected" : ""}`}
                    onClick={!isDisabled ? () => handleSelect(field.key, option) : undefined}
                    disabled={isDisabled}
                    style={
                      isDisabled
                        ? { opacity: 0.5, cursor: "default", pointerEvents: "none" }
                        : undefined
                    }
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!isDisabled && (
        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="dd-btn dd-btn-coral dd-btn-sm"
            onClick={handleSubmit}
            disabled={!hasSelection}
          >
            <Icon name="Send" size={14} /> 이대로 보내기
          </button>
        </div>
      )}
    </div>
  );
}
