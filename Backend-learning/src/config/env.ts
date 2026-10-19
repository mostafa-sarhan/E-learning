import dotenv from "dotenv";

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";

function intEnv(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

// TRUST_PROXY: number of trusted proxy hops (e.g. 1 behind Nginx). Never "true".
function trustProxy(): number | false {
  const hops = Number.parseInt(process.env.TRUST_PROXY ?? "", 10);
  return Number.isFinite(hops) && hops > 0 ? hops : false;
}

const jwtSecret = required("JWT_SECRET", "dev-only-insecure-secret-change-me");
if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}

export const env = {
  isProduction,
  port: intEnv("PORT", 5000),
  host: process.env.HOST || "127.0.0.1",
  mongoUri: required("MONGO_URI", "mongodb://localhost:27017/students"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  corsOrigins: required("CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  trustProxy: trustProxy(),
  bodyLimit: process.env.BODY_LIMIT || "100kb",
  whatsappEnabled: process.env.WHATSAPP_ENABLED !== "false",
  whatsappSessionPath: process.env.WHATSAPP_SESSION_PATH || ".wwebjs_auth",
  chromiumPath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  rateLimit: {
    windowMs: intEnv("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    apiMax: intEnv("RATE_LIMIT_API_MAX", 1500),
    authMax: intEnv("RATE_LIMIT_AUTH_MAX", 20),
    sensitiveMax: intEnv("RATE_LIMIT_SENSITIVE_MAX", 30),
    whatsappMax: intEnv("RATE_LIMIT_WHATSAPP_MAX", 20),
  },
};
