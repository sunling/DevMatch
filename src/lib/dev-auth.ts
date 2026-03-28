// Dev bypass authentication for UI development
// Set NEXT_PUBLIC_DEV_BYPASS_AUTH=true to skip real auth

import { mockCurrentUser } from "./mock-data";

const DEV_BYPASS_ENABLED =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export const isDevBypassEnabled = () => DEV_BYPASS_ENABLED;

export const getDevUser = () => {
  if (!DEV_BYPASS_ENABLED) return null;
  return mockCurrentUser;
};

export const devSignIn = () => {
  if (typeof window !== "undefined" && DEV_BYPASS_ENABLED) {
    localStorage.setItem("dev_bypass_auth", "true");
    localStorage.setItem("dev_user", JSON.stringify(mockCurrentUser));
  }
};

export const devSignOut = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("dev_bypass_auth");
    localStorage.removeItem("dev_user");
  }
};

export const isDevAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("dev_bypass_auth") === "true";
};

export const getStoredDevUser = () => {
  if (typeof window === "undefined") return null;
  const userJson = localStorage.getItem("dev_user");
  return userJson ? JSON.parse(userJson) : null;
};
