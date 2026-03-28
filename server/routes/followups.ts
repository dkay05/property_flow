import { Router } from "express";
import { db } from "../db";
import { followUps, leads } from "@shared/schema";
import { eq, desc, and, gte, lte, or } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/followups?date=2024-01-15&status=pending&assignedTo=id
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { date, status, assignedTo, startDate, endDate, leadId } = req.query;
  const conditions = [];
  if (status) conditions.push(eq(followUps.status, status as string));
  if (date) conditions.push(eq(followUps.date, date as string));
  if (assignedTo) conditions.push(eq(followUps.assignedTo, assignedTo as string));
  if (leadId) conditions.push(eq(followUps.leadId, leadId as string));
  if (startDate) conditions.push(gte(followUps.date, startDate as string));
  if (endDate) conditions.push(lte(followUps.date, endDate as string));

  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;
  if (!perms.view_all_leads && member.role !== "owner") {
    conditions.push(eq(followUps.assignedTo, member.id));
  }

  const result = conditions.length
    ? await db.select().from(followUps).where(and(...conditions)).orderBy(followUps.date, followUps.time)
    : await db.select().from(followUps).orderBy(followUps.date, followUps.time);
  res.json(result);
});

// GET /api/followups/calendar?year=2024&month=1
router.get("/calendar", requireAuth, async (req: AuthRequest, res) => {
  const { year, month } = req.query;
  const y = parseInt(year as string) || new Date().getFullYear();
  const m = parseInt(month as string) || new Date().getMonth() + 1;
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = `${y}-${String(m).padStart(2, "0")}-31`;

  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;
  const conditions: any[] = [gte(followUps.date, startDate), lte(followUps.date, endDate)];
  if (!perms.view_all_leads && member.role !== "owner") {
    conditions.push(eq(followUps.assignedTo, member.id));
  }

  const result = await db.select().from(followUps).where(and(...conditions)).orderBy(followUps.date, followUps.time);

  // Group by date for calendar view
  const grouped: Record<string, typeof result> = {};
  for (const fu of result) {
    if (!grouped[fu.date]) grouped[fu.date] = [];
    grouped[fu.date].push(fu);
  }
  res.json({ followUps: result, byDate: grouped });
});

router.get("/:id", requireAuth, async (req, res) => {
  const [fu] = await db.select().from(followUps).where(eq(followUps.id, req.params.id));
  if (!fu) return res.status(404).json({ message: "Follow-up not found" });
  res.json(fu);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const body = { ...req.body };
  if (!body.assignedTo) body.assignedTo = req.member!.id;
  const [fu] = await db.insert(followUps).values(body).returning();
  res.status(201).json(fu);
});

router.put("/:id", requireAuth, async (req, res) => {
  const [updated] = await db.update(followUps).set({ ...req.body, updatedAt: new Date() }).where(eq(followUps.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Follow-up not found" });
  res.json(updated);
});

// POST /api/followups/:id/done
router.post("/:id/done", requireAuth, async (req: AuthRequest, res) => {
  const [updated] = await db.update(followUps).set({ status: "done", updatedAt: new Date() }).where(eq(followUps.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Follow-up not found" });
  res.json(updated);
});

// POST /api/followups/:id/snooze
router.post("/:id/snooze", requireAuth, async (req, res) => {
  const { newDate, newTime } = req.body;
  const [updated] = await db.update(followUps).set({ status: "snoozed", date: newDate, time: newTime, updatedAt: new Date() }).where(eq(followUps.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Follow-up not found" });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(followUps).where(eq(followUps.id, req.params.id));
  res.json({ success: true });
});

export default router;
