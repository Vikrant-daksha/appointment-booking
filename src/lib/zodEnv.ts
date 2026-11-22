import { z } from "zod";

const envSchema = z.object({
  BACKEND_URL: z
    .string({
      error: "BACKEND_URL is required in your environment variables (.env)",
    })
    .url("BACKEND_URL must be a valid URL (e.g. http://localhost:8080)")
    .min(1, "BACKEND_URL cannot be empty"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  // Astro natively exposes client-accessible variables via import.meta.env.PUBLIC_*
  const rawBackendUrl =
    import.meta.env.PUBLIC_BACKEND_URL ||
    import.meta.env.BACKEND_URL;

  const result = envSchema.safeParse({
    BACKEND_URL: rawBackendUrl,
  });

  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("\n");

    const errorMessage = `\n❌ [zodEnv] Environment validation failed:\n${formattedErrors}\n\nPlease check your .env file and ensure PUBLIC_BACKEND_URL (or BACKEND_URL) is set.\n`;

    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return result.data;
}

export const zodEnv = parseEnv();
export const env = zodEnv;
export default zodEnv;
