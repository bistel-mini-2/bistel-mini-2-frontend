"use client";

// =========================================================================
// 도담 — 마이페이지 (/mypage)
// 의도: 사용자의 가족 프로필·관심 정책·신청 진행·이력을 한 페이지에서
//       탭 전환(state)으로 모아본다. 별도 라우트 없이 탭만 전환.
// 탭: 가족 프로필 / 관심 정책 / 신청 체크리스트 / 추천 이력 / 비교 이력 / 상담 이력
// 저장 리스트(관심·추천·비교·상담)는 개별 삭제 + 전체 삭제를 지원한다.
// =========================================================================
import {
  Suspense,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/app/components/Header";
import Icon from "@/app/components/Icon";
import PolicyCard from "@/app/components/PolicyCard";
import DisclaimerNote from "@/app/components/DisclaimerNote";
import { getApiErrorMessage } from "@/apis/axiosConfig";
import compareApi from "@/apis/compareApi";
import chatApi from "@/apis/chatApi";
import { getRecommendationHistory } from "@/apis/recommendationApi";
import { AuthContext } from "@/contexts/AuthContext";
import familyProfileApi from "@/apis/familyProfileApi";
import userApi from "@/apis/userApi";
import {
  DEFAULT_FAMILY,
  FAMILY_OPTIONS,
  createFamilyProfilePayload,
  familyRows,
  normalizeFamilyProfile,
} from "@/app/data/family";
import { useLiked } from "@/app/data/useLiked";

const TABS = [
  { key: "account", label: "계정 정보", icon: "User" },
  { key: "profile", label: "가족 프로필", icon: "Users" },
  { key: "liked", label: "관심 정책", icon: "Heart" },
  { key: "recHistory", label: "추천 이력", icon: "Target" },
  { key: "compare", label: "비교 이력", icon: "GitCompare" },
  { key: "chatHistory", label: "상담 이력", icon: "MessageCircle" },
];
const TAB_KEYS = new Set(TABS.map((tab) => tab.key));
const MYPAGE_RAIL_WIDTH = 960;
const MYPAGE_CONTENT_WIDTH = 720;

// 채팅 화면이 활성 세션을 복원할 때 읽는 sessionStorage 키.
// 마이페이지에서 상담 항목 클릭 시 이 키에 세션 id를 심어두면,
// /chat 진입 시 기존 복원 로직이 해당 세션을 자동으로 연다(채팅 화면 무변경).
const ACTIVE_CHAT_SESSION_STORAGE_KEY = "dodam.activeChatSessionId";

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 100;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;
const COMPARE_HISTORY_PAGE_SIZE = 10;
const ENGLISH_LETTER_PATTERN = /[A-Za-z]/;
const NUMBER_PATTERN = /\d/;
const SPECIAL_CHARACTER_PATTERN = /[!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~]/;
const EMPTY_PASSWORD_DRAFT = {
  currentPassword: "",
  newPassword: "",
  newPasswordConfirm: "",
};

const getPositivePage = (value) => {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
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
    return "새 비밀번호는 8자 이상 입력해주세요.";
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return "새 비밀번호는 72자 이하로 입력해주세요.";
  }

  if (/\s/.test(password)) {
    return "새 비밀번호에는 공백을 사용할 수 없어요.";
  }

  if (!ENGLISH_LETTER_PATTERN.test(password)) {
    return "새 비밀번호에는 영문자를 1개 이상 포함해주세요.";
  }

  if (!NUMBER_PATTERN.test(password)) {
    return "새 비밀번호에는 숫자를 1개 이상 포함해주세요.";
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "새 비밀번호에는 특수문자를 1개 이상 포함해주세요.";
  }

  return "";
};

// 리스트 상단 — 건수 + 전체 삭제
function ListHeader({ text, onClear, label = "전체 삭제", disabled = false }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
      <span className="dd-subtle" style={{ fontSize: 14 }}>
        {text}
      </span>
      <button
        type="button"
        className="dd-btn dd-btn-ghost dd-btn-sm"
        onClick={onClear}
        disabled={disabled}
      >
        <Icon name="Trash2" size={16} /> {label}
      </button>
    </div>
  );
}

// 개별 삭제 버튼
function DelBtn({ onClick, style, disabled = false }) {
  return (
    <button
      type="button"
      className="dd-del-btn"
      onClick={onClick}
      aria-label="삭제"
      style={style}
      disabled={disabled}
    >
      <Icon name="Trash2" size={16} />
    </button>
  );
}

function toFavoritePolicyCard(item) {
  const policySlug = item.policy_slug || item.slug || item.policy_id;
  const policyName = item.policy_name || item.name || "정책명 확인 필요";
  const savedDate = item.saved_at
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(item.saved_at))
    : "저장일 정보 없음";

  return {
    id: policySlug,
    name: policyName,
    icon: "Heart",
    tag: item.category || "복지 정책",
    tagTone: "coral",
    summary: item.region
      ? `지원 지역: ${item.region === "national" ? "전국" : item.region}`
      : "관심 정책으로 저장한 정책이에요.",
    amount: item.category || "분야 정보 없음",
    period: `저장일 ${savedDate}`,
  };
}

function formatCompareDate(value) {
  if (!value) {
    return "비교일 정보 없음";
  }

  const comparedAt = new Date(value);
  if (Number.isNaN(comparedAt.getTime())) {
    return "비교일 정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(comparedAt);
}

function formatHistoryDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// 빈 상태
function EmptyState({
  icon,
  tile = "rose",
  title,
  desc,
  href,
  cta,
  ctaIcon,
  maxWidth = 560,
}) {
  return (
    <div
      className="dd-card-soft text-center"
      style={{ padding: "44px 24px", maxWidth, margin: "0 auto" }}
    >
      <span
        className={"dd-icon-tile dd-tile-" + tile + " mx-auto mb-3"}
        style={{ width: 56, height: 56 }}
      >
        <Icon name={icon} size={26} />
      </span>
      <strong className="d-block mb-2" style={{ fontSize: 17 }}>
        {title}
      </strong>
      <p className="dd-subtle mb-3" style={{ fontSize: 14, lineHeight: 1.6 }}>
        {desc}
      </p>
      <Link href={href} className="dd-btn dd-btn-coral">
        {ctaIcon && <Icon name={ctaIcon} size={16} />} {cta}
      </Link>
    </div>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user: authUser,
    isAuthenticated,
    isLoading,
    updateUserAuth,
  } = useContext(AuthContext);
  const selectedTab = searchParams.get("tab");
  const tab = TAB_KEYS.has(selectedTab) ? selectedTab : "account";
  const [userProfile, setUserProfile] = useState(authUser);
  const [userDraft, setUserDraft] = useState({
    nickname: authUser?.nickname || "",
  });
  const [passwordDraft, setPasswordDraft] = useState(EMPTY_PASSWORD_DRAFT);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [userSaved, setUserSaved] = useState(false);
  const [userError, setUserError] = useState("");
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [familyProfile, setFamilyProfile] = useState(DEFAULT_FAMILY);
  const [familyDraft, setFamilyDraft] = useState(DEFAULT_FAMILY);
  const [isEditingFamily, setIsEditingFamily] = useState(false);
  const [familySaved, setFamilySaved] = useState(false);
  const [familyError, setFamilyError] = useState("");
  const [isSavingFamily, setIsSavingFamily] = useState(false);
  const {
    items: likedItems,
    loading: likedLoading,
    error: likedError,
    pendingIds: pendingLikedIds,
    remove: removeLiked,
    clear: clearLiked,
    refresh: refreshLiked,
  } = useLiked();
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState("");
  const [compares, setCompares] = useState([]);
  const comparePage =
    tab === "compare" ? getPositivePage(searchParams.get("page")) : 1;
  const [compareMeta, setCompareMeta] = useState({
    page: 1,
    size: COMPARE_HISTORY_PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");
  const [compareActionError, setCompareActionError] = useState("");
  const [pendingCompareDeleteId, setPendingCompareDeleteId] = useState(null);
  const [isClearingCompares, setIsClearingCompares] = useState(false);
  const [compareReloadKey, setCompareReloadKey] = useState(0);
  const [chats, setChats] = useState([]);
  const [chatsLoading, setChatsLoading] = useState(false);
  const [chatsError, setChatsError] = useState("");
  const [chatActionError, setChatActionError] = useState("");
  const [isClearingChats, setIsClearingChats] = useState(false);

  const liked = likedItems.map(toFavoritePolicyCard);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const nextPath =
        typeof window === "undefined"
          ? "/mypage"
          : `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    }
  }, [isAuthenticated, isLoading, router]);

  const handleTabChange = (nextTab) => {
    const nextPath =
      nextTab === "account" ? "/mypage" : `/mypage?tab=${nextTab}`;
    router.replace(nextPath, { scroll: false });
  };

  const moveComparePage = (nextPage) => {
    const page = Math.max(Number(nextPage) || 1, 1);
    const pageQuery = page > 1 ? `&page=${page}` : "";
    router.replace(`/mypage?tab=compare${pageQuery}`, { scroll: false });
  };

  const refreshCompareHistory = (nextPage = comparePage) => {
    if (nextPage !== comparePage) {
      moveComparePage(nextPage);
      return;
    }

    setCompareReloadKey((current) => current + 1);
  };

  const handleDeleteCompareHistory = async (historyId) => {
    const normalizedId = String(historyId);
    setPendingCompareDeleteId(normalizedId);
    setCompareActionError("");

    try {
      await compareApi.deleteCompareHistory(normalizedId);
      const nextTotal = Math.max((compareMeta.total || compares.length) - 1, 0);
      const nextTotalPages = Math.ceil(nextTotal / COMPARE_HISTORY_PAGE_SIZE);
      const shouldMovePreviousPage =
        compares.length === 1 &&
        comparePage > 1 &&
        comparePage > nextTotalPages;

      refreshCompareHistory(
        shouldMovePreviousPage ? comparePage - 1 : comparePage,
      );
    } catch (error) {
      setCompareActionError(
        getApiErrorMessage(error, "비교 이력을 삭제하지 못했어요."),
      );
    } finally {
      setPendingCompareDeleteId(null);
    }
  };

  const handleClearCompareHistory = async () => {
    setIsClearingCompares(true);
    setCompareActionError("");

    try {
      await compareApi.deleteAllCompareHistory();
      refreshCompareHistory(1);
    } catch (error) {
      setCompareActionError(
        getApiErrorMessage(error, "비교 이력을 모두 삭제하지 못했어요."),
      );
    } finally {
      setIsClearingCompares(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    const loadUserProfile = async () => {
      try {
        const nextUser = await userApi.getMe();
        if (ignore || !nextUser) {
          return;
        }

        startTransition(() => {
          setUserProfile(nextUser);
          setUserDraft({ nickname: nextUser.nickname || "" });
          setUserError("");
          updateUserAuth(nextUser);
        });
      } catch (error) {
        if (!ignore) {
          setUserError(
            getApiErrorMessage(error, "계정 정보를 불러오지 못했어요."),
          );
        }
      }
    };

    loadUserProfile();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isLoading, updateUserAuth]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    async function loadCompareHistory() {
      setCompareLoading(true);
      setCompareError("");

      try {
        const response = await compareApi.getCompareHistory({
          page: comparePage,
          size: COMPARE_HISTORY_PAGE_SIZE,
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setCompares(response?.data?.items || []);
          setCompareActionError("");
          setCompareMeta(
            response?.meta || {
              page: comparePage,
              size: COMPARE_HISTORY_PAGE_SIZE,
              total: 0,
              total_pages: 0,
            },
          );
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        setCompares([]);
        setCompareMeta({
          page: comparePage,
          size: COMPARE_HISTORY_PAGE_SIZE,
          total: 0,
          total_pages: 0,
        });
        setCompareError(
          getApiErrorMessage(error, "비교 이력을 불러오지 못했어요."),
        );
      } finally {
        if (!controller.signal.aborted) {
          setCompareLoading(false);
        }
      }
    }

    loadCompareHistory();

    return () => controller.abort();
  }, [comparePage, compareReloadKey, isAuthenticated, isLoading]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isLoading ||
      !isAuthenticated ||
      tab !== "recHistory"
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadRecommendationHistory() {
      setRecsLoading(true);
      setRecsError("");

      try {
        const items = await getRecommendationHistory(20, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setRecs(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        setRecs([]);
        setRecsError(
          getApiErrorMessage(error, "추천 이력을 불러오지 못했어요."),
        );
      } finally {
        if (!controller.signal.aborted) {
          setRecsLoading(false);
        }
      }
    }

    loadRecommendationHistory();

    return () => controller.abort();
  }, [isAuthenticated, isLoading, tab]);

  // 상담 이력 탭: 실제 챗봇 세션 목록(최신 20건)을 조회한다.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      isLoading ||
      !isAuthenticated ||
      tab !== "chatHistory"
    ) {
      return;
    }

    const controller = new AbortController();

    async function loadChatSessions() {
      setChatsLoading(true);
      setChatsError("");
      setChatActionError("");

      try {
        const sessions = await chatApi.getSessions({
          limit: 20,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setChats(Array.isArray(sessions) ? sessions : []);
        }
      } catch (error) {
        if (error?.code === "ERR_CANCELED") return;
        setChats([]);
        setChatsError(
          getApiErrorMessage(error, "상담 이력을 불러오지 못했어요."),
        );
      } finally {
        if (!controller.signal.aborted) {
          setChatsLoading(false);
        }
      }
    }

    loadChatSessions();

    return () => controller.abort();
  }, [isAuthenticated, isLoading, tab]);

  // 상담 항목 클릭 → 세션 id를 스토리지에 심고 /chat으로 이동(기존 복원 로직이 연다).
  const openChatSession = (sessionId) => {
    if (typeof window !== "undefined" && sessionId) {
      window.sessionStorage.setItem(
        ACTIVE_CHAT_SESSION_STORAGE_KEY,
        String(sessionId),
      );
    }
    router.push("/chat");
  };

  // 단건 삭제: 서버 삭제 성공 후 목록에서 제거.
  const deleteChatSession = async (sessionId) => {
    setChatActionError("");
    try {
      await chatApi.deleteSession(sessionId);
      setChats((list) => list.filter((session) => session.id !== sessionId));
    } catch (error) {
      setChatActionError(
        getApiErrorMessage(error, "상담 기록을 삭제하지 못했어요."),
      );
    }
  };

  // 전체 삭제: 현재 목록의 모든 세션을 다건 삭제.
  const clearChatSessions = async () => {
    if (isClearingChats || chats.length === 0) {
      return;
    }
    setIsClearingChats(true);
    setChatActionError("");
    try {
      await chatApi.bulkDeleteSessions(chats.map((session) => session.id));
      setChats([]);
    } catch (error) {
      setChatActionError(
        getApiErrorMessage(error, "상담 기록을 전체 삭제하지 못했어요."),
      );
    } finally {
      setIsClearingChats(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || isLoading || !isAuthenticated) {
      return;
    }

    let ignore = false;

    const loadFamilyProfile = async () => {
      try {
        const nextFamily = await familyProfileApi.getMe();
        if (ignore || !nextFamily) {
          return;
        }

        const normalizedFamily = normalizeFamilyProfile(nextFamily);
        startTransition(() => {
          setFamilyProfile(normalizedFamily);
          setFamilyDraft(normalizedFamily);
          setFamilyError("");
        });
      } catch {
        if (!ignore) {
          setFamilyError("가족 프로필을 불러오지 못했어요.");
        }
      }
    };

    loadFamilyProfile();

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, isLoading]);

  const startUserEdit = () => {
    setUserDraft({ nickname: userProfile?.nickname || "" });
    setPasswordDraft({ ...EMPTY_PASSWORD_DRAFT });
    setUserSaved(false);
    setUserError("");
    setIsEditingUser(true);
  };

  const cancelUserEdit = () => {
    setUserDraft({ nickname: userProfile?.nickname || "" });
    setPasswordDraft({ ...EMPTY_PASSWORD_DRAFT });
    setUserSaved(false);
    setUserError("");
    setIsEditingUser(false);
  };

  const saveUserProfile = async () => {
    if (isSavingUser) {
      return;
    }

    const nickname = userDraft.nickname.trim();
    const validationMessage = getNicknameValidationMessage(nickname);
    const wantsPasswordChange = Object.values(passwordDraft).some(Boolean);

    if (validationMessage) {
      setUserError(validationMessage);
      return;
    }

    if (wantsPasswordChange) {
      if (!passwordDraft.currentPassword) {
        setUserError("현재 비밀번호를 입력해주세요.");
        return;
      }

      const passwordValidationMessage = getPasswordValidationMessage(
        passwordDraft.newPassword,
      );

      if (passwordValidationMessage) {
        setUserError(passwordValidationMessage);
        return;
      }

      if (passwordDraft.currentPassword === passwordDraft.newPassword) {
        setUserError("새 비밀번호는 현재 비밀번호와 다르게 입력해주세요.");
        return;
      }

      if (!passwordDraft.newPasswordConfirm) {
        setUserError("새 비밀번호 확인을 입력해주세요.");
        return;
      }

      if (passwordDraft.newPassword !== passwordDraft.newPasswordConfirm) {
        setUserError("새 비밀번호가 일치하지 않아요.");
        return;
      }
    }

    setIsSavingUser(true);
    setUserSaved(false);
    setUserError("");

    try {
      const currentNickname = (userProfile?.nickname || "").trim();
      let nextUser = userProfile;

      if (nickname !== currentNickname) {
        nextUser = await userApi.updateMe({ nickname });
      }

      if (wantsPasswordChange) {
        await userApi.updatePassword({
          current_password: passwordDraft.currentPassword,
          new_password: passwordDraft.newPassword,
        });
      }

      const savedUser = nextUser || { ...userProfile, nickname };

      setUserProfile(savedUser);
      setUserDraft({ nickname: savedUser?.nickname || nickname });
      setPasswordDraft({ ...EMPTY_PASSWORD_DRAFT });
      setIsEditingUser(false);
      setUserSaved(true);
      if (savedUser) {
        updateUserAuth(savedUser);
      }
    } catch (error) {
      setUserError(
        getApiErrorMessage(
          error,
          "계정 정보를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
        ),
      );
    } finally {
      setIsSavingUser(false);
    }
  };

  const setFamilyDraftValue = (key, value) => {
    setFamilyDraft((family) => ({ ...family, [key]: value }));
    setFamilySaved(false);
  };

  const toggleFamilyDraftSpecial = (value) => {
    setFamilyDraft((family) => ({
      ...family,
      special: family.special.includes(value)
        ? family.special.filter((item) => item !== value)
        : [...family.special, value],
    }));
    setFamilySaved(false);
  };

  const selectFamilyDraftChildAge = (value) => {
    setFamilyDraft((family) => {
      return {
        ...family,
        childAge: value,
        childrenAges: [value],
      };
    });
    setFamilySaved(false);
  };

  const startFamilyEdit = () => {
    setFamilyDraft(familyProfile);
    setFamilySaved(false);
    setIsEditingFamily(true);
  };

  const cancelFamilyEdit = () => {
    setFamilyDraft(familyProfile);
    setFamilySaved(false);
    setIsEditingFamily(false);
  };

  const saveFamilyProfile = async () => {
    if (isSavingFamily) {
      return;
    }

    const nextFamily = normalizeFamilyProfile(familyDraft);

    setIsSavingFamily(true);
    setFamilySaved(false);
    setFamilyError("");

    try {
      const savedFamily = await familyProfileApi.updateMe(
        createFamilyProfilePayload(nextFamily),
      );
      const normalizedFamily = normalizeFamilyProfile(
        savedFamily || nextFamily,
      );

      setFamilyProfile(normalizedFamily);
      setFamilyDraft(normalizedFamily);
      setIsEditingFamily(false);
      setFamilySaved(true);
    } catch {
      setFamilyError(
        "가족 상황을 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
      );
    } finally {
      setIsSavingFamily(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="dd-page">
        <Header />
        <main
          className="dd-shell"
          style={{ paddingTop: 32, paddingBottom: 64 }}
        >
          <div
            className="dd-card dd-card-lg"
            style={{ padding: 24, maxWidth: 520 }}
          >
            <strong style={{ fontSize: 16 }}>
              {isLoading
                ? "로그인 상태 확인 중..."
                : "로그인 페이지로 이동 중..."}
            </strong>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dd-page">
      <Header />
      <main className="dd-shell" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {/* 탭 묶음의 시작선을 기준으로 헤더와 콘텐츠를 맞춘다. */}
        <div style={{ maxWidth: MYPAGE_RAIL_WIDTH, margin: "0 auto" }}>
          {/* 프로필 헤더 */}
          <div style={{ maxWidth: MYPAGE_CONTENT_WIDTH, margin: "0 auto" }}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <span
                className="dd-icon-tile dd-tile-rose"
                style={{ width: 60, height: 60 }}
              >
                <Icon name="User" size={28} />
              </span>
              <div>
                <h1 className="dd-title" style={{ fontSize: 26 }}>
                  마이페이지
                </h1>
                <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
                  저장한 정보와 진행 상황을 한눈에 확인하세요.
                </p>
              </div>
            </div>
          </div>

          {/* 탭 */}
          <div className="dd-tabs" style={{ justifyContent: "center" }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={"dd-tab" + (tab === t.key ? " is-active" : "")}
                onClick={() => handleTabChange(t.key)}
              >
                <span className="d-inline-flex align-items-center gap-1">
                  <Icon name={t.icon} size={14} /> {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4">
            {/* 계정 정보 */}
            {tab === "account" && (
              <div
                className="dd-card dd-card-lg"
                style={{
                  padding: 24,
                  maxWidth: MYPAGE_CONTENT_WIDTH,
                  margin: "0 auto",
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <strong style={{ fontSize: 16 }}>계정 정보</strong>
                  {isEditingUser ? (
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost dd-btn-sm"
                      onClick={cancelUserEdit}
                      disabled={isSavingUser}
                    >
                      <Icon name="X" size={15} /> 취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost dd-btn-sm"
                      onClick={startUserEdit}
                    >
                      <Icon name="Pencil" size={15} /> 수정하기
                    </button>
                  )}
                </div>

                {isEditingUser ? (
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="dd-label">닉네임</label>
                      <div className="dd-field">
                        <span className="dd-field-icon">
                          <Icon name="User" size={18} />
                        </span>
                        <input
                          className="dd-input"
                          value={userDraft.nickname}
                          onChange={(e) => {
                            setUserDraft({ nickname: e.target.value });
                            setUserSaved(false);
                            setUserError("");
                          }}
                          minLength={NICKNAME_MIN_LENGTH}
                          maxLength={NICKNAME_MAX_LENGTH}
                          required
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        borderTop: "1px solid var(--dd-stone-100)",
                        paddingTop: 16,
                      }}
                    >
                      <strong className="d-block mb-3" style={{ fontSize: 15 }}>
                        비밀번호 변경
                      </strong>
                      <div className="d-flex flex-column gap-3">
                        <div>
                          <label className="dd-label">현재 비밀번호</label>
                          <div className="dd-field">
                            <span className="dd-field-icon">
                              <Icon name="ShieldCheck" size={18} />
                            </span>
                            <input
                              type="password"
                              className="dd-input"
                              value={passwordDraft.currentPassword}
                              onChange={(e) => {
                                setPasswordDraft((draft) => ({
                                  ...draft,
                                  currentPassword: e.target.value,
                                }));
                                setUserSaved(false);
                                setUserError("");
                              }}
                              autoComplete="current-password"
                            />
                          </div>
                        </div>

                        <div className="row g-2">
                          <div className="col-12 col-md-6">
                            <label className="dd-label">새 비밀번호</label>
                            <div className="dd-field">
                              <span className="dd-field-icon">
                                <Icon name="ShieldCheck" size={18} />
                              </span>
                              <input
                                type="password"
                                className="dd-input"
                                value={passwordDraft.newPassword}
                                onChange={(e) => {
                                  setPasswordDraft((draft) => ({
                                    ...draft,
                                    newPassword: e.target.value,
                                  }));
                                  setUserSaved(false);
                                  setUserError("");
                                }}
                                minLength={PASSWORD_MIN_LENGTH}
                                maxLength={PASSWORD_MAX_LENGTH}
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="dd-label">새 비밀번호 확인</label>
                            <div className="dd-field">
                              <span className="dd-field-icon">
                                <Icon name="ShieldCheck" size={18} />
                              </span>
                              <input
                                type="password"
                                className="dd-input"
                                value={passwordDraft.newPasswordConfirm}
                                onChange={(e) => {
                                  setPasswordDraft((draft) => ({
                                    ...draft,
                                    newPasswordConfirm: e.target.value,
                                  }));
                                  setUserSaved(false);
                                  setUserError("");
                                }}
                                minLength={PASSWORD_MIN_LENGTH}
                                maxLength={PASSWORD_MAX_LENGTH}
                                autoComplete="new-password"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end flex-wrap">
                      <button
                        type="button"
                        className="dd-btn dd-btn-ghost"
                        onClick={cancelUserEdit}
                        disabled={isSavingUser}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="dd-btn dd-btn-coral"
                        onClick={saveUserProfile}
                        disabled={isSavingUser}
                      >
                        <Icon name="Check" size={16} />{" "}
                        {isSavingUser ? "저장 중..." : "저장하기"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {[
                      {
                        label: "닉네임",
                        value: userProfile?.nickname || "미설정",
                      },
                      { label: "이메일", value: userProfile?.email || "-" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="d-flex justify-content-between align-items-start gap-3 py-2"
                        style={{
                          borderBottom: "1px solid var(--dd-stone-100)",
                          fontSize: 14,
                        }}
                      >
                        <span className="dd-subtle">{row.label}</span>
                        <span
                          className="fw-semibold text-end"
                          style={{ color: "var(--dd-ink-80)" }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {userSaved && (
                  <p
                    className="dd-disclaimer mt-3 mb-0"
                    style={{ color: "var(--dd-green)" }}
                  >
                    <Icon name="Check" size={13} /> 계정 정보가 저장됐어요.
                  </p>
                )}
                {userError && (
                  <p
                    className="dd-disclaimer mt-3 mb-0"
                    style={{ color: "var(--dd-coral)" }}
                  >
                    <Icon name="CircleAlert" size={13} /> {userError}
                  </p>
                )}
              </div>
            )}

            {/* 가족 프로필 */}
            {tab === "profile" && (
              <div
                className="dd-card dd-card-lg"
                style={{
                  padding: 24,
                  maxWidth: MYPAGE_CONTENT_WIDTH,
                  margin: "0 auto",
                }}
              >
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <strong style={{ fontSize: 16 }}>저장된 가족 상황</strong>
                  {isEditingFamily ? (
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost dd-btn-sm"
                      onClick={cancelFamilyEdit}
                    >
                      <Icon name="X" size={15} /> 취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost dd-btn-sm"
                      onClick={startFamilyEdit}
                    >
                      <Icon name="Pencil" size={15} /> 수정하기
                    </button>
                  )}
                </div>
                {isEditingFamily ? (
                  <div className="d-flex flex-column gap-3">
                    <div>
                      <label className="dd-label">가족 구성</label>
                      <div
                        className="dd-radio-grid"
                        style={{
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                        }}
                      >
                        {FAMILY_OPTIONS.stage.map((o) => (
                          <label
                            key={o.value}
                            className={
                              "dd-choice" +
                              (familyDraft.stage === o.value
                                ? " is-checked"
                                : "")
                            }
                          >
                            <input
                              type="radio"
                              name="mypage-stage"
                              checked={familyDraft.stage === o.value}
                              onChange={() =>
                                setFamilyDraftValue("stage", o.value)
                              }
                            />
                            {o.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="dd-label">
                        자녀 연령대{" "}
                        <span className="dd-subtle" style={{ fontWeight: 400 }}>
                          (하나 선택)
                        </span>
                      </label>
                      <div className="d-flex flex-wrap gap-2">
                        {FAMILY_OPTIONS.childAge.map((o) => {
                          const on =
                            normalizeFamilyProfile(familyDraft).childAge ===
                            o.value;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              className={
                                "dd-pill " +
                                (on ? "dd-pill-coral" : "dd-pill-stone")
                              }
                              onClick={() => selectFamilyDraftChildAge(o.value)}
                              style={{
                                padding: "9px 14px",
                                fontSize: 14,
                                border: on
                                  ? "1px solid var(--dd-coral-200)"
                                  : "1px solid transparent",
                              }}
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
                        <select
                          className="dd-select"
                          value={familyDraft.income}
                          onChange={(e) =>
                            setFamilyDraftValue("income", e.target.value)
                          }
                        >
                          {FAMILY_OPTIONS.income.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-sm-6">
                        <label className="dd-label">거주 지역</label>
                        <select
                          className="dd-select"
                          value={familyDraft.region}
                          onChange={(e) =>
                            setFamilyDraftValue("region", e.target.value)
                          }
                        >
                          {FAMILY_OPTIONS.region.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="dd-label">
                        특수 상황{" "}
                        <span className="dd-subtle" style={{ fontWeight: 400 }}>
                          (해당되는 항목 모두 선택)
                        </span>
                      </label>
                      <div className="d-flex flex-wrap gap-2">
                        {FAMILY_OPTIONS.special.map((o) => {
                          const on = familyDraft.special.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              type="button"
                              className={
                                "dd-pill " +
                                (on ? "dd-pill-coral" : "dd-pill-stone")
                              }
                              onClick={() => toggleFamilyDraftSpecial(o.value)}
                              style={{
                                padding: "9px 14px",
                                fontSize: 14,
                                border: on
                                  ? "1px solid var(--dd-coral-200)"
                                  : "1px solid transparent",
                              }}
                            >
                              {on && <Icon name="Check" size={14} />}
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="d-flex gap-2 justify-content-end flex-wrap">
                      <button
                        type="button"
                        className="dd-btn dd-btn-ghost"
                        onClick={cancelFamilyEdit}
                        disabled={isSavingFamily}
                      >
                        취소
                      </button>
                      <button
                        type="button"
                        className="dd-btn dd-btn-coral"
                        onClick={saveFamilyProfile}
                        disabled={isSavingFamily}
                      >
                        <Icon name="Check" size={16} />{" "}
                        {isSavingFamily ? "저장 중..." : "저장하기"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {familyRows(familyProfile).map((r) => (
                      <div
                        key={r.label}
                        className="d-flex justify-content-between align-items-start gap-3 py-2"
                        style={{
                          borderBottom: "1px solid var(--dd-stone-100)",
                          fontSize: 14,
                        }}
                      >
                        <span className="dd-subtle">{r.label}</span>
                        <span
                          className="fw-semibold text-end"
                          style={{ color: "var(--dd-ink-80)" }}
                        >
                          {r.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {familySaved && (
                  <p
                    className="dd-disclaimer mt-3 mb-0"
                    style={{ color: "var(--dd-green)" }}
                  >
                    <Icon name="Check" size={13} /> 가족 상황이 저장됐어요.
                  </p>
                )}
                {familyError && (
                  <p
                    className="dd-disclaimer mt-3 mb-0"
                    style={{ color: "var(--dd-coral)" }}
                  >
                    <Icon name="CircleAlert" size={13} /> {familyError}
                  </p>
                )}
                <div className="mt-3">
                  <DisclaimerNote />
                </div>
              </div>
            )}

            {/* 관심 정책 */}
            {tab === "liked" && (
              <div style={{ maxWidth: MYPAGE_CONTENT_WIDTH, margin: "0 auto" }}>
                {likedLoading ? (
                  <div
                    className="dd-card-soft text-center"
                    style={{ padding: 40 }}
                  >
                    <span className="dd-subtle">
                      관심 정책을 불러오는 중이에요.
                    </span>
                  </div>
                ) : likedError && liked.length === 0 ? (
                  <div
                    className="dd-card-soft text-center"
                    style={{ padding: 40 }}
                  >
                    <p className="mb-3" style={{ color: "var(--dd-coral)" }}>
                      <Icon name="CircleAlert" size={15} /> {likedError}
                    </p>
                    <button
                      type="button"
                      className="dd-btn dd-btn-ghost dd-btn-sm"
                      onClick={() => refreshLiked()}
                    >
                      다시 시도
                    </button>
                  </div>
                ) : liked.length ? (
                  <div>
                    <ListHeader
                      text={`저장한 정책 ${liked.length}개`}
                      onClear={clearLiked}
                      label="전체 비우기"
                    />
                    {likedError && (
                      <p
                        className="dd-disclaimer mb-3"
                        style={{ color: "var(--dd-coral)" }}
                      >
                        <Icon name="CircleAlert" size={13} /> {likedError}
                      </p>
                    )}

                    <div className="row g-4">
                      {liked.map((p) => (
                        <div className="col-12 col-md-6" key={p.id}>
                          <div className="position-relative h-100">
                            <DelBtn
                              onClick={() => removeLiked(p.id)}
                              style={{
                                position: "absolute",
                                top: 14,
                                right: 14,
                                zIndex: 2,
                                opacity: pendingLikedIds.includes(p.id)
                                  ? 0.5
                                  : 1,
                                pointerEvents: pendingLikedIds.includes(p.id)
                                  ? "none"
                                  : "auto",
                              }}
                            />
                            <PolicyCard policy={p} showMeta>
                              <Link
                                href={`/policies/${p.id}`}
                                className="dd-btn dd-btn-ghost dd-btn-sm"
                              >
                                <Icon name="FileText" size={15} /> 상세보기
                              </Link>
                              <Link
                                href={`/policies/${p.id}/apply`}
                                className="dd-btn dd-btn-green dd-btn-sm"
                              >
                                <Icon name="HandHeart" size={15} /> 신청 준비
                              </Link>
                            </PolicyCard>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon="Heart"
                    title="관심 정책이 비어 있어요"
                    desc="정책 리스트에서 하트를 눌러 우리 가족에게 맞는 정책을 모아보세요."
                    href="/policies"
                    cta="정책 보러 가기"
                    maxWidth={MYPAGE_CONTENT_WIDTH}
                  />
                )}
              </div>
            )}

            {/* 추천 이력 */}
            {tab === "recHistory" && (
              <div style={{ maxWidth: MYPAGE_CONTENT_WIDTH, margin: "0 auto" }}>
                {recsLoading ? (
                  <div
                    className="dd-card d-flex align-items-center gap-3"
                    style={{ padding: 18 }}
                  >
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    <span className="dd-subtle" style={{ fontSize: 14 }}>
                      추천 이력을 불러오는 중이에요.
                    </span>
                  </div>
                ) : recsError ? (
                  <div
                    className="dd-card-soft"
                    style={{ padding: 18, borderColor: "var(--dd-amber-200)" }}
                  >
                    <div
                      className="d-flex align-items-center gap-2 mb-2"
                      style={{ color: "var(--dd-amber)" }}
                    >
                      <Icon name="CircleAlert" size={17} />
                      <strong style={{ fontSize: 15 }}>
                        추천 이력을 불러오지 못했어요
                      </strong>
                    </div>
                    <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
                      {recsError}
                    </p>
                  </div>
                ) : recs.length ? (
                  <>
                    <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                      <span className="dd-subtle" style={{ fontSize: 14 }}>
                        추천 받은 기록 {recs.length}건
                      </span>
                    </div>
                    <div className="d-flex flex-column gap-3">
                      {recs.map((h) => {
                        const policyNames = Array.isArray(h.top_policy_names)
                          ? h.top_policy_names.filter(Boolean)
                          : [];
                        const policyCount = h.policy_count || 0;
                        const followUps = Array.isArray(h.follow_up_answers)
                          ? h.follow_up_answers.filter((qa) => qa && qa.answer)
                          : [];
                        const title = h.summary || "맞춤 추천";
                        return (
                          <Link
                            key={h.request_id}
                            href={`/recommend/result?requestId=${encodeURIComponent(h.request_id)}`}
                            className="dd-card dd-card-hover d-flex flex-column text-decoration-none"
                            style={{ padding: 20, color: "var(--dd-ink)" }}
                          >
                            {/* 상단: 아이콘 · 제목(폼 입력값) · 날짜 */}
                            <div className="d-flex align-items-start justify-content-between gap-3">
                              <div className="d-flex align-items-center gap-3 min-w-0">
                                <span
                                  className="dd-icon-tile dd-tile-rose"
                                  style={{
                                    width: 46,
                                    height: 46,
                                    flex: "none",
                                  }}
                                >
                                  <Icon name="Sparkles" size={22} />
                                </span>
                                <div className="min-w-0">
                                  <strong
                                    style={{ fontSize: 16, display: "block" }}
                                  >
                                    {title}
                                  </strong>
                                  <span
                                    className="dd-subtle d-inline-flex align-items-center gap-1 mt-1"
                                    style={{ fontSize: 13 }}
                                  >
                                    맞춤 추천
                                    <span
                                      className="dd-pill dd-pill-coral"
                                      style={{
                                        padding: "1px 8px",
                                        fontSize: 11.5,
                                      }}
                                    >
                                      {policyCount}건
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div
                                className="d-flex align-items-center gap-1"
                                style={{ flex: "none" }}
                              >
                                <span
                                  className="dd-subtle d-flex align-items-center gap-1"
                                  style={{
                                    fontSize: 12.5,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <Icon name="CalendarDays" size={14} />{" "}
                                  {formatHistoryDate(h.created_at)}
                                </span>
                                <Icon
                                  name="ChevronRight"
                                  size={16}
                                  style={{ color: "var(--dd-stone-400)" }}
                                />
                              </div>
                            </div>

                            {/* 추가질문 답변(있을 때): 한 줄에 하나, Q/A 구분 */}
                            {followUps.length > 0 && (
                              <div
                                className="dd-card-soft mt-3"
                                style={{ padding: "10px 12px" }}
                              >
                                <div
                                  className="d-flex align-items-center gap-1 mb-2"
                                  style={{ color: "var(--dd-amber)" }}
                                >
                                  <Icon name="MessageCircle" size={13} />
                                  <strong style={{ fontSize: 12 }}>
                                    추가 확인
                                  </strong>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                  {followUps.map((qa, index) => (
                                    <div
                                      key={qa.question_text || index}
                                      className="d-flex flex-column gap-1"
                                    >
                                      {qa.question_text && (
                                        <span
                                          className="d-flex align-items-start gap-1"
                                          style={{
                                            fontSize: 12.5,
                                            color: "var(--dd-stone-600)",
                                          }}
                                        >
                                          <span
                                            className="fw-bold"
                                            style={{
                                              color: "var(--dd-amber)",
                                              flex: "none",
                                            }}
                                          >
                                            Q
                                          </span>
                                          <span style={{ lineHeight: 1.5 }}>
                                            {qa.question_text}
                                          </span>
                                        </span>
                                      )}
                                      <span
                                        className="d-flex align-items-start gap-1"
                                        style={{ fontSize: 12.5 }}
                                      >
                                        <span
                                          className="fw-bold"
                                          style={{
                                            color: "var(--dd-coral)",
                                            flex: "none",
                                          }}
                                        >
                                          A
                                        </span>
                                        <span
                                          className="fw-semibold"
                                          style={{
                                            color: "var(--dd-ink)",
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {qa.answer}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 하단: 추천된 정책명 칩 전부 */}
                            {policyNames.length > 0 && (
                              <div className="d-flex flex-wrap gap-1 mt-3">
                                {policyNames.map((name) => (
                                  <span
                                    key={name}
                                    className="dd-pill dd-pill-stone"
                                    style={{
                                      padding: "4px 11px",
                                      fontSize: 12.5,
                                    }}
                                  >
                                    {name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon="Target"
                    title="추천 이력이 없어요"
                    desc="가족 상황을 입력하면 맞춤 정책을 추천해 드려요."
                    href="/recommend"
                    cta="맞춤 추천 받으러 가기"
                  />
                )}
              </div>
            )}

            {/* 비교 이력 */}
            {tab === "compare" && (
              <div style={{ maxWidth: MYPAGE_CONTENT_WIDTH, margin: "0 auto" }}>
                {compareLoading ? (
                  <div
                    className="dd-card d-flex align-items-center gap-3"
                    style={{ padding: 18 }}
                  >
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    <span className="dd-subtle" style={{ fontSize: 14 }}>
                      비교 이력을 불러오는 중이에요.
                    </span>
                  </div>
                ) : compareError ? (
                  <div
                    className="dd-card-soft"
                    style={{ padding: 18, borderColor: "var(--dd-amber-200)" }}
                  >
                    <div
                      className="d-flex align-items-center gap-2 mb-2"
                      style={{ color: "var(--dd-amber)" }}
                    >
                      <Icon name="CircleAlert" size={17} />
                      <strong style={{ fontSize: 15 }}>
                        비교 이력을 불러오지 못했어요
                      </strong>
                    </div>
                    <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
                      {compareError}
                    </p>
                  </div>
                ) : compares.length ? (
                  <>
                    <ListHeader
                      text={`비교한 기록 ${compareMeta.total || compares.length}건`}
                      onClear={handleClearCompareHistory}
                      disabled={
                        isClearingCompares || pendingCompareDeleteId !== null
                      }
                      label={isClearingCompares ? "삭제 중" : "전체 삭제"}
                    />
                    {compareActionError && (
                      <div
                        className="dd-card-soft mb-3"
                        style={{
                          padding: 14,
                          borderColor: "var(--dd-amber-200)",
                        }}
                      >
                        <div
                          className="d-flex align-items-center gap-2"
                          style={{ color: "var(--dd-amber)" }}
                        >
                          <Icon name="CircleAlert" size={16} />
                          <span style={{ fontSize: 14 }}>
                            {compareActionError}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="d-flex flex-column gap-3">
                      {compares.map((item) => (
                        <div
                          key={item.id}
                          className="dd-card"
                          style={{ padding: "18px 20px" }}
                        >
                          <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
                            <Link
                              href={`/compare?a=${item.policy_a_slug}&b=${item.policy_b_slug}`}
                              className="d-flex align-items-center gap-2 flex-wrap text-decoration-none"
                              style={{ flex: 1, color: "var(--dd-ink)" }}
                            >
                              <span className="dd-cmp-chip">
                                <span
                                  className="dd-icon-tile dd-tile-amber"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 999,
                                  }}
                                >
                                  <Icon name="FileText" size={16} />
                                </span>
                                <span
                                  className="fw-semibold"
                                  style={{ fontSize: 14 }}
                                >
                                  {item.policy_a_name}
                                </span>
                              </span>
                              <span style={{ color: "var(--dd-amber)" }}>
                                <Icon name="GitCompare" size={16} />
                              </span>
                              <span className="dd-cmp-chip">
                                <span
                                  className="dd-icon-tile dd-tile-amber"
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 999,
                                  }}
                                >
                                  <Icon name="FileText" size={16} />
                                </span>
                                <span
                                  className="fw-semibold"
                                  style={{ fontSize: 14 }}
                                >
                                  {item.policy_b_name}
                                </span>
                              </span>
                            </Link>
                            <div
                              className="d-flex align-items-center gap-2"
                              style={{ flex: "none" }}
                            >
                              <span
                                className="dd-subtle d-flex align-items-center gap-1"
                                style={{ fontSize: 13, whiteSpace: "nowrap" }}
                              >
                                <Icon name="CalendarDays" size={14} />{" "}
                                {formatCompareDate(item.compared_at)}
                              </span>
                              <DelBtn
                                onClick={() =>
                                  handleDeleteCompareHistory(item.id)
                                }
                                disabled={
                                  isClearingCompares ||
                                  pendingCompareDeleteId === String(item.id)
                                }
                              />
                            </div>
                          </div>
                          <hr className="dd-divider my-3" />
                          <div className="d-flex justify-content-end">
                            <Link
                              href={`/compare?a=${item.policy_a_slug}&b=${item.policy_b_slug}`}
                              className="dd-btn dd-btn-amber dd-btn-sm"
                            >
                              <Icon name="Repeat" size={15} /> 다시 비교하기
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                    {compareMeta.total_pages > 1 && (
                      <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
                        <button
                          type="button"
                          className="dd-btn dd-btn-ghost dd-btn-sm"
                          disabled={comparePage <= 1 || compareLoading}
                          onClick={() => moveComparePage(comparePage - 1)}
                        >
                          이전
                        </button>
                        <strong style={{ fontSize: 14 }}>
                          {compareMeta.page || comparePage} /{" "}
                          {compareMeta.total_pages}
                        </strong>
                        <button
                          type="button"
                          className="dd-btn dd-btn-ghost dd-btn-sm"
                          disabled={
                            comparePage >= compareMeta.total_pages ||
                            compareLoading
                          }
                          onClick={() => moveComparePage(comparePage + 1)}
                        >
                          다음
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon="GitCompare"
                    tile="amber"
                    title="아직 비교한 정책이 없어요"
                    desc="관심 있는 정책 두 개를 나란히 두고 우리 가족에게 더 맞는 쪽을 찾아보세요."
                    href="/compare"
                    cta="정책 비교하러 가기"
                    ctaIcon="GitCompare"
                  />
                )}
              </div>
            )}

            {/* 상담 이력 */}
            {tab === "chatHistory" && (
              <div style={{ maxWidth: MYPAGE_CONTENT_WIDTH, margin: "0 auto" }}>
                {chatsLoading ? (
                  <div
                    className="dd-card d-flex align-items-center gap-3"
                    style={{ padding: 18 }}
                  >
                    <span
                      className="spinner-border spinner-border-sm"
                      aria-hidden="true"
                    />
                    <span className="dd-subtle" style={{ fontSize: 14 }}>
                      상담 이력을 불러오는 중이에요.
                    </span>
                  </div>
                ) : chatsError ? (
                  <div
                    className="dd-card-soft"
                    style={{ padding: 18, borderColor: "var(--dd-amber-200)" }}
                  >
                    <div
                      className="d-flex align-items-center gap-2 mb-2"
                      style={{ color: "var(--dd-amber)" }}
                    >
                      <Icon name="CircleAlert" size={17} />
                      <strong style={{ fontSize: 15 }}>
                        상담 이력을 불러오지 못했어요
                      </strong>
                    </div>
                    <p className="mb-0 dd-subtle" style={{ fontSize: 14 }}>
                      {chatsError}
                    </p>
                  </div>
                ) : chats.length ? (
                  <>
                    <ListHeader
                      text={`상담한 기록 ${chats.length}건`}
                      onClear={clearChatSessions}
                      disabled={isClearingChats}
                    />
                    {chatActionError && (
                      <div
                        className="dd-card-soft mb-3 d-flex align-items-center gap-2"
                        style={{
                          padding: "12px 16px",
                          borderColor: "var(--dd-amber-200)",
                          color: "var(--dd-amber)",
                        }}
                      >
                        <Icon name="CircleAlert" size={16} />
                        <span style={{ fontSize: 14 }}>{chatActionError}</span>
                      </div>
                    )}
                    <div className="d-flex flex-column gap-2">
                      {chats.map((h) => (
                        <div
                          key={h.id}
                          className="dd-card dd-card-hover d-flex align-items-center justify-content-between gap-3"
                          style={{ padding: 18 }}
                        >
                          <button
                            type="button"
                            onClick={() => openChatSession(h.id)}
                            className="d-flex align-items-center gap-3 flex-grow-1"
                            style={{
                              background: "none",
                              border: 0,
                              padding: 0,
                              textAlign: "left",
                              cursor: "pointer",
                            }}
                          >
                            <span
                              className="dd-icon-tile dd-tile-blue"
                              style={{ width: 42, height: 42 }}
                            >
                              <Icon name="MessageCircle" size={20} />
                            </span>
                            <div>
                              <strong
                                style={{ fontSize: 15, color: "var(--dd-ink)" }}
                              >
                                {h.title || "상담"}
                              </strong>
                              <div
                                className="dd-pill dd-pill-blue"
                                style={{ marginTop: 4 }}
                              >
                                {h.status && h.status !== "ACTIVE"
                                  ? h.status
                                  : "상담 기록"}
                              </div>
                            </div>
                          </button>
                          <div className="d-flex align-items-center gap-2">
                            <span
                              className="dd-subtle"
                              style={{ fontSize: 13 }}
                            >
                              {formatHistoryDate(h.lastMessageAt) ||
                                "날짜 정보 없음"}
                            </span>
                            <DelBtn onClick={() => deleteChatSession(h.id)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState
                    icon="MessageCircle"
                    tile="blue"
                    title="상담 이력이 없어요"
                    desc="챗봇에게 우리 가족 상황을 물어보세요."
                    href="/chat"
                    cta="챗봇 상담하러 가기"
                    ctaIcon="MessageCircle"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <div className="dd-page">
          <Header />
          <main
            className="dd-shell"
            style={{ paddingTop: 32, paddingBottom: 64 }}
          >
            <div
              className="dd-card dd-card-lg"
              style={{
                padding: 24,
                maxWidth: MYPAGE_CONTENT_WIDTH,
                margin: "0 auto",
              }}
            >
              <strong style={{ fontSize: 16 }}>
                마이페이지를 불러오는 중...
              </strong>
            </div>
          </main>
        </div>
      }
    >
      <MyPageContent />
    </Suspense>
  );
}
