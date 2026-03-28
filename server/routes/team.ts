import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { teamMembers } from "@shared/schema";
import { eq, ne } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";

const router = Router();

const ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  owner:     { manage_team: true, view_all_leads: true, edit_leads: true, delete_leads: true, manage_properties: true, view_reports: true, manage_blacklist: true, manage_filters: true, manage_deals: true, access_admin: true },
  team_lead: { manage_team: false, view_all_leads: true, edit_leads: true, delete_leads: false, manage_properties: true, view_reports: true, manage_blacklist: true, manage_filters: true, manage_deals: true, access_admin: false },
  agent:     { manage_team: false, view_all_leads: false, edit_leads: true, delete_leads: false, manage_properties: false, view_reports: false, manage_blacklist: false, manage_filters: true, manage_deals: true, access_admin: false },
  custom:    { manage_team: false, view_all_leads: false, edit_leads: false, delete_leads: false, manage_properties: false, view_reports: false, manage_blacklist: false, manage_filters: false, manage_deals: false, access_admin: false },
};

// GET /api/team
router.get("/", requireAuth, async (_req, res) => {
  const members = await db.select().from(teamMembers);
  const safe = members.map(({ passwordHash: _, ...m }) => m);
  res.json(safe);
});

// GET /api/team/:id
router.get("/:id", requireAuth, async (req, res) => {
  const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, req.params.id));
  if (!member) return res.status(404).json({ message: "Member not found" });
  const { passwordHash: _, ...safe } = member;
  res.json(safe);
});

// POST /api/team
router.post("/", requireAuth, requireRole("owner", "team_lead"), async (req: AuthRequest, res) => {
  const { name, phone, email, role = "agent", password, permissions } = req.body;
  if (!name || !phone) return res.status(400).json({ message: "Name and phone required" });

  const existing = await db.select().from(teamMembers).where(eq(teamMembers.phone, phone));
  if (existing.length) return res.status(409).json({ message: "Phone number already registered" });

  const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash("admin123", 10);
  const perms = permissions || ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.agent;

  const [member] = await db.insert(teamMembers).values({ name, phone, email, role, passwordHash, permissions: perms }).returning();
  const { passwordHash: _, ...safe } = member;
  res.status(201).json(safe);
});

// PUT /api/team/:id
router.put("/:id", requireAuth, requireRole("owner", "team_lead"), async (req: AuthRequest, res) => {
  const { name, phone, email, role, isActive, permissions, password } = req.body;
  const updates: Partial<typeof teamMembers.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email;
  if (role !== undefined) { updates.role = role; if (!permissions) updates.permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.agent; }
  if (isActive !== undefined) updates.isActive = isActive;
  if (permissions !== undefined) updates.permissions = permissions;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);

  const [updated] = await db.update(teamMembers).set(updates).where(eq(teamMembers.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Member not found" });
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// POST /api/team/:id/block
router.post("/:id/block", requireAuth, requireRole("owner"), async (req: AuthRequest, res) => {
  if (req.params.id === req.member!.id) return res.status(400).json({ message: "Cannot block yourself" });
  const { reason } = req.body;
  const [updated] = await db.update(teamMembers).set({ isBlocked: true, isActive: false, blockedReason: reason || "Blocked by admin", blockedAt: new Date(), updatedAt: new Date() }).where(eq(teamMembers.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Member not found" });
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// POST /api/team/:id/unblock
router.post("/:id/unblock", requireAuth, requireRole("owner"), async (req, res) => {
  const [updated] = await db.update(teamMembers).set({ isBlocked: false, isActive: true, blockedReason: null, blockedAt: null, updatedAt: new Date() }).where(eq(teamMembers.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Member not found" });
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// PUT /api/team/:id/permissions
router.put("/:id/permissions", requireAuth, requireRole("owner"), async (req, res) => {
  const { permissions } = req.body;
  const [updated] = await db.update(teamMembers).set({ permissions, updatedAt: new Date() }).where(eq(teamMembers.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Member not found" });
  const { passwordHash: _, ...safe } = updated;
  res.json(safe);
});

// DELETE /api/team/:id
router.delete("/:id", requireAuth, requireRole("owner"), async (req: AuthRequest, res) => {
  if (req.params.id === req.member!.id) return res.status(400).json({ message: "Cannot delete yourself" });
  await db.delete(teamMembers).where(eq(teamMembers.id, req.params.id));
  res.json({ success: true });
});

export default router;
