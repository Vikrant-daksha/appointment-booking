import { zodEnv } from "./zodEnv.ts";

export const BACKEND_URL = zodEnv.BACKEND_URL;
export const API_BASE = BACKEND_URL;

export function clearAuthTokens() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("adminId");
  }
}

/**
 * Safely decodes the payload of the stored JWT accessToken without verifying signature.
 * Returns adminId, email, and shopName directly from the client-side token.
 */
export function getStoredAdminInfo(): {
  adminId?: string;
  email?: string;
  shopName?: string;
} | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      adminId: parsed.adminId ?? parsed.id ?? parsed._id ?? parsed.sub,
      email: parsed.email,
      shopName: parsed.shopName,
    };
  } catch {
    return null;
  }
}

/**
 * Calls POST /admin/logout to clear server cookies, purges localStorage tokens,
 * and redirects to the login screen.
 */
export async function logoutAdmin(): Promise<void> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  try {
    await fetch(`${BACKEND_URL}/admin/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
  } catch (err) {
    console.warn("Logout request network issue:", err);
  } finally {
    clearAuthTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  }
}

/**
 * Standard fetch client with:
 * 1. Automatic Authorization: Bearer <accessToken> attachment for protected routes
 * 2. Automatic credentials: "include" so cookies (like admin_access & admin_refresh) are sent
 * 3. Immediate redirect on 401 when sessions are terminated/invalid
 */
export async function apiFetch(input: string, init: RequestInit = {}) {
  const url =
    input.startsWith("http://") || input.startsWith("https://")
      ? input
      : `${BACKEND_URL}${input.startsWith("/") ? "" : "/"}${input}`;

  const isAuthRoute =
    url.includes("/admin/login") || url.includes("/admin/register");

  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  // Never attach previous/expired Bearer token to login or register requests
  // Do not set Content-Type for FormData so the browser automatically sets multipart boundary
  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(!isAuthRoute && token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };

  const reqOptions: RequestInit = {
    ...init,
    credentials: init.credentials ?? "include",
    headers,
  };

  const response = await fetch(url, reqOptions);

  // If the backend returns 401 on a protected endpoint, clear tokens and redirect to login
  if (response.status === 401 && !isAuthRoute) {
    clearAuthTokens();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.includes("/admin/login")
    ) {
      window.location.href = "/admin/login";
    }
  }

  return response;
}
