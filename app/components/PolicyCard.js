// =========================================================================
// 도담 — 정책 카드 (추천결과 / 정책리스트 / 함께 보면 좋은 정책 공용)
// 순번 배지·매칭 배지·지원금액/기간·하단 액션 슬롯(children)을 옵션으로.
// =========================================================================
import Link from "next/link";
import Icon from "@/app/components/Icon";

export default function PolicyCard({
  policy,
  rank,
  match,
  showMeta = false,
  href,
  children,
}) {
  if (!policy) return null;
  const detailHref = href || `/policies/${policy.id}`;

  return (
    <div className="dd-card dd-card-hover h-100 d-flex flex-column" style={{ padding: 20 }}>
      <div className="d-flex align-items-start gap-3">
        <span className="dd-icon-tile dd-tile-rose" style={{ width: 46, height: 46 }}>
          <Icon name={policy.icon} size={22} />
        </span>
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {rank != null && (
              <span
                className="dd-badge-match"
                style={{ background: "var(--dd-coral-50)", color: "var(--dd-coral)" }}
              >
                {rank}순위
              </span>
            )}
            <Link
              href={detailHref}
              className="fw-bold text-decoration-none"
              style={{ color: "var(--dd-ink)", fontSize: 17 }}
            >
              {policy.name}
            </Link>
          </div>
          <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
            <span className={"dd-pill dd-pill-" + policy.tagTone}>{policy.tag}</span>
            {match != null && (
              <span className="dd-badge-match">
                <Icon name="Star" size={12} fill="currentColor" />
                {match}%
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 mb-0 flex-grow-1" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>
        {policy.summary}
      </p>

      {showMeta && (
        <div className="mt-3 d-flex flex-column gap-1" style={{ fontSize: 13 }}>
          <div className="d-flex align-items-center gap-2" style={{ color: "var(--dd-stone-600)" }}>
            <Icon name="Wallet" size={14} style={{ color: "var(--dd-coral)" }} />
            <span>{policy.amount}</span>
          </div>
          <div className="d-flex align-items-center gap-2" style={{ color: "var(--dd-stone-600)" }}>
            <Icon name="CalendarDays" size={14} style={{ color: "var(--dd-coral)" }} />
            <span>{policy.period}</span>
          </div>
        </div>
      )}

      {children && <div className="mt-3 d-flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
