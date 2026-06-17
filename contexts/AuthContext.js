"use client";

import { createContext, startTransition, useEffect, useState } from "react";
import axiosConfig from "@/apis/axiosConfig";

const USER_KEY = "dodam_user";
const ACCESS_TOKEN_KEY = "dodam_access_token";

export const AuthContext = createContext({
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
  loginAuth: () => {},
  logoutAuth: () => {},
  setUser: () => {},
  setAccessToken: () => {},
});

const removeStoredAuth = (storage) => {
  storage.removeItem(USER_KEY);
  storage.removeItem(ACCESS_TOKEN_KEY);
};

const saveStoredAuth = (storage, user, accessToken) => {
  storage.setItem(USER_KEY, JSON.stringify(user));
  storage.setItem(ACCESS_TOKEN_KEY, accessToken);
};

const readStoredAuth = () => {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null };
  }

  const readFromStorage = (storage) => {
    const storedUser = storage.getItem(USER_KEY);
    const storedAccessToken = storage.getItem(ACCESS_TOKEN_KEY);

    if (!storedUser || !storedAccessToken) {
      return null;
    }

    try {
      return {
        user: JSON.parse(storedUser),
        accessToken: storedAccessToken,
      };
    } catch {
      removeStoredAuth(storage);
      return null;
    }
  };

  return (
    readFromStorage(window.localStorage) ||
    readFromStorage(window.sessionStorage) || {
      user: null,
      accessToken: null,
    }
  );
};

export function AuthContextProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedAuth = readStoredAuth();

    startTransition(() => {
      setUser(storedAuth.user);
      setAccessToken(storedAuth.accessToken);
      setIsLoading(false);
    });

    if (storedAuth.accessToken) {
      axiosConfig.addAuthHeader(storedAuth.accessToken);
    } else {
      axiosConfig.removeAuthHeader();
    }
  }, []);

  const loginAuth = (nextUser, nextAccessToken, remember = false) => {
    if (typeof window !== "undefined") {
      const targetStorage = remember
        ? window.localStorage
        : window.sessionStorage;
      const otherStorage = remember
        ? window.sessionStorage
        : window.localStorage;

      saveStoredAuth(targetStorage, nextUser, nextAccessToken);
      removeStoredAuth(otherStorage);
    }

    setUser(nextUser);
    setAccessToken(nextAccessToken);
    axiosConfig.addAuthHeader(nextAccessToken);
  };

  const logoutAuth = () => {
    if (typeof window !== "undefined") {
      removeStoredAuth(window.localStorage);
      removeStoredAuth(window.sessionStorage);
    }

    setUser(null);
    setAccessToken(null);
    axiosConfig.removeAuthHeader();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!accessToken,
        loginAuth,
        logoutAuth,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
