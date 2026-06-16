"use client";

// =========================================================================
// 도담 — 공통 Modal 래퍼
// 딤 배경 + 닫기 버튼 + ESC 닫기 + body 스크롤 락.
// 지원가능성/비교/신청준비 내용 컴포넌트를 이 안에 넣어 재사용한다.
// =========================================================================
import { useEffect } from "react";
import Icon from "@/app/components/Icon";

export default function Modal({ open, onClose, title, icon, children, maxWidth }) {
  // ESC 닫기 + 스크롤 락
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="dd-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="dd-modal"
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dd-modal-head">
          <div className="d-flex align-items-center gap-2">
            {icon && (
              <span className="dd-icon-tile dd-tile-rose" style={{ width: 36, height: 36 }}>
                <Icon name={icon} size={18} />
              </span>
            )}
            <strong style={{ fontSize: 17 }}>{title}</strong>
          </div>
          <button
            type="button"
            className="dd-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="dd-modal-body">{children}</div>
      </div>
    </div>
  );
}
