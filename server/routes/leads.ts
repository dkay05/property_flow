import { Router } from "express";
import { db } from "../db";
import { leads, activities, followUps } from "@shared/schema";
import { eq, desc, and, or, ilike, gte, lte } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/leads
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { search, status, source, assignedTo } = req.query;
  let query = db.select().from(leads).orderBy(desc(leads.createdAt));

  const conditions = [];
  if (status) conditions.push(eq(leads.status, status as string));
  if (source) conditions.push(eq(leads.source, source as string));
  if (assignedTo) conditions.push(eq(leads.assignedMemberId, assignedTo as string));
  if (search) conditions.push(or(ilike(leads.name, `%${search}%`), ilike(leads.phone, `%${search}%`))!);

  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;
  if (!perms.view_all_leads && member.role !== "owner") {
    conditions.push(eq(leads.assignedMemberId, member.id));
  }

  const result = conditions.length
    ? await db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt))
    : await db.select().from(leads).orderBy(desc(leads.createdAt));

  res.json(result);
});

// GET /api/leads/:id
router.get("/:id", requireAuth, async (req, res) => {
  const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
  if (!lead) return res.status(404).json({ message: "Lead not found" });
  res.json(lead);
});

// POST /api/leads
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const body = req.body;
  const [lead] = await db.insert(leads).values(body).returning();
  await db.insert(activities).values({ leadId: lead.id, type: "created", description: "Lead created", agent: req.member!.name, agentId: req.member!.id });
  res.status(201).json(lead);
});

// PUT /api/leads/:id
router.put("/:id", requireAuth, async (req: AuthRequest, res) => {
  const [existing] = await db.select().from(leads).where(eq(leads.id, req.params.id));
  if (!existing) return res.status(404).json({ message: "Lead not found" });

  const [updated] = await db.update(leads).set({ ...req.body, updatedAt: new Date() }).where(eq(leads.id, req.params.id)).returning();

  if (req.body.status && req.body.status !== existing.status) {
    await db.insert(activities).values({ leadId: req.params.id, type: "status_change", description: `Status changed: ${existing.status} → ${req.body.status}`, agent: req.member!.name, agentId: req.member!.id });
  }
  res.json(updated);
});

// DELETE /api/leads/:id
router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(leads).where(eq(leads.id, req.params.id));
  res.json({ success: true });
});

// GET /api/leads/:id/activities
router.get("/:id/activities", requireAuth, async (req, res) => {
  const result = await db.select().from(activities).where(eq(activities.leadId, req.params.id)).orderBy(desc(activities.timestamp));
  res.json(result);
});

// POST /api/leads/:id/activities
router.post("/:id/activities", requireAuth, async (req: AuthRequest, res) => {
  const [activity] = await db.insert(activities).values({ ...req.body, leadId: req.params.id, agentId: req.member!.id, agent: req.member!.name }).returning();
  res.status(201).json(activity);
});

export default router;
