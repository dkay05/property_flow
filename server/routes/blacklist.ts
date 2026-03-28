import { Router } from "express";
import { db } from "../db";
import { blacklist, leads } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const result = await db.select().from(blacklist).where(eq(blacklist.isActive, true)).orderBy(desc(blacklist.blockedAt));
  res.json(result);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { clientName, phoneNumber, email, leadId, reason, reasonDescription } = req.body;
  const [entry] = await db.insert(blacklist).values({
    clientName, phoneNumber, email, leadId, reason: reason || "spam",
    reasonDescription, blockedBy: req.member!.name, blockedById: req.member!.id,
  }).returning();

  if (leadId) {
    await db.update(leads).set({ isBlacklisted: true, updatedAt: new Date() }).where(eq(leads.id, leadId));
  }
  res.status(201).json(entry);
});

// POST /api/blacklist/:id/unblock
router.post("/:id/unblock", requireAuth, async (req, res) => {
  const [entry] = await db.select().from(blacklist).where(eq(blacklist.id, req.params.id));
  if (!entry) return res.status(404).json({ message: "Entry not found" });

  const [updated] = await db.update(blacklist).set({ isActive: false }).where(eq(blacklist.id, req.params.id)).returning();

  if (entry.leadId) {
    const others = await db.select().from(blacklist).where(and(eq(blacklist.leadId, entry.leadId), eq(blacklist.isActive, true)));
    if (others.length === 0) {
      await db.update(leads).set({ isBlacklisted: false, updatedAt: new Date() }).where(eq(leads.id, entry.leadId));
    }
  }
  res.json(updated);
});

router.delete("/:id", requireAuth, requireRole("owner"), async (req, res) => {
  await db.delete(blacklist).where(eq(blacklist.id, req.params.id));
  res.json({ success: true });
});

export default router;
