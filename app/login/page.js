"use client";

// =========================================================================
// 도담 — 로그인 (/login)
// 의도: 이메일·비밀번호 + 간편 로그인으로 진입. (자리표시 핸들러)
// 구성: 브랜드 패널 + 로그인 카드(입력/옵션/소셜/회원가입 링크).
// =========================================================================
import { useState } from "react";
import { useContext } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/AuthShell";
import Icon from "@/app/components/Icon";
import authApi from "@/apis/authApi";
import { AuthContext } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await authApi.login({ email, password: pw });
      const { access_token, user } = response.data;

      authContext.loginAuth(user, access_token, remember);
      router.push("/mypage");
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          "로그인에 실패했어요. 이메일과 비밀번호를 확인해주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell aside={{ title: <>다시 오셨네요!<br />도담이 기다리고 있었어요</> }}>
      <div className="dd-card dd-card-lg" style={{ padding: 30 }}>
        <h1 className="dd-title" style={{ fontSize: 26 }}>로그인</h1>
        <p className="mt-1 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-500)" }}>
          도담 계정으로 맞춤 추천과 저장 기능을 이용하세요.
        </p>

        <form className="mt-4 d-flex flex-column gap-3" onSubmit={submit}>
          <div>
            <label className="dd-label">이메일</label>
            <div className="dd-field">
              <span className="dd-field-icon"><Icon name="User" size={18} /></span>
              <input
                type="email"
                className="dd-input"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div>
            <div className="d-flex align-items-center justify-content-between">
              <label className="dd-label mb-0">비밀번호</label>
              <Link href="#" className="dd-link" style={{ fontSize: 13 }}>비밀번호 찾기</Link>
            </div>
            <div className="dd-field mt-2">
              <span className="dd-field-icon"><Icon name="ShieldCheck" size={18} /></span>
              <input
                type={showPw ? "text" : "password"}
                className="dd-input"
                placeholder="비밀번호"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingRight: 48 }}
              />
              <button type="button" className="dd-field-eye" onClick={() => setShowPw((v) => !v)} aria-label="비밀번호 표시">
                <Icon name={showPw ? "CircleAlert" : "BadgeCheck"} size={17} />
              </button>
            </div>
          </div>

          <label className="dd-check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            로그인 상태 유지
          </label>

          {errorMessage && (
            <p className="dd-disclaimer mb-0" style={{ color: "var(--dd-coral)" }}>
              <Icon name="CircleAlert" size={13} /> {errorMessage}
            </p>
          )}

          <button type="submit" className="dd-btn dd-btn-coral dd-btn-block dd-btn-lg" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"} <Icon name="ArrowRight" size={18} />
          </button>
        </form>

        <p className="text-center mt-4 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-500)" }}>
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="dd-link">회원가입</Link>
        </p>
      </div>
    </AuthShell>
  );
}
