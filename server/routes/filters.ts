import { Router } from "express";
import { db } from "../db";
import { savedFilters } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const result = await db.select().from(savedFilters).orderBy(desc(savedFilters.createdAt));
  res.json(result);
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { name, filterType, criteria } = req.body;
  const [filter] = await db.insert(savedFilters).values({ name, filterType, criteria, createdById: req.member!.id }).returning();
  res.status(201).json(filter);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await db.delete(savedFilters).where(eq(savedFilters.id, req.params.id));
  res.json({ success: true });
});

export default router;
