import { Router } from "express";
import type { Db } from "@openblock/db";
import { reelsService } from "./services/reels.js";

export default function reelsAnalysisRoutes(db: Db) {
  const router = Router();
  const svc = reelsService(db);

  // List reels
  router.get("/reels", async (req, res) => {
    const { status, tag, q } = req.query as Record<string, string | undefined>;
    const reels = await svc.list({ status, tag, q });
    res.json(reels);
  });

  // Get reel by ID
  router.get("/reels/:id", async (req, res) => {
    const reel = await svc.getById(req.params.id);
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    res.json(reel);
  });

  // Create reel (fetches transcript from ScrapeCreators)
  router.post("/reels", async (req, res) => {
    const { url, notes, tags } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required" });
      return;
    }
    if (!url.includes("instagram.com") && !url.includes("instagr.am")) {
      res.status(400).json({ error: "URL must be an Instagram link" });
      return;
    }

    const result = await svc.create({ url, notes, tags });
    if ("duplicate" in result) {
      res.status(409).json({ error: "Reel already saved", existing: result.existing });
      return;
    }
    res.status(201).json(result);
  });

  // Update reel
  router.patch("/reels/:id", async (req, res) => {
    const reel = await svc.update(req.params.id, req.body);
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    res.json(reel);
  });

  // Delete reel
  router.delete("/reels/:id", async (req, res) => {
    const reel = await svc.remove(req.params.id);
    if (!reel) {
      res.status(404).json({ error: "Reel not found" });
      return;
    }
    res.json(reel);
  });

  return router;
}
