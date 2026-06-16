// =========================================================================
// 도담 — 공통 푸터
// =========================================================================
import Link from "next/link";
import Icon from "@/app/components/Icon";
import { DISCLAIMER_TEXT } from "@/app/data/constants";

export default function Footer() {
  return (
    <footer className="dd-footer">
      <div className="dd-shell" style={{ paddingTop: 48, paddingBottom: 40 }}>
        <div className="d-flex flex-column flex-md-row justify-content-between gap-4">
          <div style={{ maxWidth: 360 }}>
            <div className="d-flex align-items-center gap-2">
              <span className="dd-logo-mark" style={{ width: 34, height: 34 }}>
                <Icon name="Baby" size={18} strokeWidth={2.2} />
              </span>
              <span className="fw-bold text-white" style={{ fontSize: 18 }}>도담</span>
            </div>
            <p className="mt-3 mb-0" style={{ fontSize: 14, color: "#a8a29e", lineHeight: 1.7 }}>
              가족 상황만 입력하면 받을 수 있는 육아·출산 복지를 AI가 찾아주는 서비스입니다.
            </p>
          </div>

          <div className="d-flex gap-5">
            <div>
              <p className="fw-semibold mb-3" style={{ color: "#e7e5e4", fontSize: 14 }}>서비스</p>
              <ul className="list-unstyled d-flex flex-column gap-2 mb-0" style={{ fontSize: 14 }}>
                <li><Link href="/recommend" className="text-decoration-none" style={{ color: "#a8a29e" }}>정책추천</Link></li>
                <li><Link href="/policies" className="text-decoration-none" style={{ color: "#a8a29e" }}>정책리스트</Link></li>
                <li><Link href="/chat" className="text-decoration-none" style={{ color: "#a8a29e" }}>챗봇</Link></li>
                <li><Link href="/mypage" className="text-decoration-none" style={{ color: "#a8a29e" }}>마이페이지</Link></li>
              </ul>
            </div>
            <div>
              <p className="fw-semibold mb-3" style={{ color: "#e7e5e4", fontSize: 14 }}>참고 출처</p>
              <ul className="list-unstyled d-flex flex-column gap-2 mb-0" style={{ fontSize: 14, color: "#a8a29e" }}>
                <li>복지로 공개 정보</li>
                <li>아이사랑 보육포털</li>
                <li>보건복지부 정책자료</li>
              </ul>
            </div>
          </div>
        </div>

        <div
          className="mt-4 pt-4 d-flex flex-column flex-sm-row justify-content-between gap-2"
          style={{ borderTop: "1px solid #44403c", fontSize: 12, color: "#78716c" }}
        >
          <p className="mb-0">{DISCLAIMER_TEXT}</p>
          <p className="mb-0">© 2026 도담 · 팀 프로젝트</p>
        </div>
      </div>
    </footer>
  );
}
