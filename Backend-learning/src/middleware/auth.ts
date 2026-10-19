import { NextFunction, Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { isValidObjectId } from "mongoose";
import { env } from "../config/env";

export type Role = "admin" | "employee" | "student";

export interface AuthUser {
  id: string;
  role: Role;
  studentId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role, studentId: user.studentId }, env.jwtSecret, {
    subject: user.id,
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    req.user = { id: String(payload.sub), role: payload.role, studentId: payload.studentId };
    next();
  } catch {
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }
    next();
  };
}

export const requireStaff = requireRole("admin", "employee");
export const requireAdmin = requireRole("admin");

export function isStaff(req: Request): boolean {
  return req.user?.role === "admin" || req.user?.role === "employee";
}

// Staff may access any student; a student may only access their own records.
export function requireSelfOrStaff(param = "studentId") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (isStaff(req)) return next();
    const target = req.params[param] ?? req.body?.[param];
    if (req.user?.role === "student" && req.user.studentId && String(target) === req.user.studentId) {
      return next();
    }
    res.status(403).json({ message: "Forbidden." });
  };
}

const OBJECT_ID_PARAMS = ["id", "studentId", "examId", "groupId", "courseId", "lectureId"];

export function guardObjectIdParams(router: Router): void {
  for (const name of OBJECT_ID_PARAMS) {
    router.param(name, (req, res, next, value) => {
      if (!isValidObjectId(value)) {
        res.status(400).json({ message: `Invalid ${name}.` });
        return;
      }
      next();
    });
  }
}
