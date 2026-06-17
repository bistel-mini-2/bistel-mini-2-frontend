// =========================================================================
// 도담 — 개인정보 수집·이용 동의 (/privacy)
// 의도: 회원가입 약관 동의에서 연결되는 개인정보 처리방침/동의 문서.
// 수집 항목 표 + 목적·보유기간·권리 안내. LegalDoc 공용 레이아웃 사용.
// =========================================================================
import LegalDoc from "@/app/components/LegalDoc";

const COLLECT_ROWS = [
  { type: "필수", items: "이메일, 비밀번호, 이름(닉네임)", purpose: "회원 식별 및 로그인, 서비스 제공", keep: "회원 탈퇴 시까지" },
  { type: "필수", items: "가족 구성·자녀 연령·가구 소득 구간·거주 지역·특수 상황", purpose: "맞춤 정책 추천 및 지원 가능성 안내", keep: "회원 탈퇴 시까지" },
  { type: "자동", items: "서비스 이용 기록, 접속 로그", purpose: "서비스 품질 개선 및 부정 이용 방지", keep: "수집일로부터 1년" },
];

const SECTIONS = [
  {
    id: "items",
    title: "수집하는 개인정보 항목",
    body: (
      <>
        <p>도담은 회원가입과 맞춤 추천 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
        <div className="dd-card" style={{ overflow: "hidden" }}>
          <table className="dd-table">
            <thead>
              <tr>
                <th style={{ width: "14%" }}>구분</th>
                <th style={{ width: "38%", background: "#fff", color: "var(--dd-ink)" }}>수집 항목</th>
                <th style={{ width: "30%", background: "#fff", color: "var(--dd-ink)" }}>수집 목적</th>
                <th style={{ width: "18%", background: "#fff", color: "var(--dd-ink)" }}>보유기간</th>
              </tr>
            </thead>
            <tbody>
              {COLLECT_ROWS.map((r, i) => (
                <tr key={i}>
                  <td>
                    <span className={"dd-pill " + (r.type === "자동" ? "dd-pill-stone" : "dd-pill-coral")}>{r.type}</span>
                  </td>
                  <td style={{ color: "var(--dd-stone-600)" }}>{r.items}</td>
                  <td style={{ color: "var(--dd-stone-600)" }}>{r.purpose}</td>
                  <td style={{ color: "var(--dd-stone-600)" }}>{r.keep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mb-0 mt-2 dd-subtle" style={{ fontSize: 13 }}>
          ※ 가구 소득은 구체적 금액이 아닌 “구간” 정보로만 수집하며, 민감정보는 별도 동의 없이 수집하지 않습니다.
        </p>
      </>
    ),
  },
  {
    id: "purpose",
    title: "개인정보의 수집·이용 목적",
    body: (
      <ul className="mb-0 ps-3">
        <li>회원 식별·인증 및 회원제 서비스 제공</li>
        <li>가족 상황 기반 맞춤 복지정책 추천 및 지원 가능성 안내</li>
        <li>관심 정책·신청 진행 등 이용자 저장 기능 제공</li>
        <li>서비스 개선, 문의 응대, 부정 이용 방지</li>
      </ul>
    ),
  },
  {
    id: "keep",
    title: "보유 및 이용기간",
    body: (
      <p className="mb-0">
        수집한 개인정보는 수집·이용 목적이 달성되거나 회원이 탈퇴한 경우 지체 없이 파기합니다.
        다만 관련 법령에서 일정 기간 보존을 정한 경우 해당 기간 동안 보관합니다.
      </p>
    ),
  },
  {
    id: "third",
    title: "제3자 제공 및 처리위탁",
    body: (
      <p className="mb-0">
        도담은 이용자의 개인정보를 동의 없이 외부에 제공하지 않습니다. 정책 정보는 복지로 등 공개 자료를 참고할 뿐,
        이용자의 입력 정보가 해당 기관으로 전송되지는 않습니다. 서비스 운영을 위한 처리위탁이 필요한 경우 사전에 고지하고 동의를 받습니다.
      </p>
    ),
  },
  {
    id: "rights",
    title: "이용자의 권리와 행사 방법",
    body: (
      <ul className="mb-0 ps-3">
        <li>이용자는 언제든지 본인의 개인정보를 조회·수정할 수 있습니다.(마이페이지)</li>
        <li>동의 철회 및 회원 탈퇴를 요청할 수 있으며, 요청 시 지체 없이 처리합니다.</li>
        <li>개인정보 열람·정정·삭제 요청은 고객센터를 통해 접수할 수 있습니다.</li>
      </ul>
    ),
  },
  {
    id: "refuse",
    title: "동의 거부 권리 및 불이익",
    body: (
      <p className="mb-0">
        이용자는 개인정보 수집·이용 동의를 거부할 권리가 있습니다. 다만 필수 항목에 동의하지 않을 경우
        회원가입 및 맞춤 추천 등 일부 서비스 이용이 제한될 수 있습니다.
      </p>
    ),
  },
  {
    id: "officer",
    title: "개인정보 보호책임자",
    body: (
      <p className="mb-0">
        개인정보 관련 문의는 도담 고객센터(데모용 연락처)로 접수해 주세요. 접수된 사항은 신속하게 처리하도록 노력합니다.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="개인정보 수집·이용 동의"
      updated="2026.06.16"
      intro="도담은 맞춤 추천 제공에 필요한 최소한의 정보만 수집하며, 가구 소득은 구간 정보로만 받습니다. 아래 내용을 확인하고 동의해 주세요."
      sections={SECTIONS}
    />
  );
}
