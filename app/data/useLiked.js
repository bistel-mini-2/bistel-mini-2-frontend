"use client";

// =========================================================================
// 도담 — 관심 정책(하트) 공용 훅
// 정책 리스트에서 하트로 담고, 마이페이지 '관심 정책' 탭에서 함께 본다.
// localStorage("dd:liked")에 정책 id 배열로 저장해 페이지 간 공유한다.
// =========================================================================
import { useState, useEffect } from "react";

const KEY = "dd:liked";
const DEFAULT_LIKED = ["parent-allowance", "first-meet", "care-service"];

export function useLiked() {
  const [ids, setIds] = useState(DEFAULT_LIKED);
  const [ready, setReady] = useState(false);

  // 최초 마운트 시 저장값 로드 (SSR 하이드레이션 불일치 방지: 기본값으로 먼저 렌더)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) setIds(JSON.parse(raw));
      } catch {
        /* noop */
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
      /* noop */
    }
  }, [ids, ready]);

  const has = (id) => ids.includes(id);
  const toggle = (id) =>
    setIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  const remove = (id) => setIds((v) => v.filter((x) => x !== id));
  const clear = () => setIds([]);

  return { ids, setIds, has, toggle, remove, clear };
}
