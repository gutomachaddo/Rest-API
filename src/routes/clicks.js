import { v4 as uuidv4 } from "uuid";
import { withValidation, withErrorHandler, flattenClicks, groupClicksByRegion, sumIntensity } from "../utils.js";
import express from 'express';

export const createClickRouter = (prisma) => {
  const router = express.Router({ mergeParams: true });

  router.get("/", withErrorHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

    const clicks = await prisma.click.findMany({ where: { session_id: sessionId }, orderBy: { created_at: "asc" } });
    res.json({ clicks, total: clicks.length, totalIntensity: sumIntensity(clicks) });
  }));

  router.get("/heatmap", withErrorHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { width = 390, height = 844 } = req.query;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

    const clicks = await prisma.click.findMany({ where: { session_id: sessionId } });
    const bounds = { minX: 0, maxX: Number(width), minY: 0, maxY: Number(height) };

    res.json({
      sessionId,
      totalClicks: clicks.length,
      totalIntensity: sumIntensity(flattenClicks(clicks)),
      screenBounds: bounds,
      heatTree: groupClicksByRegion(clicks, bounds),
    });
  }));

  router.post("/", withValidation(["x", "y"], withErrorHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { x, y, intensity = 1 } = req.body;

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

    const click = await prisma.click.create({ data: { id: uuidv4(), x, y, intensity, session_id: sessionId } });
    res.status(201).json(click);
  })));

  router.post("/batch", withErrorHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { clicks: rawClicks } = req.body || {};

    if (!Array.isArray(rawClicks) || rawClicks.length === 0) {
      return res.status(400).json({ error: "Envie um array 'clicks' com ao menos 1 item" });
    }

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

    const data = flattenClicks(rawClicks).map((c) => ({
      id: uuidv4(), x: c.x, y: c.y, intensity: c.intensity || 1, session_id: sessionId,
    }));

    await prisma.click.createMany({ data });
    res.status(201).json({ created: data, total: data.length });
  }));

  router.patch("/:id", withErrorHandler(async (req, res) => {
    const { sessionId, id } = req.params;
    const { intensity } = req.body || {};

    if (intensity === undefined) return res.status(400).json({ error: "Campo 'intensity' é obrigatório" });

    const exists = await prisma.click.findFirst({ where: { id, session_id: sessionId } });
    if (!exists) return res.status(404).json({ error: "Click não encontrado" });

    const click = await prisma.click.update({ where: { id }, data: { intensity } });
    res.json({ id: click.id, intensity: click.intensity, updated: true });
  }));

  router.delete("/", withErrorHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });

    await prisma.click.deleteMany({ where: { session_id: sessionId } });
    await prisma.session.update({ where: { id: sessionId }, data: { updated_at: new Date() } });
    res.json({ message: "Todos os clicks foram removidos", sessionId });
  }));

  router.delete("/:id", withErrorHandler(async (req, res) => {
    const { sessionId, id } = req.params;
    const exists = await prisma.click.findFirst({ where: { id, session_id: sessionId } });
    if (!exists) return res.status(404).json({ error: "Click não encontrado" });

    await prisma.click.delete({ where: { id } });
    res.status(204).send();
  }));

  return router;
};