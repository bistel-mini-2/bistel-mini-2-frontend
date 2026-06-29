"use client";

import {
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthContext } from "@/contexts/AuthContext";
import favoriteApi from "@/apis/favoriteApi";
import { getApiErrorMessage } from "@/apis/axiosConfig";

const FAVORITES_CHANGED_EVENT = "dodam:favorites-changed";
const PAGE_SIZE = 100;
const LOGIN_REQUIRED_MESSAGE = "관심 정책을 저장하려면 로그인이 필요해요.";
const LOGIN_AFTER_MESSAGE = "로그인 후 관심 정책을 저장할 수 있어요.";

const getFavoriteSlug = (item) =>
  item?.policy_slug ||
  item?.slug ||
  item?.policy_code ||
  item?.policy_id ||
  item?.id ||
  "";

const getPolicyFavoriteState = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }
  const value = item.is_favorite ?? item.liked ?? item.favorite;
  return typeof value === "boolean" ? value : null;
};

const normalizeFavorite = (item, fallbackSlug = "") => ({
  ...item,
  policy_slug: getFavoriteSlug(item) || fallbackSlug,
});

const getFavoriteItems = (response) => {
  const data = response?.data ?? response;
  if (Array.isArray(data)) {
    return data.map((item) => normalizeFavorite(item));
  }
  const items =
    data?.items ||
    data?.favorites ||
    data?.favorite_policies ||
    data?.policies ||
    [];
  return items.map((item) => normalizeFavorite(item));
};

const getTotalPages = (response) =>
  response?.meta?.total_pages ||
  response?.meta?.totalPages ||
  response?.data?.pagination?.total_pages ||
  response?.data?.pagination?.totalPages ||
  1;

const notifyFavoritesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
  }
};

export function useLiked() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingIds, setPendingIds] = useState([]);
  const pendingIdsRef = useRef(new Set());

  const redirectToLogin = useCallback(
    (message) => {
      setError(message);
      const params = new URLSearchParams({ reason: "favorite" });
      if (pathname) {
        params.set("next", pathname);
      }
      router.push(`/login?${params.toString()}`);
    },
    [pathname, router]
  );

  const load = useCallback(
    async (signal) => {
      if (isAuthLoading) {
        return;
      }

      if (!isAuthenticated) {
        startTransition(() => {
          setItems([]);
          setError("");
          setLoading(false);
        });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const firstResponse = await favoriteApi.getFavoritePolicies({
          page: 1,
          size: PAGE_SIZE,
          signal,
        });
        const firstItems = getFavoriteItems(firstResponse);
        const totalPages = getTotalPages(firstResponse);
        let nextItems = firstItems;

        if (totalPages > 1) {
          const remainingResponses = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              favoriteApi.getFavoritePolicies({
                page: index + 2,
                size: PAGE_SIZE,
                signal,
              })
            )
          );
          nextItems = [
            ...firstItems,
            ...remainingResponses.flatMap(
              (response) => getFavoriteItems(response)
            ),
          ];
        }

        startTransition(() => setItems(nextItems));
      } catch (requestError) {
        if (
          requestError.name !== "CanceledError" &&
          requestError.code !== "ERR_CANCELED"
        ) {
          setError(
            getApiErrorMessage(
              requestError,
              "관심 정책을 불러오지 못했어요."
            )
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isAuthenticated, isAuthLoading]
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadTimer = window.setTimeout(() => load(controller.signal), 0);

    const handleChanged = () => load();
    window.addEventListener(FAVORITES_CHANGED_EVENT, handleChanged);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleChanged);
    };
  }, [load]);

  const ids = useMemo(
    () => items.map((item) => getFavoriteSlug(item)).filter(Boolean),
    [items]
  );

  const has = useCallback(
    (policySlug) => ids.includes(policySlug),
    [ids]
  );

  const setPending = useCallback((policySlug, pending) => {
    if (pending) {
      pendingIdsRef.current.add(policySlug);
    } else {
      pendingIdsRef.current.delete(policySlug);
    }
    setPendingIds([...pendingIdsRef.current]);
  }, []);

  const setLocalFavorite = useCallback((policySlug, liked, item = {}) => {
    if (!policySlug) {
      return;
    }

    setItems((current) => {
      const exists = current.some(
        (currentItem) => getFavoriteSlug(currentItem) === policySlug
      );

      if (liked) {
        const nextFavorite = normalizeFavorite(item, policySlug);
        return exists
          ? current.map((currentItem) =>
              getFavoriteSlug(currentItem) === policySlug
                ? { ...currentItem, ...nextFavorite }
                : currentItem
            )
          : [nextFavorite, ...current];
      }

      return current.filter((currentItem) => getFavoriteSlug(currentItem) !== policySlug);
    });
  }, []);

  const syncFromPolicy = useCallback(
    (policy) => {
      const favoriteState = getPolicyFavoriteState(policy);
      if (favoriteState === null) {
        return;
      }
      setLocalFavorite(getFavoriteSlug(policy), favoriteState, policy);
    },
    [setLocalFavorite]
  );

  const toggle = useCallback(
    async (policySlug) => {
      if (!policySlug || pendingIdsRef.current.has(policySlug)) {
        return;
      }

      if (!isAuthenticated) {
        redirectToLogin(LOGIN_REQUIRED_MESSAGE);
        return;
      }

      const currentlyLiked = ids.includes(policySlug);
      const previousItems = items;
      setPending(policySlug, true);
      setError("");
      setItems((current) =>
        currentlyLiked
          ? current.filter((item) => getFavoriteSlug(item) !== policySlug)
          : [normalizeFavorite({}, policySlug), ...current]
      );

      try {
        if (currentlyLiked) {
          await favoriteApi.removeFavoritePolicy(policySlug);
        } else {
          const created = await favoriteApi.addFavoritePolicy(policySlug);
          setItems((current) => [
            normalizeFavorite(created, policySlug),
            ...current.filter((item) => getFavoriteSlug(item) !== policySlug),
          ]);
        }
        notifyFavoritesChanged();
      } catch (requestError) {
        if (!currentlyLiked && requestError.status === 409) {
          await load();
          return;
        }
        if (currentlyLiked && requestError.status === 404) {
          setItems((current) =>
            current.filter((item) => getFavoriteSlug(item) !== policySlug)
          );
          notifyFavoritesChanged();
          return;
        }
        if (requestError.status === 401) {
          setItems(previousItems);
          redirectToLogin(LOGIN_AFTER_MESSAGE);
          return;
        }
        setError(
          getApiErrorMessage(
            requestError,
            currentlyLiked
              ? "관심 정책 해제에 실패했어요. 다시 시도해 주세요."
              : "관심 정책 저장에 실패했어요. 다시 시도해 주세요."
          )
        );
        setItems(previousItems);
      } finally {
        setPending(policySlug, false);
      }
    },
    [
      ids,
      isAuthenticated,
      items,
      load,
      redirectToLogin,
      setPending,
    ]
  );

  const remove = useCallback(
    async (policySlug) => {
      if (!ids.includes(policySlug)) {
        return;
      }
      await toggle(policySlug);
    },
    [ids, toggle]
  );

  const clear = useCallback(async () => {
    if (
      !isAuthenticated ||
      ids.length === 0 ||
      pendingIdsRef.current.size > 0
    ) {
      return;
    }

    const targetIds = [...ids];
    pendingIdsRef.current = new Set(targetIds);
    setPendingIds(targetIds);
    setError("");

    try {
      const results = await Promise.allSettled(
        targetIds.map(async (policySlug) => {
          try {
            await favoriteApi.removeFavoritePolicy(policySlug);
          } catch (requestError) {
            if (requestError.status !== 404) {
              throw requestError;
            }
          }
        })
      );
      const failedResult = results.find(
        (result) => result.status === "rejected"
      );
      if (failedResult) {
        throw failedResult.reason;
      }
      setItems([]);
      notifyFavoritesChanged();
    } catch (requestError) {
      setError(
        getApiErrorMessage(
          requestError,
          "관심 정책을 모두 비우지 못했어요."
        )
      );
      await load();
    } finally {
      pendingIdsRef.current.clear();
      setPendingIds([]);
    }
  }, [ids, isAuthenticated, load]);

  return {
    ids,
    items,
    loading: loading || isAuthLoading,
    error,
    pendingIds,
    has,
    toggle,
    remove,
    clear,
    refresh: load,
    setLocalFavorite,
    syncFromPolicy,
  };
}
