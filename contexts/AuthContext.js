"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import axiosConfig from "@/apis/axiosConfig";
import {
  AUTH_CHANGED_EVENT,
  clearStoredAuth,
  isAuthStorageEvent,
  readStoredAuth,
  saveStoredAuth,
  updateStoredUser,
} from "@/app/utils/authStorage";

export const AuthContext = createContext({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  loginAuth: () => {},
  logoutAuth: () => {},
  updateUserAuth: () => {},
  setUser: () => {},
  setAccessToken: () => {},
});

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAuth = useCallback((nextAuth) => {
    setUser(nextAuth.user);
    setAccessToken(nextAuth.accessToken);

    if (nextAuth.accessToken) {
      axiosConfig.addAuthHeader(nextAuth.accessToken);
    } else {
      axiosConfig.removeAuthHeader();
    }
  }, []);

  const syncAuthFromStorage = useCallback(() => {
    applyAuth(readStoredAuth());
  }, [applyAuth]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      startTransition(() => {
        syncAuthFromStorage();
        setIsLoading(false);
      });

      const handleAuthChanged = () => syncAuthFromStorage();
      const handleStorage = (event) => {
        if (isAuthStorageEvent(event)) {
          syncAuthFromStorage();
        }
      };

      window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
      window.addEventListener("storage", handleStorage);

      return () => {
        window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
        window.removeEventListener("storage", handleStorage);
      };
    }
  }, [syncAuthFromStorage]);

  const loginAuth = useCallback(
    (nextUser, nextAccessToken, remember = true) => {
      saveStoredAuth({
        user: nextUser,
        accessToken: nextAccessToken,
        remember,
      });
      applyAuth({ user: nextUser, accessToken: nextAccessToken });
    },
    [applyAuth]
  );

  const logoutAuth = useCallback(() => {
    clearStoredAuth();
    applyAuth({ user: null, accessToken: null });
  }, [applyAuth]);

  const updateUserAuth = useCallback((nextUser) => {
    setUser(nextUser);
    updateStoredUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!accessToken,
        loginAuth,
        logoutAuth,
        updateUserAuth,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
