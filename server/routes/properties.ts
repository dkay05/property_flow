import { Router } from "express";
import { db } from "../db";
import { properties, statusHistory } from "@shared/schema";
import { eq, desc, and, gte, lte, ilike } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { status, city, propertyType, minPrice, maxPrice, bedrooms, search } = req.query;
  const conditions = [];
  if (status) conditions.push(eq(properties.status, status as string));
  if (city) conditions.push(ilike(properties.city, `%${city}%`));
  if (propertyType) conditions.push(eq(properties.propertyType, propertyType as string));
  if (bedrooms) conditions.push(eq(properties.bedrooms, parseInt(bedrooms as string)));
  if (search) conditions.push(ilike(properties.address, `%${search}%`));

  const result = conditions.length
    ? await db.select().from(properties).where(and(...conditions)).orderBy(desc(properties.createdAt))
    : await db.select().from(properties).orderBy(desc(properties.createdAt));
  res.json(result);
});

router.get("/:id", requireAuth, async (req, res) => {
  const [prop] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!prop) return res.status(404).json({ message: "Property not found" });
  res.json(prop);
});

router.post("/", requireAuth, async (req, res) => {
  const [prop] = await db.insert(properties).values(req.body).returning();
  res.status(201).json(prop);
});

router.put("/:id", requireAuth, async (req, res) => {
  const [updated] = await db.update(properties).set(req.body).where(eq(properties.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Property not found" });
  res.json(updated);
});

// PUT /api/properties/:id/status
router.put("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  const { newStatus, reason } = req.body;
  if (!newStatus) return res.status(400).json({ message: "newStatus required" });

  const [existing] = await db.select().from(properties).where(eq(properties.id, req.params.id));
  if (!existing) return res.status(404).json({ message: "Property not found" });

  const [updated] = await db.update(properties).set({ status: newStatus }).where(eq(properties.id, req.params.id)).returning();

  const [history] = await db.insert(statusHistory).values({
    propertyId: req.params.id,
    previousStatus: existing.status,
    newStatus,
    reason: reason || "",
    changedBy: req.member!.name,
    changedById: req.member!.id,
  }).returning();

  res.json({ property: updated, history });
});

// GET /api/properties/:id/history
router.get("/:id/history", requireAuth, async (req, res) => {
  const result = await db.select().from(statusHistory).where(eq(statusHistory.propertyId, req.params.id)).orderBy(desc(statusHistory.changedAt));
  res.json(result);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(properties).where(eq(properties.id, req.params.id));
  res.json({ success: true });
});

export default router;
