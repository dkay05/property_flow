import { Router } from "express";
import { db } from "../db";
import { deals, leads, properties } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const result = await db.select().from(deals).orderBy(desc(deals.createdAt));
  res.json(result);
});

router.get("/:id", requireAuth, async (req, res) => {
  const [deal] = await db.select().from(deals).where(eq(deals.id, req.params.id));
  if (!deal) return res.status(404).json({ message: "Deal not found" });
  res.json(deal);
});

router.post("/", requireAuth, async (req, res) => {
  const body = req.body;
  if (!body.commissionAmount) {
    const rate = parseFloat(body.commissionRate || "3");
    body.commissionAmount = Math.round(body.offerPrice * (rate / 100));
  }
  const [deal] = await db.insert(deals).values(body).returning();
  res.status(201).json(deal);
});

router.put("/:id", requireAuth, async (req, res) => {
  const [updated] = await db.update(deals).set({ ...req.body, updatedAt: new Date() }).where(eq(deals.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ message: "Deal not found" });
  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(deals).where(eq(deals.id, req.params.id));
  res.json({ success: true });
});

export default router;
