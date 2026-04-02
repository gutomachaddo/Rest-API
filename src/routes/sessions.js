const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { withValidation, withErrorHandler } = require("../utils");

const createSessionRouter = (prisma) => {
  const router = express.Router();

  router.get("/", withErrorHandler(async (req, res) => {
    const sessions = await prisma.session.findMany({ orderBy: { created_at: "desc" } });
    res.json({ sessions, total: sessions.length });
  }));

  router.get("/:id", withErrorHandler(async (req, res) => {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: "Sessão não encontrada" });
    res.json(session);
  }));

  router.post("/", withErrorHandler(async (req, res) => {
    const { name } = req.body || {};
    const session = await prisma.session.create({
      data: { id: uuidv4(), name: name || null },
    });
    res.status(201).json(session);
  }));

  router.put("/:id", withValidation(["name"], withErrorHandler(async (req, res) => {
    const { id } = req.params;
    const exists = await prisma.session.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Sessão não encontrada" });

    const session = await prisma.session.update({ where: { id }, data: { name: req.body.name } });
    res.json(session);
  })));

  router.patch("/:id", withErrorHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body || {};
    const exists = await prisma.session.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ error: "Sessão não encontrada" });

    const session = await prisma.session.update({
      where: { id },
      data: { ...(name !== undefined && { name }) },
    });
    res.json(session);
  }));

  router.delete("/:id", withErrorHandler(async (req, res) => {
    const exists = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: "Sessão não encontrada" });

    await prisma.session.delete({ where: { id: req.params.id } });
    res.status(204).send();
  }));

  return router;
};

module.exports = { createSessionRouter };