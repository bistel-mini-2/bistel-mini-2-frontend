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
        const firstResponse = await favoriteApi.getFavorites({
          page: 1,
          size: PAGE_SIZE,
          signal,
        });
        const firstItems = firstResponse.data?.items || [];
        const totalPages = firstResponse.meta?.total_pages || 1;
        let nextItems = firstItems;

        if (totalPages > 1) {
          const remainingResponses = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              favoriteApi.getFavorites({
                page: index + 2,
                size: PAGE_SIZE,
                signal,
              })
            )
          );
          nextItems = [
            ...firstItems,
            ...remainingResponses.flatMap(
              (response) => response.data?.items || []
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
    () => items.map((item) => item.policy_slug),
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

  const toggle = useCallback(
    async (policySlug) => {
      if (!policySlug || pendingIdsRef.current.has(policySlug)) {
        return;
      }

      if (!isAuthenticated) {
        const params = new URLSearchParams({ reason: "favorite" });
        if (pathname) {
          params.set("next", pathname);
        }
        router.push(`/login?${params.toString()}`);
        return;
      }

      const currentlyLiked = ids.includes(policySlug);
      const previousItems = items;
      setPending(policySlug, true);
      setError("");
      setItems((current) =>
        currentlyLiked
          ? current.filter((item) => item.policy_slug !== policySlug)
          : [{ policy_slug: policySlug }, ...current]
      );

      try {
        if (currentlyLiked) {
          await favoriteApi.removeFavorite(policySlug);
        } else {
          const created = await favoriteApi.addFavorite(policySlug);
          setItems((current) => [
            created,
            ...current.filter((item) => item.policy_slug !== policySlug),
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
            current.filter((item) => item.policy_slug !== policySlug)
          );
          notifyFavoritesChanged();
          return;
        }
        setError(
          getApiErrorMessage(
            requestError,
            "관심 정책 상태를 변경하지 못했어요."
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
      pathname,
      router,
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
            await favoriteApi.removeFavorite(policySlug);
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
  };
}
