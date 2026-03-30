import { Router } from "express";
import type { Db } from "@openblock/db";
import { starterItemsService } from "./services/items.js";

export default function starterRoutes(db: Db) {
  const router = Router();
  const svc = starterItemsService(db);

  // List items
  router.get("/items", async (req, res) => {
    const { status, category, q } = req.query as Record<string, string | undefined>;
    const items = await svc.list({ status, category, q });
    res.json(items);
  });

  // Get item by ID
  router.get("/items/:id", async (req, res) => {
    const item = await svc.getById(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  });

  // Create item
  router.post("/items", async (req, res) => {
    const item = await svc.create(req.body);
    res.status(201).json(item);
  });

  // Update item
  router.patch("/items/:id", async (req, res) => {
    const item = await svc.update(req.params.id, req.body);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  });

  // Delete item
  router.delete("/items/:id", async (req, res) => {
    const item = await svc.delete(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  });

  // Update item status (kanban)
  router.patch("/items/:id/status", async (req, res) => {
    const item = await svc.updateStatus(req.params.id, req.body.status);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  });

  // List events for an item
  router.get("/items/:id/events", async (req, res) => {
    const events = await svc.listEvents(req.params.id);
    res.json(events);
  });

  // Create event for an item
  router.post("/items/:id/events", async (req, res) => {
    const event = await svc.createEvent(req.params.id, req.body);
    res.status(201).json(event);
  });

  // Board data (items grouped by status)
  router.get("/board", async (_req, res) => {
    const board = await svc.getBoard();
    res.json(board);
  });

  return router;
}
