import { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// In-memory counters: valid for a single backend process only.
// Running multiple instances (PM2 cluster) requires a shared store such as Redis.
// Authenticated requests are counted per user, so students sharing one classroom/NAT IP
// do not exhaust each other's quota. Anonymous requests are counted per client IP.
function userOrIpKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      if (payload.sub) return `user:${payload.sub}`;
    } catch {
      // fall through to IP
    }
  }
  return `ip:${req.ip}`;
}

function limiter(max: number, message: string, keyGenerator?: (req: Request) => string, skipSuccessfulRequests = false) {
  return rateLimit({
    windowMs: env.rateLimit.windowMs,
    limit: max,
    ...(keyGenerator ? { keyGenerator } : {}),
    skipSuccessfulRequests,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({ message });
    },
  });
}

export const apiLimiter = limiter(env.rateLimit.apiMax, "Too many requests. Please try again later.", userOrIpKey);
// Counts failed logins only, so a class logging in from one shared IP is not blocked.
export const authLimiter = limiter(env.rateLimit.authMax, "Too many login attempts. Please try again later.", undefined, true);
export const sensitiveLimiter = limiter(env.rateLimit.sensitiveMax, "Too many requests for this operation. Please try again later.", userOrIpKey);
export const whatsappLimiter = limiter(env.rateLimit.whatsappMax, "Too many WhatsApp requests. Please try again later.", userOrIpKey);

function hasOperatorKeys(value: unknown, depth = 0): boolean {
  if (depth > 10 || value === null || typeof value !== "object") return false;
  for (const key of Object.keys(value as object)) {
    if (key.startsWith("$") || key.includes(".")) return true;
    if (hasOperatorKeys((value as Record<string, unknown>)[key], depth + 1)) return true;
  }
  return false;
}

// Rejects MongoDB operator injection ({"$ne": ...}) in body and query.
export function rejectMongoOperators(req: Request, res: Response, next: NextFunction): void {
  if (hasOperatorKeys(req.body) || hasOperatorKeys(req.query)) {
    res.status(400).json({ message: "Invalid request payload." });
    return;
  }
  next();
}
