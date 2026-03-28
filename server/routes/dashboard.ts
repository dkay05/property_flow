import { Router } from "express";
import { db } from "../db";
import { leads, properties, deals, followUps, teamMembers, blacklist } from "@shared/schema";
import { eq, and, gte, lte, count, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/stats", requireAuth, async (req: AuthRequest, res) => {
  const today = new Date().toISOString().split("T")[0];
  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;
  const isAdmin = member.role === "owner" || perms.view_all_leads;

  const [leadsCount] = await db.select({ count: count() }).from(leads);
  const [propertiesCount] = await db.select({ count: count() }).from(properties);
  const [dealsCount] = await db.select({ count: count() }).from(deals);
  const [teamCount] = await db.select({ count: count() }).from(teamMembers).where(eq(teamMembers.isActive, true));
  const [blockedCount] = await db.select({ count: count() }).from(teamMembers).where(eq(teamMembers.isBlocked, true));
  const [blacklistCount] = await db.select({ count: count() }).from(blacklist).where(eq(blacklist.isActive, true));

  const todayFollowUps = await db.select().from(followUps).where(eq(followUps.date, today));
  const overdueFollowUps = await db.select().from(followUps).where(and(eq(followUps.status, "pending"), lte(followUps.date, today)));

  const availableProps = await db.select({ count: count() }).from(properties).where(eq(properties.status, "available"));
  const soldProps = await db.select({ count: count() }).from(properties).where(eq(properties.status, "sold"));

  const leadsByStatus = await db.select({ status: leads.status, count: count() }).from(leads).groupBy(leads.status);
  const dealsByStatus = await db.select({ status: deals.status, count: count() }).from(deals).groupBy(deals.status);

  res.json({
    leads: leadsCount.count,
    properties: propertiesCount.count,
    deals: dealsCount.count,
    teamMembers: teamCount.count,
    blockedMembers: blockedCount.count,
    blacklistedClients: blacklistCount.count,
    todayFollowUps: todayFollowUps.length,
    overdueFollowUps: overdueFollowUps.length,
    availableProperties: availableProps[0].count,
    soldProperties: soldProps[0].count,
    leadsByStatus,
    dealsByStatus,
  });
});

// GET /api/dashboard/today — today's follow-ups
router.get("/today", requireAuth, async (req: AuthRequest, res) => {
  const today = new Date().toISOString().split("T")[0];
  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;

  const conditions: any[] = [eq(followUps.date, today)];
  if (!perms.view_all_leads && member.role !== "owner") {
    conditions.push(eq(followUps.assignedTo, member.id));
  }

  const result = await db.select().from(followUps).where(and(...conditions)).orderBy(followUps.time);
  res.json(result);
});

// GET /api/dashboard/overdue
router.get("/overdue", requireAuth, async (req: AuthRequest, res) => {
  const today = new Date().toISOString().split("T")[0];
  const member = req.member!;
  const perms = member.permissions as Record<string, boolean>;

  const conditions: any[] = [eq(followUps.status, "pending"), lte(followUps.date, today)];
  if (!perms.view_all_leads && member.role !== "owner") {
    conditions.push(eq(followUps.assignedTo, member.id));
  }

  const result = await db.select().from(followUps).where(and(...conditions)).orderBy(desc(followUps.date));
  res.json(result);
});

export default router;
