import { Router } from "express";
import type { Db } from "@openblock/db";
import { createDocumentSchema, updateDocumentSchema } from "@openblock/shared";
import { validate } from "../middleware/validate.js";
import { documentService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function documentRoutes(db: Db) {
  const router = Router();
  const svc = documentService(db);

  router.get("/companies/:companyId/documents", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const tags = req.query.tags ? (req.query.tags as string).split(",") : undefined;
    const search = (req.query.search as string) || undefined;

    const result = await svc.list(companyId, { tags, search });
    res.json(result);
  });

  router.get("/documents/:id", async (req, res) => {
    const id = req.params.id as string;
    const doc = await svc.getById(id);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, doc.companyId);
    res.json(doc);
  });

  router.post("/companies/:companyId/documents", validate(createDocumentSchema), async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);

    const doc = await svc.create(companyId, req.body);
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "document.created",
      entityType: "document",
      entityId: doc.id,
      details: { title: doc.title },
    });

    res.status(201).json(doc);
  });

  router.patch("/documents/:id", validate(updateDocumentSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const doc = await svc.update(id, req.body);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: doc.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "document.updated",
      entityType: "document",
      entityId: doc.id,
      details: req.body,
    });

    res.json(doc);
  });

  router.delete("/documents/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);

    const doc = await svc.remove(id);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: doc.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "document.deleted",
      entityType: "document",
      entityId: doc.id,
    });

    res.json(doc);
  });

  return router;
}
