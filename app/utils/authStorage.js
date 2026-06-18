"use client";

export const AUTH_USER_KEY = "dodam_user";
export const AUTH_ACCESS_TOKEN_KEY = "dodam_access_token";
export const AUTH_CHANGED_EVENT = "dodam:auth-changed";

const EMPTY_AUTH = { user: null, accessToken: null };

const removeStoredAuthFrom = (storage) => {
  storage.removeItem(AUTH_USER_KEY);
  storage.removeItem(AUTH_ACCESS_TOKEN_KEY);
};

const readStoredAuthFrom = (storage) => {
  const accessToken = storage.getItem(AUTH_ACCESS_TOKEN_KEY);

  if (!accessToken) {
    return null;
  }

  const storedUser = storage.getItem(AUTH_USER_KEY);
  if (!storedUser) {
    return { user: null, accessToken };
  }

  try {
    return {
      user: JSON.parse(storedUser),
      accessToken,
    };
  } catch {
    storage.removeItem(AUTH_USER_KEY);
    return { user: null, accessToken };
  }
};

export const notifyAuthChanged = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const readStoredAuth = () => {
  if (typeof window === "undefined") {
    return EMPTY_AUTH;
  }

  return (
    readStoredAuthFrom(window.localStorage) ||
    readStoredAuthFrom(window.sessionStorage) ||
    EMPTY_AUTH
  );
};

export const saveStoredAuth = ({ user, accessToken, remember = true }) => {
  if (typeof window === "undefined" || !accessToken) {
    return;
  }

  const targetStorage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;

  targetStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);

  if (user) {
    targetStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    targetStorage.removeItem(AUTH_USER_KEY);
  }

  removeStoredAuthFrom(otherStorage);
  notifyAuthChanged();
};

export const clearStoredAuth = () => {
  if (typeof window === "undefined") {
    return;
  }

  removeStoredAuthFrom(window.localStorage);
  removeStoredAuthFrom(window.sessionStorage);
  notifyAuthChanged();
};

export const isAuthStorageEvent = (event) =>
  event.key === AUTH_USER_KEY || event.key === AUTH_ACCESS_TOKEN_KEY;
