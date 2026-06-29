// 도담 — 채팅 답변용 신청 안내 카드
import Link from "next/link";
import Icon from "@/app/components/Icon";

export default function ApplyCardChat({
  policy_id,
  slug,
  policy_name,
  how_to_apply = null,
  apply_period = null,
  contact = null,
  official_url = null,
  checklist = [],
  caution = null,
}) {
  const policySlug = slug || policy_id;
  const infoRows = [
    { icon: "ClipboardCheck", label: "신청방법", value: how_to_apply },
    { icon: "CalendarDays", label: "신청기간", value: apply_period },
    { icon: "Phone", label: "문의처", value: contact },
  ].filter((r) => r.value);

  const items = (checklist || []).slice(0, 5);

  return (
    <>
      <div className="dd-apply-card-chat">
        <div className="dd-apply-card-chat-head">
          <span className="dd-apply-card-chat-tile">
            <Icon name="ClipboardCheck" size={20} />
          </span>
          <span className="dd-apply-card-chat-title-wrap">
            {policy_name && (
              <span className="dd-apply-card-chat-title">{policy_name}</span>
            )}
            <span className="dd-apply-card-chat-badge">
              <Icon name="Sparkles" size={11} /> 신청 안내
            </span>
          </span>
        </div>

        {infoRows.length > 0 && (
          <div className="dd-apply-card-chat-rows">
            {infoRows.map((r) => (
              <div key={r.label} className="dd-apply-card-chat-row">
                <Icon name={r.icon} size={14} />
                <span className="dd-apply-card-chat-row-label">{r.label}</span>
                <span className="dd-apply-card-chat-row-value">{r.value}</span>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="dd-apply-card-chat-checklist">
            <div className="dd-apply-card-chat-check-title">
              <Icon name="ListChecks" size={15} />
              <strong>신청 전 체크리스트</strong>
            </div>
            {items.map((c, index) => (
              <div key={c.id || c.label || index} className="dd-apply-card-chat-check">
                <span aria-hidden="true" />
                <span>{c.label || c}</span>
              </div>
            ))}
          </div>
        )}

        <div className="dd-apply-card-chat-actions">
          <Link
            href={policySlug ? `/policies/${policySlug}/apply` : "/policies"}
            className="dd-acc-btn dd-acc-coral"
          >
            <Icon name="ClipboardCheck" size={14} /> 신청 준비 페이지로
          </Link>
          {official_url && (
            <a
              href={official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="dd-acc-btn dd-acc-ghost"
            >
              <Icon name="ExternalLink" size={14} /> 공식 사이트
            </a>
          )}
        </div>

        {caution && (
          <p className="dd-apply-card-chat-caution">
            <Icon name="CircleAlert" size={13} />
            <span>{caution}</span>
          </p>
        )}
      </div>

      <div className="dd-apply-card-chat-after">
        <Link
          href={policySlug ? `/policies/${policySlug}/eligibility` : "/eligibility"}
          className="dd-na-btn dd-na-blue"
        >
          <Icon name="ShieldCheck" size={15} /> 지원 가능성 확인
        </Link>
      </div>
    </>
  );
}
