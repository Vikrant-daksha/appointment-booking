import { z } from "zod";

// ============================================================================
// Admin auth types (from BackendSpec.md). Frontend never sends `role` — the
// backend forces it to "user" on register, so it is intentionally absent here.
// ============================================================================

export const OpeningTimingsSchema = z
  .object({
    monday: z.string().optional(),
    tuesday: z.string().optional(),
    wednesday: z.string().optional(),
    thursday: z.string().optional(),
    friday: z.string().optional(),
    saturday: z.string().optional(),
    sunday: z.string().optional(),
  })
  .strict();

// `role` is NOT included: backend sets it to "user" forcibly.
export const AdminRegisterSchema = z.object({
  email: z.string().email({ message: "Invalid email" }),
  password: z.string().min(1, { message: "Password is required" }),
  shopName: z.string().min(1, { message: "Shop name is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  phone: z.string().min(1, { message: "Phone is required" }),
  openingTimings: OpeningTimingsSchema.default({}),
});

export const AdminLoginSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export type AdminLoginRequest = z.infer<typeof AdminLoginSchema>;
export type AdminRegisterRequest = z.infer<typeof AdminRegisterSchema>;

export interface PublicShop {
  id?: string;
  _id?: string;
  email: string;
  role: "user" | "admin";
  shopName: string;
  openingTimings: Record<string, string>;
  location: string;
  phone: string;
  shopImages: string[];
  createdAt?: string;
}

// =========================================================================
// 2. SERVICE & CATALOG TYPES
// =========================================================================

export const ServiceFeatureSchema = z.object({
  name: z.string().min(1, "Feature name is required"),
  price: z.string().default("₹0"),
  additive: z.boolean().default(true),
  required: z.boolean().default(false),
  oneOrMany: z.number().default(1),
});

export type ServiceFeature = z.infer<typeof ServiceFeatureSchema>;

export type ServiceOptions = Record<string, ServiceFeature[]>;

export const ServiceCreateSchema = z.object({
  shopId: z.string().optional(),
  serviceName: z.string().min(1, "Service name is required"),
  serviceType: z.string().min(1, "Category / Service type is required"),
  serviceDuration: z.string().min(1, "Service duration is required"),
  basePrice: z.union([z.number(), z.string()]).optional(),
  serviceDown: z.boolean().default(false),
  serviceImages: z.array(z.string()).optional(),
  serviceOptions: z.record(z.string(), z.array(ServiceFeatureSchema)).optional(),
});

export type ServiceCreateRequest = z.infer<typeof ServiceCreateSchema>;

export interface Service {
  _id?: string;
  id?: string;
  serviceName: string;
  basePrice?: number | string;
  serviceImages?: string[];
  serviceType: string;
  serviceDuration: string;
  serviceOptions?: ServiceOptions;
  serviceDown?: boolean;
  shopId?: string;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string; // 15 min
  refreshToken: string; // 7 d
}

export interface RefreshTokenRequest {
  refreshToken?: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
  payload: {
    adminId: string;
    email: string;
    role: string;
    shopName: string;
  };
  admin: PublicShop;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  [key: string]: any;
}

// =========================================================================
// 5. BOOKING CREATION & CONFIRMATION TYPES (BackendSpec.md C.8)
// =========================================================================

export type BookingStatus = "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface SelectedOption {
  featureName: string;
  price: string;
  additive: boolean;
}

export interface BookingCartItem {
  serviceId: string; // References Service._id / id
  serviceName: string;
  selectedOptions: SelectedOption[];
  totalPrice: number;
}

export interface Booking {
  _id?: string;
  id?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shopId: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // e.g. "11:30 AM"
  cart: BookingCartItem[];
  notes?: string;
  status: BookingStatus;
  createdAt?: string;
  deleted?: boolean;
}

export interface BookingCreateRequest {
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shopId: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string;
  cart: BookingCartItem[];
  notes?: string;
}

export interface BookingCreateResponse {
  success: boolean;
  message?: string;
  booking?: Booking;
}
