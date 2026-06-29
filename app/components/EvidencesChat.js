// 도담 — 채팅 답변용 RAG 근거(evidence) 인용 카드 리스트
import Icon from "@/app/components/Icon";

// 백엔드가 snippet에 "정책명: X\n섹션: Y\n내용:\n..." prefix를 박아서 옴.
// 그대로 보여주면 모든 카드의 앞 3줄이 똑같아 보임 → 본문은 prefix 빼고 보여줌.
const parseSnippet = (snippet) => {
  if (typeof snippet !== "string") return snippet || "";
  const sectionMatch = snippet.match(/^정책명:[^\n]*\n섹션:\s*([^\n]+)\n내용:\s*\n?/);
  if (!sectionMatch) return snippet;
  return snippet.slice(sectionMatch[0].length).trim();
};

export default function EvidencesChat({ evidences = [] }) {
  const list = Array.isArray(evidences) ? evidences : [];

  if (list.length === 0) return null;

  return (
    <details className="dd-evidences-chat">
      <summary className="dd-evidences-chat-summary">
        <Icon name="FileText" size={13} />
        참고한 근거 <span className="dd-evidences-chat-count">{list.length}</span>
        <Icon name="ChevronDown" size={14} className="dd-evidences-chat-chevron" />
      </summary>
      <div className="dd-evidences-chat-body">
        {list.slice(0, 4).map((ev, index) => (
          <div key={ev.chunk_id || ev.source_url || index} className="dd-evidences-chat-card">
            <span className="dd-evidences-chat-source">
              <Icon name="FileText" size={13} /> {ev.source_title || "출처"}
            </span>
            <p>{parseSnippet(ev.snippet)}</p>
            {ev.source_url && (
              <a href={ev.source_url} target="_blank" rel="noopener noreferrer">
                원문 보기 <Icon name="ExternalLink" size={12} />
              </a>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
