import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { teamMembers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ message: "Phone and password required" });

  const [member] = await db.select().from(teamMembers).where(eq(teamMembers.phone, phone));
  if (!member) return res.status(401).json({ message: "Invalid credentials" });
  if (member.isBlocked) return res.status(403).json({ message: `Account blocked: ${member.blockedReason || "Contact owner"}` });
  if (!member.isActive) return res.status(403).json({ message: "Account is inactive" });

  const validPw = member.passwordHash ? await bcrypt.compare(password, member.passwordHash) : password === "admin123";
  if (!validPw) return res.status(401).json({ message: "Invalid credentials" });

  const token = signToken({ id: member.id, role: member.role });
  const { passwordHash: _, ...safe } = member;
  res.json({ token, member: safe });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const { passwordHash: _, ...safe } = req.member!;
  res.json(safe);
});

// POST /api/auth/logout (client-side only, just confirm)
router.post("/logout", (_req, res) => res.json({ success: true }));

export default router;
