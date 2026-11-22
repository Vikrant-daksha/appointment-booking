import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAdminRegister } from "../hooks/useAdminAuth.ts";
import { AdminRegisterSchema } from "../types/booking.ts";
import { Button } from "./ui/Button.tsx";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

type RegisterForm = {
  email: string;
  password: string;
  shopName: string;
  location: string;
  phone: string;
  openingTimings: Record<string, string>;
};

function RegisterFormInner() {
  const [form, setForm] = useState<RegisterForm>({
    email: "",
    password: "",
    shopName: "",
    location: "",
    phone: "",
    openingTimings: {},
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const register = useAdminRegister();

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    try {
      AdminRegisterSchema.parse(form);
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
      await register.mutateAsync(form);
      window.location.href = "/book";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const update =
    (key: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-6 rounded-2xl border border-input bg-card shadow-lg max-w-lg mx-auto"
    >
      <h2 className="text-2xl font-semibold text-center">Admin Register</h2>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="you@shop.com"
            value={form.email}
            onChange={update("email")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={update("password")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Shop name</label>
          <input
            type="text"
            placeholder="Shop name"
            value={form.shopName}
            onChange={update("shopName")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Location</label>
          <input
            type="text"
            placeholder="Location"
            value={form.location}
            onChange={update("location")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Phone</label>
          <input
            type="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={update("phone")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Opening timings (optional)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DAYS.map((day) => (
            <div key={day} className="space-y-1">
              <label className="text-xs font-medium capitalize">{day}</label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM – 7:00 PM"
                value={form.openingTimings[day] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((p) => ({
                    ...p,
                    openingTimings: {
                      ...p.openingTimings,
                      [day]: v,
                    },
                  }));
                }}
                className="w-full rounded-lg border border-input bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="py-1 px-5 text-sm rounded-sm w-full"
      >
        {loading ? "Registering…" : "Register"}
      </Button>
    </form>
  );
}

export function AdminRegisterForm() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <RegisterFormInner />
    </QueryClientProvider>
  );
}
