import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { teamMembers } from "@shared/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "propertyflow-secret-key-2024";

export interface AuthRequest extends Request {
  member?: typeof teamMembers.$inferSelect;
}

export function signToken(payload: { id: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, payload.id));
    if (!member) return res.status(401).json({ message: "User not found" });
    if (member.isBlocked) return res.status(403).json({ message: "Your account has been blocked. Contact admin." });
    if (!member.isActive) return res.status(403).json({ message: "Your account is inactive." });
    req.member = member;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.member) return res.status(401).json({ message: "Not authenticated" });
    if (!roles.includes(req.member.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}
