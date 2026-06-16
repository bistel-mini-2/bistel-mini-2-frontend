"use client";

// =========================================================================
// 도담 — AI 챗봇 (/chat)
// 홈과 동일한 디자인. 더미 SSE(setTimeout) 응답 + 리치 답변 카드(출처/관련
// 정책/다음 액션/면책). 상태는 React state 만 사용(스토리지 금지).
// =========================================================================
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import { ACTION_META } from "@/app/data/constants";
import { getPolicy } from "@/app/data/policies";

const EXAMPLE_CHIPS = [
  "임신 중인데 받을 수 있는 지원 알려줘",
  "부모급여랑 아동수당 뭐가 달라?",
  "첫만남이용권 신청 준비물",
  "어린이집 다녀도 아이돌봄 되나요?",
];

const INITIAL_MESSAGES = [
  { id: 1, role: "user", text: "임신 중인데 받을 수 있는 지원 알려줘" },
  {
    id: 2,
    role: "ai",
    text: "임신 중에는 의료비 부담을 덜어주는 지원부터 챙기시면 좋아요. 가장 대표적인 건 임신·출산 진료비를 바우처로 지원하는 제도예요. 소득과 관계없이 신청할 수 있어 받을 가능성이 높은 편이에요.",
    sources: ["임신·출산 진료비 지원 · 지원대상", "건강보험 임신부 혜택"],
    policies: ["first-meet", "postnatal-care"],
    actions: ["eligibility", "apply"],
    disclaimer: true,
  },
];

const CANNED = [
  {
    match: ["부모급여", "아동수당", "달라", "차이"],
    text: "두 제도는 목적이 조금 달라요. 부모급여는 0~1세 영아를 키우는 가정의 부담을 덜기 위한 지원이고, 아동수당은 8세 미만 아동에게 폭넓게 주는 지원이에요. 두 가지를 함께 받을 수 있는 경우가 많으니 비교해보시는 걸 추천드려요.",
    sources: ["부모급여 · 지원대상", "아동수당 · 지급기준"],
    policies: ["parent-allowance", "child-allowance"],
    actions: ["compare", "eligibility"],
  },
  {
    match: ["첫만남", "준비물", "서류", "신청"],
    text: "첫만남이용권은 출산 후 비교적 간단히 신청할 수 있어요. 보통 출생신고와 함께 처리하면 편하고, 신청자 신분증과 아이의 출생 정보가 필요해요. 정확한 서류는 거주지 기준으로 조금 달라질 수 있어 미리 확인하시면 좋아요.",
    sources: ["첫만남이용권 · 신청방법", "정부24 출산서비스 통합처리"],
    policies: ["first-meet"],
    actions: ["apply", "eligibility"],
  },
  {
    match: ["어린이집", "아이돌봄", "돌봄", "병행"],
    text: "어린이집을 이용 중이어도 시간대가 맞지 않는 돌봄 공백이 있다면 아이돌봄서비스를 함께 이용할 수 있는 경우가 있어요. 다만 중복 지원 조건이 있어 가구 소득·이용 시간에 따라 달라질 수 있으니 가능성을 함께 확인해볼게요.",
    sources: ["아이돌봄서비스 · 이용대상", "보육·돌봄 중복지원 기준"],
    policies: ["care-service"],
    actions: ["eligibility", "compare"],
  },
];

const DEFAULT_REPLY = {
  text: "말씀해주신 상황을 바탕으로 받을 수 있을 가능성이 높은 지원을 찾아봤어요. 아래 정책을 먼저 살펴보시고, 더 정확히 확인하고 싶으면 가능성 분석을 이어서 해드릴게요.",
  sources: ["복지로 통합검색 · 추천결과"],
  policies: ["parent-allowance", "care-service"],
  actions: ["recommend", "eligibility"],
};

function pickReply(text) {
  const found = CANNED.find((c) => c.match.some((m) => text.includes(m)));
  return { ...(found || DEFAULT_REPLY), disclaimer: true };
}

function deriveContext(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "ai" && m.policies && m.policies.length) {
      const p = getPolicy(m.policies[0]);
      return p ? p.name : null;
    }
  }
  return null;
}

export default function ChatPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef(null);
  const idRef = useRef(100);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const send = (raw) => {
    const text = (raw ?? input).trim();
    if (!text || typing) return;
    setMessages((prev) => [...prev, { id: ++idRef.current, role: "user", text }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: ++idRef.current, role: "ai", ...pickReply(text) }]);
      setTyping(false);
    }, 800);
  };

  const context = deriveContext(messages);

  return (
    <div className="dd-chat-page">
      <Header />

      {/* 맥락 힌트 */}
      {context && (
        <div style={{ background: "rgba(255,255,255,0.6)", borderBottom: "1px solid var(--dd-coral-100)" }}>
          <div className="dd-shell dd-shell-narrow d-flex align-items-center gap-2" style={{ paddingTop: 10, paddingBottom: 10 }}>
            <span className="dd-pill dd-pill-coral">
              <Icon name="Sparkles" size={13} /> 현재 대화: {context}
            </span>
            <span style={{ fontSize: 12, color: "var(--dd-stone-400)" }}>관련 질문을 이어서 물어보세요</span>
          </div>
        </div>
      )}

      {/* 대화 영역 */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto" }}>
        <div className="dd-shell dd-shell-narrow" style={{ paddingTop: 24, paddingBottom: 24 }}>
          {/* 환영 */}
          <div className="d-flex align-items-start gap-3 mb-3">
            <span className="dd-chat-avatar"><Icon name="Sparkles" size={20} /></span>
            <div className="dd-bubble-ai">
              <p className="mb-1 fw-bold" style={{ fontSize: 16 }}>어떤 도움이 필요하세요?</p>
              <p className="mb-0" style={{ fontSize: 14, color: "var(--dd-stone-600)", lineHeight: 1.6 }}>
                가족 상황이나 궁금한 정책을 편하게 물어보세요. 정책 이름을 몰라도 괜찮아요.
              </p>
            </div>
          </div>

          {/* 예시 칩 */}
          <div className="d-flex flex-wrap gap-2 mb-4" style={{ paddingLeft: 52 }}>
            {EXAMPLE_CHIPS.map((c) => (
              <button key={c} type="button" className="dd-chip-q" onClick={() => send(c)}>{c}</button>
            ))}
          </div>

          {/* 메시지 */}
          <div className="d-flex flex-column gap-3">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="d-flex justify-content-end">
                  <div className="dd-bubble-user">{m.text}</div>
                </div>
              ) : (
                <div key={m.id} className="d-flex align-items-start gap-3">
                  <span className="dd-chat-avatar"><Icon name="Sparkles" size={20} /></span>
                  <div className="dd-bubble-ai" style={{ flex: 1, maxWidth: 640 }}>
                    <p style={{ fontSize: 15, color: "var(--dd-stone-600)", lineHeight: 1.7, marginBottom: 0 }}>{m.text}</p>

                    {m.sources?.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {m.sources.map((s) => (
                          <span key={s} className="dd-pill dd-pill-stone">
                            <Icon name="FileText" size={12} /> 출처: {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {m.policies?.length > 0 && (
                      <div className="d-flex flex-column gap-2 mt-3">
                        {m.policies.map((pid) => {
                          const p = getPolicy(pid);
                          if (!p) return null;
                          return (
                            <div key={pid} className="d-flex align-items-center gap-3 dd-card-soft" style={{ padding: 13 }}>
                              <span className="dd-icon-tile" style={{ width: 40, height: 40 }}>
                                <Icon name={p.icon} size={20} />
                              </span>
                              <div className="flex-grow-1 min-w-0">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-bold text-truncate" style={{ fontSize: 14 }}>{p.name}</span>
                                  <span className={"dd-pill dd-pill-" + p.tagTone} style={{ fontSize: 11, padding: "2px 8px" }}>{p.tag}</span>
                                </div>
                                <p className="mb-0 mt-1" style={{ fontSize: 12, color: "var(--dd-stone-600)", lineHeight: 1.5 }}>{p.summary}</p>
                              </div>
                              <Link href={`/policies/${p.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                                상세보기 <Icon name="ArrowRight" size={13} />
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {m.actions?.length > 0 && (
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {m.actions.map((a) => {
                          const meta = ACTION_META[a];
                          const pid = m.policies?.[0];
                          const href =
                            a === "compare" ? "/compare" :
                            a === "recommend" ? "/recommend" :
                            a === "chat" ? "/chat" :
                            pid ? `/policies/${pid}/${a}` : "/policies";
                          return (
                            <Link key={a} href={href} className={"dd-btn dd-btn-" + meta.variant + " dd-btn-sm"}>
                              <Icon name={meta.icon} size={15} /> {meta.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    {m.disclaimer && (
                      <p className="dd-disclaimer mt-3 mb-0">
                        <Icon name="ShieldCheck" size={12} /> 최종 신청 가능 여부는 공식 기관 확인이 필요합니다.
                      </p>
                    )}
                  </div>
                </div>
              )
            )}

            {typing && (
              <div className="d-flex align-items-start gap-3">
                <span className="dd-chat-avatar"><Icon name="Sparkles" size={20} /></span>
                <div className="dd-bubble-ai">
                  <div className="d-flex align-items-center gap-2">
                    <span className="dd-typing-dot" style={{ animationDelay: "0s" }} />
                    <span className="dd-typing-dot" style={{ animationDelay: "0.15s" }} />
                    <span className="dd-typing-dot" style={{ animationDelay: "0.3s" }} />
                    <span style={{ fontSize: 12, color: "var(--dd-stone-400)", marginLeft: 6 }}>AI가 입력 중…</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 입력 영역 */}
      <div style={{ borderTop: "1px solid var(--dd-coral-100)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)" }}>
        <div className="dd-shell dd-shell-narrow" style={{ paddingTop: 14, paddingBottom: 14 }}>
          <form className="d-flex align-items-center gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input
              className="dd-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="가족 상황이나 궁금한 정책을 입력하세요"
              aria-label="메시지 입력"
              style={{ borderRadius: 999 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="전송"
              className="dd-btn dd-btn-coral"
              style={{ width: 50, height: 50, padding: 0, flex: "none" }}
            >
              <Icon name="Send" size={20} />
            </button>
          </form>
          <p className="dd-disclaimer justify-content-center mt-2 d-none d-sm-flex">
            <Icon name="MessageCircle" size={12} /> 도담은 정책 이해를 돕는 안내예요. 최종 신청 가능 여부는 공식 기관 확인이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
