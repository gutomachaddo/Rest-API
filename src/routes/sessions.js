const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { withValidation, withErrorHandler } = require("../utils");

const createSessionRouter = (db, persist) => {
  const router = express.Router();

  // GET /sessions - Lista todas as sessões
  router.get(
    "/",
    withErrorHandler(async (req, res) => {
      const result = db.exec(
        "SELECT id, name, created_at, updated_at FROM sessions ORDER BY created_at DESC"
      );

      const sessions =
        result.length > 0
          ? result[0].values.map(([id, name, created_at, updated_at]) => ({
              id,
              name,
              created_at,
              updated_at,
            }))
          : [];

      res.json({ sessions, total: sessions.length });
    })
  );

  // GET /sessions/:id - Busca uma sessão específica
  router.get(
    "/:id",
    withErrorHandler(async (req, res) => {
      const { id } = req.params;

      const result = db.exec(
        "SELECT id, name, created_at, updated_at FROM sessions WHERE id = ?",
        [id]
      );

      if (!result.length || !result[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const [sid, name, created_at, updated_at] = result[0].values[0];
      res.json({ id: sid, name, created_at, updated_at });
    })
  );

  // POST /sessions - Cria uma nova sessão
  router.post(
    "/",
    withErrorHandler(async (req, res) => {
      const { name } = req.body || {};
      const id = uuidv4();
      const now = new Date().toISOString();

      db.run(
        "INSERT INTO sessions (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
        [id, name || null, now, now]
      );
      persist();

      res.status(201).json({ id, name: name || null, created_at: now, updated_at: now });
    })
  );

  // PUT /sessions/:id - Atualiza completamente uma sessão
  router.put(
    "/:id",
    withValidation(["name"],
      withErrorHandler(async (req, res) => {
        const { id } = req.params;
        const { name } = req.body;
        const now = new Date().toISOString();

        const exists = db.exec("SELECT id FROM sessions WHERE id = ?", [id]);
        if (!exists.length || !exists[0].values.length) {
          return res.status(404).json({ error: "Sessão não encontrada" });
        }

        db.run("UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?", [name, now, id]);
        persist();

        res.json({ id, name, updated_at: now });
      })
    )
  );

  // PATCH /sessions/:id - Atualiza parcialmente uma sessão
  router.patch(
    "/:id",
    withErrorHandler(async (req, res) => {
      const { id } = req.params;
      const { name } = req.body || {};
      const now = new Date().toISOString();

      const exists = db.exec("SELECT id, name FROM sessions WHERE id = ?", [id]);
      if (!exists.length || !exists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const currentName = exists[0].values[0][1];
      const updatedName = name !== undefined ? name : currentName;

      db.run("UPDATE sessions SET name = ?, updated_at = ? WHERE id = ?", [updatedName, now, id]);
      persist();

      res.json({ id, name: updatedName, updated_at: now });
    })
  );

  // DELETE /sessions/:id - Deleta uma sessão (e seus clicks por CASCADE)
  router.delete(
    "/:id",
    withErrorHandler(async (req, res) => {
      const { id } = req.params;

      const exists = db.exec("SELECT id FROM sessions WHERE id = ?", [id]);
      if (!exists.length || !exists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      db.run("DELETE FROM sessions WHERE id = ?", [id]);
      persist();

      res.status(204).send();
    })
  );

  return router;
};

module.exports = { createSessionRouter };