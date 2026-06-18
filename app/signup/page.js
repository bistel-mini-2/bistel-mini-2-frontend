"use client";

// =========================================================================
// 도담 — 회원가입 (/signup)
// 의도: 이름·이메일·비밀번호 + 약관 동의로 백엔드 인증 API에 가입한다.
// 구성: 브랜드 패널 + 가입 카드(입력/비밀번호 확인/약관 동의/로그인 링크).
// =========================================================================
import { useContext, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/app/components/AuthShell";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import authApi from "@/apis/authApi";
import familyProfileApi from "@/apis/familyProfileApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import { AuthContext } from "@/contexts/AuthContext";
import {
  DEFAULT_FAMILY,
  FAMILY_OPTIONS,
  createFamilyProfilePayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";

const TERMS = [
  { key: "service", label: "[필수] 도담 이용약관 동의", required: true },
  { key: "privacy", label: "[필수] 개인정보 수집·이용 동의", required: true },
];

const EMAIL_MAX_LENGTH = 255;
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;
const NUMBER_PATTERN = /\d/;
const SPECIAL_CHARACTER_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]/;

const getEmailValidationMessage = (email) => {
  if (email.trim().length === 0) {
    return "이메일을 입력해주세요.";
  }

  if (email.length > EMAIL_MAX_LENGTH) {
    return "이메일은 255자 이하로 입력해주세요.";
  }

  return "";
};

const getNicknameValidationMessage = (nickname) => {
  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length < NICKNAME_MIN_LENGTH) {
    return "닉네임은 2자 이상 입력해주세요.";
  }

  if (trimmedNickname.length > NICKNAME_MAX_LENGTH) {
    return "닉네임은 100자 이하로 입력해주세요.";
  }

  return "";
};

const getPasswordValidationMessage = (password) => {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return "비밀번호는 8자 이상 입력해주세요.";
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return "비밀번호는 72자 이하로 입력해주세요.";
  }

  if (/\s/.test(password)) {
    return "비밀번호에는 공백을 사용할 수 없어요.";
  }

  if (!ENGLISH_LETTER_PATTERN.test(password)) {
    return "비밀번호에는 영문자를 1개 이상 포함해주세요.";
  }

  if (!NUMBER_PATTERN.test(password)) {
    return "비밀번호에는 숫자를 1개 이상 포함해주세요.";
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "비밀번호에는 특수문자를 1개 이상 포함해주세요.";
  }

  return "";
};

export default function SignupPage() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", pw: "", pw2: "" });
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [isValidatingAccount, setIsValidatingAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountCreated, setIsAccountCreated] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setFamilyValue = (key, value) =>
    setFamily((f) => ({ ...f, [key]: value }));
  const allChecked = TERMS.every((t) => agree[t.key]);
  const requiredOk = TERMS.filter((t) => t.required).every((t) => agree[t.key]);
  const emailMessage = getEmailValidationMessage(form.email);
  const nicknameMessage = getNicknameValidationMessage(form.name);
  const passwordMessage = getPasswordValidationMessage(form.pw);
  const showNicknameMessage = form.name.length > 0 && !!nicknameMessage;
  const showPasswordMessage = form.pw.length > 0 && !!passwordMessage;
  const pwMismatch = form.pw2.length > 0 && form.pw !== form.pw2;
  const accountStepErrorMessage =
    emailMessage ||
    nicknameMessage ||
    passwordMessage ||
    (form.pw2.length === 0 ? "비밀번호 확인을 입력해주세요." : "") ||
    (pwMismatch ? "비밀번호가 일치하지 않아요." : "") ||
    (!requiredOk ? "필수 약관에 동의해주세요." : "");
  const accountStepInvalid = !!accountStepErrorMessage;
  const signupPayload = {
    email: form.email.trim(),
    password: form.pw,
    nickname: form.name.trim(),
  };
  const summaryFamily = normalizeFamilyProfile({
    ...family,
    name: form.name || DEFAULT_FAMILY.name,
  });

  const toggleAll = () => {
    const next = !allChecked;
    setAgree(TERMS.reduce((acc, t) => ({ ...acc, [t.key]: next }), {}));
  };

  const toggleSpecial = (value) =>
    setFamily((f) => ({
      ...f,
      special: f.special.includes(value)
        ? f.special.filter((s) => s !== value)
        : [...f.special, value],
    }));

  const selectChildAge = (value) =>
    setFamily((family) => ({
      ...family,
      childAge: value,
      childrenAges: [value],
    }));

  const submit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (accountStepInvalid) {
        setErrorMessage(accountStepErrorMessage);
        return;
      }

      if (isValidatingAccount) {
        return;
      }

      setErrorMessage("");
      setIsValidatingAccount(true);

      try {
        await authApi.validateSignup(signupPayload);
        setStep(2);
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            "회원가입 정보를 확인하지 못했어요. 입력한 정보를 다시 확인해주세요."
          )
        );
      } finally {
        setIsValidatingAccount(false);
      }
      return;
    }

    if (isSubmitting) return;

    setErrorMessage("");
    setIsSubmitting(true);

    let accountCreated = isAccountCreated;

    try {
      if (!accountCreated) {
        const { accessToken, user } = await authApi.signup(signupPayload);

        authContext.loginAuth(user, accessToken, true);
        accountCreated = true;
        setIsAccountCreated(true);
      }

      await familyProfileApi.updateMe(createFamilyProfilePayload(summaryFamily));
      router.push("/mypage");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          accountCreated
            ? "회원가입은 완료됐지만 가족 상황 저장에 실패했어요. 다시 시도해주세요."
            : "회원가입에 실패했어요. 입력한 정보를 다시 확인해주세요."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell wide aside={{ title: <>1분이면 충분해요,<br />지금 도담을 시작하세요</> }}>
      <div className="dd-card dd-card-lg" style={{ padding: 30 }}>
        <h1 className="dd-title" style={{ fontSize: 26 }}>회원가입</h1>
        <p className="mt-1 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-500)" }}>
          가족 상황을 저장하고 더 정확한 맞춤 추천을 받아보세요.
        </p>
        <div className="mt-3">
          <StepIndicator current={step} steps={["계정 정보", "가족 상황", "가입 완료"]} />
        </div>

        <form className="mt-4 d-flex flex-column gap-3" onSubmit={submit}>
          {step === 1 ? (
            <>
              <div>
                <label className="dd-label">이름(닉네임)</label>
                <div className="dd-field">
                  <span className="dd-field-icon"><Icon name="User" size={18} /></span>
                  <input className="dd-input" placeholder="도담에서 불릴 이름" value={form.name} onChange={(e) => set("name", e.target.value)} required minLength={NICKNAME_MIN_LENGTH} maxLength={NICKNAME_MAX_LENGTH} style={{ borderColor: showNicknameMessage ? "var(--dd-coral-200)" : undefined }} />
                </div>
              </div>
              {showNicknameMessage && (
                <p className="dd-disclaimer mb-0" style={{ color: "var(--dd-coral)" }}>
                  <Icon name="CircleAlert" size={13} /> {nicknameMessage}
                </p>
              )}

              <div>
                <label className="dd-label">이메일</label>
                <div className="dd-field">
                  <span className="dd-field-icon"><Icon name="FileText" size={18} /></span>
                  <input type="email" className="dd-input" placeholder="이메일 주소" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" required maxLength={EMAIL_MAX_LENGTH} />
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12 col-sm-6">
                  <label className="dd-label">비밀번호</label>
                  <div className="dd-field">
                    <span className="dd-field-icon"><Icon name="ShieldCheck" size={18} /></span>
                    <input type={showPw ? "text" : "password"} className="dd-input" placeholder="영문·숫자·특수문자 포함" value={form.pw} onChange={(e) => set("pw", e.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} style={{ paddingRight: 48, borderColor: showPasswordMessage ? "var(--dd-coral-200)" : undefined }} />
                    <button type="button" className="dd-field-eye" onClick={() => setShowPw((v) => !v)} aria-label="비밀번호 표시">
                      <Icon name={showPw ? "CircleAlert" : "BadgeCheck"} size={17} />
                    </button>
                  </div>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="dd-label">비밀번호 확인</label>
                  <div className="dd-field">
                    <span className="dd-field-icon"><Icon name="ShieldCheck" size={18} /></span>
                    <input type={showPw ? "text" : "password"} className="dd-input" placeholder="다시 입력" value={form.pw2} onChange={(e) => set("pw2", e.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH}
                      style={{ borderColor: pwMismatch ? "var(--dd-coral-200)" : undefined }} />
                  </div>
                </div>
              </div>
              {showPasswordMessage && (
                <p className="dd-disclaimer mb-0" style={{ color: "var(--dd-coral)" }}>
                  <Icon name="CircleAlert" size={13} /> {passwordMessage}
                </p>
              )}
              {pwMismatch && (
                <p className="dd-disclaimer mb-0" style={{ color: "var(--dd-coral)" }}>
                  <Icon name="CircleAlert" size={13} /> 비밀번호가 일치하지 않아요.
                </p>
              )}

              {/* 약관 */}
              <div className="dd-card-soft" style={{ padding: 16 }}>
                <label className="dd-check fw-bold" style={{ color: "var(--dd-ink-80)", fontSize: 14 }}>
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  전체 동의
                </label>
                <hr className="dd-divider my-2" />
                <div className="d-flex flex-column gap-2">
                  {TERMS.map((t) => (
                    <div key={t.key} className="d-flex align-items-center justify-content-between">
                      <label className="dd-check">
                        <input type="checkbox" checked={!!agree[t.key]} onChange={(e) => setAgree((a) => ({ ...a, [t.key]: e.target.checked }))} />
                        {t.label}
                      </label>
                      <Link href={t.key === "service" ? "/terms" : "/privacy"} className="dd-subtle" style={{ fontSize: 12 }}>보기</Link>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="dd-label">가족 구성</label>
                <div className="dd-radio-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                  {FAMILY_OPTIONS.stage.map((o) => (
                    <label key={o.value} className={"dd-choice" + (family.stage === o.value ? " is-checked" : "")}>
                      <input type="radio" name="stage" checked={family.stage === o.value} onChange={() => setFamilyValue("stage", o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="dd-label">자녀 연령대 <span className="dd-subtle" style={{ fontWeight: 400 }}>(하나 선택)</span></label>
                <div className="d-flex flex-wrap gap-2">
                  {FAMILY_OPTIONS.childAge.map((o) => {
                    const on = summaryFamily.childAge === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => selectChildAge(o.value)}
                        className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                        style={{ padding: "9px 14px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                      >
                        {on && <Icon name="Check" size={14} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="row g-2">
                <div className="col-12 col-sm-6">
                  <label className="dd-label">가구 소득</label>
                  <select className="dd-select" value={family.income} onChange={(e) => setFamilyValue("income", e.target.value)}>
                    {FAMILY_OPTIONS.income.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12 col-sm-6">
                  <label className="dd-label">거주 지역</label>
                  <select className="dd-select" value={family.region} onChange={(e) => setFamilyValue("region", e.target.value)}>
                    {FAMILY_OPTIONS.region.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="dd-label">특수 상황 <span className="dd-subtle" style={{ fontWeight: 400 }}>(해당되는 항목 모두 선택)</span></label>
                <div className="d-flex flex-wrap gap-2">
                  {FAMILY_OPTIONS.special.map((o) => {
                    const on = family.special.includes(o.value);
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => toggleSpecial(o.value)}
                        className={"dd-pill " + (on ? "dd-pill-coral" : "dd-pill-stone")}
                        style={{ padding: "9px 14px", fontSize: 14, border: on ? "1px solid var(--dd-coral-200)" : "1px solid transparent" }}
                      >
                        {on && <Icon name="Check" size={14} />}
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="dd-card-soft" style={{ padding: 16 }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <Icon name="ClipboardList" size={16} style={{ color: "var(--dd-coral)" }} />
                  <strong style={{ fontSize: 14 }}>입력 정보 요약</strong>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {familyRows(summaryFamily).map((r) => (
                    <span key={r.label} className="dd-pill dd-pill-stone">
                      {r.label}: {r.value}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {errorMessage && (
            <p className="dd-disclaimer mb-0" style={{ color: "var(--dd-coral)" }}>
              <Icon name="CircleAlert" size={13} /> {errorMessage}
            </p>
          )}

          <div className="d-flex gap-2">
            {step === 2 && (
              <button type="button" className="dd-btn dd-btn-ghost dd-btn-lg" onClick={() => setStep(1)} disabled={isSubmitting} style={{ flex: "none" }}>
                <Icon name="ArrowLeft" size={18} /> 이전
              </button>
            )}
            <button type="submit" className="dd-btn dd-btn-coral dd-btn-block dd-btn-lg" disabled={(step === 1 && accountStepInvalid) || isValidatingAccount || isSubmitting}>
              {step === 1
                ? isValidatingAccount
                  ? "계정 확인 중..."
                  : "가족 상황 입력하기"
                : isSubmitting
                  ? "가입 처리 중..."
                  : isAccountCreated
                    ? "가족 상황 저장하기"
                    : "가입하고 시작하기"} <Icon name="ArrowRight" size={18} />
            </button>
          </div>
        </form>

        <p className="text-center mt-4 mb-0" style={{ fontSize: 14, color: "var(--dd-stone-500)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="dd-link">로그인</Link>
        </p>
      </div>
    </AuthShell>
  );
}
