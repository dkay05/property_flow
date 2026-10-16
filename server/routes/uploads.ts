import { Router } from "express";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { requireAuth } from "../middleware/auth";

const router = Router();

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

const ALLOWED_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/uploads  { data: "<base64>", ext: "jpg" } -> { url: "/uploads/<file>" }
router.post("/", requireAuth, async (req, res) => {
  const { data, ext } = req.body ?? {};

  if (typeof data !== "string" || !data) {
    return res.status(400).json({ message: "Missing base64 image data" });
  }

  // Tolerate a full data URI as well as bare base64.
  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data;

  const safeExt = String(ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED_EXT[safeExt]) {
    return res.status(400).json({ message: `Unsupported image type: ${safeExt}` });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return res.status(400).json({ message: "Invalid base64 data" });
  }

  if (!buffer.length) return res.status(400).json({ message: "Empty image" });
  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({ message: "Image too large (max 10MB)" });
  }

  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.${safeExt}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);

  // Relative so the url keeps working if the deployment domain changes;
  // the client resolves it against its configured API base.
  res.status(201).json({ url: `/uploads/${filename}` });
});

export default router;
