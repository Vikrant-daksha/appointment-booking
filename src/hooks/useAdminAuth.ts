import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiFetch,
  logoutAdmin,
  clearAuthTokens,
} from "../lib/api.ts";
import { zodEnv } from "../lib/zodEnv.ts";
import {
  AdminLoginSchema,
  AdminRegisterSchema,
  type AdminLoginRequest,
  type AdminRegisterRequest,
  type LoginResponse,
  type LogoutResponse,
} from "../types/booking.ts";

function apiError(res: Response): Promise<Error> {
  return res.json().catch(() => ({})).then((body) => {
    const msg =
      (body as any)?.message ||
      (body as any)?.error ||
      (body as any)?.errors?.[0]?.message ||
      (body as any)?.msg;
    return new Error(msg || `Request failed (${res.status})`);
  });
}

export function useAdminLogin() {
  return useMutation({
    mutationFn: async (data: AdminLoginRequest) => {
      AdminLoginSchema.parse(data); // client-side validation before the request
      const res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/login`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw await apiError(res);
      const json = (await res.json()) as LoginResponse;

      // Persist tokens and adminId so protected admin routes can read them later
      localStorage.setItem("accessToken", json.accessToken);
      localStorage.setItem("refreshToken", json.refreshToken);

      const adminId =
        (json as any).admin?._id ??
        (json as any).admin?.id ??
        (json as any).payload?.adminId;

      if (adminId) {
        localStorage.setItem("adminId", String(adminId));
      }

      return json;
    },
  });
}

export function useAdminRegister() {
  return useMutation({
    mutationFn: async (data: AdminRegisterRequest) => {
      AdminRegisterSchema.parse(data); // client-side validation before the request
      const res = await apiFetch(`${zodEnv.BACKEND_URL}/admin/register`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw await apiError(res);
      const json = (await res.json()) as {
        success: boolean;
        message?: string;
        accessToken?: string;
        refreshToken?: string;
        admin?: { _id?: string; id?: string };
        payload?: { adminId?: string };
      };

      // Persist tokens so the protected image upload (and later admin calls) work right after sign-up
      if (json.accessToken) {
        localStorage.setItem("accessToken", json.accessToken);
        localStorage.setItem("refreshToken", json.refreshToken ?? "");
      }

      const adminId =
        json.admin?._id ??
        json.admin?.id ??
        json.payload?.adminId;

      if (adminId) {
        localStorage.setItem("adminId", String(adminId));
      }

      return json;
    },
  });
}

export function useAdminLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await logoutAdmin();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
