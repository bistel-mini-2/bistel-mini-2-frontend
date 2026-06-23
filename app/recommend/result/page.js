"use client";

// =========================================================================
// 도담 — 추천 결과 (/recommend/result)
// 의도: 입력값 기반 맞춤 정책을 순위·매칭률과 함께 제시하고 다음 행동(상세/
//       가능성 분석)으로 연결한다.
// 구성: 스텝 인디케이터(2단계) · 결과 헤더 + 저장 · 추천 카드 리스트 ·
//       하단 "더 많은 정책 보기".
// =========================================================================
import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import eligibilityApi from "@/apis/eligibilityApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import StepIndicator from "@/app/components/StepIndicator";
import PolicyCard from "@/app/components/PolicyCard";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { getRecommended } from "@/app/data/policies";
import {
  DEFAULT_FAMILY,
  FAMILY_PROFILE_KEY,
  RECOMMENDATION_INPUT_KEY,
  createRecommendationPayload,
  normalizeFamilyProfile,
} from "@/app/data/family";

export default function RecommendResultPage() {
  const router = useRouter();
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [recommendationInput, setRecommendationInput] = useState(null);
  const [saved, setSaved] = useState(false);
  const [pendingPolicyId, setPendingPolicyId] = useState("");
  const [eligibilityError, setEligibilityError] = useState("");
  const [requestId] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return new URLSearchParams(window.location.search).get("requestId") || "";
  });
  const recommended = getRecommended(family);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedRecommendationInput = window.localStorage.getItem(
      RECOMMENDATION_INPUT_KEY
    );

    if (storedRecommendationInput) {
      try {
        const parsedInput = JSON.parse(storedRecommendationInput);
        const isSameRecommendation =
          !requestId || String(parsedInput.requestId) === String(requestId);

        if (!isSameRecommendation) {
          throw new Error("Stored recommendation input does not match requestId");
        }

        const nextFamily = normalizeFamilyProfile(parsedInput.family);

        startTransition(() => {
          setFamily(nextFamily);
          setRecommendationInput({
            ...parsedInput,
            family: nextFamily,
          });
        });
        return;
      } catch {
        window.localStorage.removeItem(RECOMMENDATION_INPUT_KEY);
      }
    }

    const storedFamily = window.localStorage.getItem(FAMILY_PROFILE_KEY);
    if (!storedFamily) {
      return;
    }

    try {
      const nextFamily = normalizeFamilyProfile(JSON.parse(storedFamily));
      startTransition(() => setFamily(nextFamily));
    } catch {
      window.localStorage.removeItem(FAMILY_PROFILE_KEY);
    }
  }, [requestId]);

  const startEligibilityRequest = async (policy) => {
    if (!policy || pendingPolicyId) {
      return;
    }

    const policyIdentifier = policy.backendSlug || policy.id;
    setPendingPolicyId(policy.id);
    setEligibilityError("");

    try {
      const userConditions =
        recommendationInput?.selectedConditions ||
        createRecommendationPayload(family);
      const response = await eligibilityApi.createRequest({
        policyId: policyIdentifier,
        userConditions,
        sourceRefId: recommendationInput?.requestId || requestId || policyIdentifier,
        rawQuery: recommendationInput?.rawQuery,
      });
      const eligibilityRequestId = response?.request_id || response?.requestId;

      if (!eligibilityRequestId) {
        throw new Error("분석 요청 번호를 받지 못했어요.");
      }

      router.push(
        `/policies/${policy.id}/eligibility?requestId=${encodeURIComponent(
          eligibilityRequestId
        )}`
      );
    } catch (error) {
      if (error?.status === 401) {
        const params = new URLSearchParams({
          next: `/recommend/result${requestId ? `?requestId=${requestId}` : ""}`,
        });
        router.push(`/login?${params.toString()}`);
        return;
      }

      setEligibilityError(
        getApiErrorMessage(error, "지원 가능성 분석 요청을 시작하지 못했어요.")
      );
    } finally {
      setPendingPolicyId("");
    }
  };

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        <StepIndicator current={2} />

        {/* 결과 헤더 */}
        <div className="mt-4 d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
          <div>
            <span className="dd-pill dd-pill-coral">
              <Icon name="Sparkles" size={14} /> AI 맞춤 추천 완료
            </span>
            <h1 className="dd-title mt-2" style={{ fontSize: 30 }}>
              {family.name}님께 추천하는 맞춤 정책이에요!
            </h1>
            <p className="mt-2 mb-0" style={{ fontSize: 16, color: "var(--dd-stone-600)" }}>
              입력하신 가족 상황과 가장 잘 맞는 순서로 정리했어요.
            </p>
          </div>
          <button
            type="button"
            className={"dd-btn dd-btn-sm " + (saved ? "dd-btn-coral" : "dd-btn-ghost")}
            onClick={() => setSaved((v) => !v)}
            style={{ flex: "none" }}
          >
            <Icon name="Bookmark" size={15} fill={saved ? "currentColor" : "none"} />
            {saved ? "결과 저장됨" : "결과로 저장하기"}
          </button>
        </div>

        {eligibilityError && (
          <p
            className="dd-disclaimer mt-3 mb-0"
            role="alert"
            style={{ color: "var(--dd-coral)" }}
          >
            <Icon name="CircleAlert" size={13} /> {eligibilityError}
          </p>
        )}

        {/* 추천 카드 리스트 */}
        <div className="row g-4 mt-1">
          {recommended.map((p, i) => (
            <div className="col-12 col-md-6" key={p.id}>
              <PolicyCard policy={p} rank={i + 1} match={p.match} showMeta>
                <Link href={`/policies/${p.id}`} className="dd-btn dd-btn-ghost dd-btn-sm">
                  <Icon name="FileText" size={15} /> 자세히 보기
                </Link>
                <button
                  type="button"
                  className="dd-btn dd-btn-blue dd-btn-sm"
                  onClick={() => startEligibilityRequest(p)}
                  disabled={Boolean(pendingPolicyId)}
                  aria-busy={pendingPolicyId === p.id}
                >
                  <Icon
                    name={pendingPolicyId === p.id ? "LoaderCircle" : "ShieldCheck"}
                    size={15}
                  />
                  {pendingPolicyId === p.id ? "분석 요청 중..." : "지원 가능성 분석"}
                </button>
              </PolicyCard>
            </div>
          ))}
        </div>

        {/* 하단 */}
        <div className="mt-4 d-flex flex-column align-items-center gap-3 text-center">
          <DisclaimerNote />
          <Link href="/policies" className="dd-btn dd-btn-ghost">
            더 많은 정책 보기 <Icon name="ArrowRight" size={17} />
          </Link>
        </div>
      </main>
    </div>
  );
}
