"use client";

// =========================================================================
// 도담 — 공통 헤더 (전 페이지 재사용)
// 로고(좌) | 홈·정책추천·정책리스트·챗봇·마이페이지(우) | 로그인/회원가입
// 현재 경로는 코랄 채움 pill 로 활성 표시(usePathname).
// =========================================================================
import { useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "@/app/components/Icon";
import { NAV_ITEMS } from "@/app/data/constants";
import { AuthContext } from "@/contexts/AuthContext";

export default function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logoutAuth } =
    useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const displayName = user?.nickname || user?.email || "내 계정";

  // 현재 경로가 해당 네비에 속하는지 (하위 경로 포함)
  const isActive = (href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleLogout = () => {
    logoutAuth();
    setOpen(false);
  };

  return (
    <header className="dd-header">
      <div className="dd-shell">
        <div className="dd-header-inner">
          {/* 로고 */}
          <Link href="/" className="dd-logo" aria-label="도담 홈">
            <span className="dd-logo-mark">
              <Icon name="Baby" size={20} strokeWidth={2.2} />
            </span>
            <span className="dd-logo-text">
              <span className="dd-logo-name">도담</span>
              <span className="dd-logo-sub">가족·육아 복지 도우미</span>
            </span>
          </Link>

          {/* 데스크톱 네비 */}
          <nav className="dd-nav dd-only-desktop">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "dd-nav-link" + (isActive(item.href) ? " is-active" : "")
                }
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
            <span className="dd-nav-auth">
              {isLoading ? (
                <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm" disabled>
                  확인 중...
                </button>
              ) : isAuthenticated ? (
                <>
                  <Link href="/mypage" className="dd-btn dd-btn-ghost dd-btn-sm">
                    <Icon name="User" size={15} /> {displayName}
                  </Link>
                  <button type="button" className="dd-btn dd-btn-coral dd-btn-sm" onClick={handleLogout}>
                    <Icon name="LogOut" size={15} /> 로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="dd-btn dd-btn-ghost dd-btn-sm">
                    로그인
                  </Link>
                  <Link href="/signup" className="dd-btn dd-btn-coral dd-btn-sm">
                    회원가입
                  </Link>
                </>
              )}
            </span>
          </nav>

          {/* 모바일 토글 */}
          <button
            type="button"
            className="dd-burger dd-only-mobile"
            onClick={() => setOpen((v) => !v)}
            aria-label="메뉴 열기"
            aria-expanded={open}
          >
            <Icon name={open ? "X" : "Menu"} size={24} />
          </button>
        </div>

        {/* 모바일 패널 */}
        {open && (
          <nav className="dd-mobile-nav dd-only-mobile">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "dd-nav-link" + (isActive(item.href) ? " is-active" : "")
                }
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {isLoading ? (
              <div className="d-flex gap-2 mt-2">
                <button type="button" className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-block" disabled>
                  확인 중...
                </button>
              </div>
            ) : isAuthenticated ? (
              <div className="d-flex gap-2 mt-2">
                <Link href="/mypage" className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-block" onClick={() => setOpen(false)}>
                  <Icon name="User" size={15} /> {displayName}
                </Link>
                <button type="button" className="dd-btn dd-btn-coral dd-btn-sm dd-btn-block" onClick={handleLogout}>
                  <Icon name="LogOut" size={15} /> 로그아웃
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2 mt-2">
                <Link href="/login" className="dd-btn dd-btn-ghost dd-btn-sm dd-btn-block" onClick={() => setOpen(false)}>
                  로그인
                </Link>
                <Link href="/signup" className="dd-btn dd-btn-coral dd-btn-sm dd-btn-block" onClick={() => setOpen(false)}>
                  회원가입
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
