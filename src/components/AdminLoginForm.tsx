import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient.ts";
import { z } from "zod";
import { useAdminLogin } from "../hooks/useAdminAuth.ts";
import { AdminLoginSchema } from "../types/booking.ts";
import { Button } from "./ui/Button.tsx";

function LoginFormInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const login = useAdminLogin();

  // Redirect if already logged in
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("accessToken")) {
      window.location.href = "/admin/edit-services";
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    try {
      AdminLoginSchema.parse({ email: cleanEmail, password });
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? (err.issues[0]?.message ?? "Invalid input")
          : "Invalid input",
      );
      return;
    }

    setLoading(true);
    try {
      await login.mutateAsync({ email: cleanEmail, password });
      setSuccess(true);
      // Redirect directly to admin dashboard
      window.location.href = "/admin/edit-services";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 md:p-8 rounded-3xl border border-neutral-200 bg-white shadow-xl max-w-md w-full mx-auto"
    >
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          Admin Sign In
        </h2>
        <p className="text-xs text-neutral-500">
          Enter your salon admin credentials to manage services & shop details.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          Login successful! Redirecting...
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-700">
          Email
        </label>
        <input
          type="email"
          placeholder="cherrybrush.in@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading || success}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
          required
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-neutral-700">
          Password
        </label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading || success}
          className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 transition"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={loading || success}
        className="w-full mt-2"
      >
        {loading ? "Logging in…" : success ? "Redirecting…" : "Login"}
      </Button>

      <div className="text-center pt-2 border-t border-neutral-100">
        <p className="text-xs text-neutral-500">
          Need an account?{" "}
          <a
            href="/admin/register"
            className="text-rose-600 font-semibold hover:underline"
          >
            Register here
          </a>
        </p>
      </div>
    </form>
  );
}

export function AdminLoginForm() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoginFormInner />
    </QueryClientProvider>
  );
}
