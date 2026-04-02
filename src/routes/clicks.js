const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  withValidation,
  withErrorHandler,
  flattenClicks,
  groupClicksByRegion,
  sumIntensity,
} = require("../utils");

const createClickRouter = (db, persist) => {
  const router = express.Router({ mergeParams: true });

  // GET /sessions/:sessionId/clicks - Lista todos os clicks de uma sessão
  router.get(
    "/",
    withErrorHandler(async (req, res) => {
      const { sessionId } = req.params;

      const sessionExists = db.exec("SELECT id FROM sessions WHERE id = ?", [sessionId]);
      if (!sessionExists.length || !sessionExists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const result = db.exec(
        "SELECT id, x, y, intensity, session_id, created_at FROM clicks WHERE session_id = ? ORDER BY created_at ASC",
        [sessionId]
      );

      const clicks =
        result.length > 0
          ? result[0].values.map(([id, x, y, intensity, session_id, created_at]) => ({
              id,
              x,
              y,
              intensity,
              session_id,
              created_at,
            }))
          : [];

      // Usa a função recursiva sumIntensity para calcular o total de intensidade
      const totalIntensity = sumIntensity(clicks);

      res.json({ clicks, total: clicks.length, totalIntensity });
    })
  );

  // GET /sessions/:sessionId/clicks/heatmap - Retorna dados agrupados por região (recursivo)
  router.get(
    "/heatmap",
    withErrorHandler(async (req, res) => {
      const { sessionId } = req.params;
      const { width = 390, height = 844 } = req.query;

      const sessionExists = db.exec("SELECT id, name FROM sessions WHERE id = ?", [sessionId]);
      if (!sessionExists.length || !sessionExists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      const result = db.exec(
        "SELECT id, x, y, intensity FROM clicks WHERE session_id = ?",
        [sessionId]
      );

      const clicks =
        result.length > 0
          ? result[0].values.map(([id, x, y, intensity]) => ({ id, x, y, intensity }))
          : [];

      // Usa função recursiva groupClicksByRegion para gerar a árvore de calor
      const bounds = { minX: 0, maxX: Number(width), minY: 0, maxY: Number(height) };
      const heatTree = groupClicksByRegion(clicks, bounds);

      // Usa a função recursiva flattenClicks para garantir lista plana
      const flatClicks = flattenClicks(clicks);
      const totalIntensity = sumIntensity(flatClicks);

      res.json({
        sessionId,
        totalClicks: clicks.length,
        totalIntensity,
        screenBounds: bounds,
        heatTree,
      });
    })
  );

  // POST /sessions/:sessionId/clicks - Registra um click
  router.post(
    "/",
    withValidation(
      ["x", "y"],
      withErrorHandler(async (req, res) => {
        const { sessionId } = req.params;
        const { x, y, intensity = 1 } = req.body;

        const sessionExists = db.exec("SELECT id FROM sessions WHERE id = ?", [sessionId]);
        if (!sessionExists.length || !sessionExists[0].values.length) {
          return res.status(404).json({ error: "Sessão não encontrada" });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        db.run(
          "INSERT INTO clicks (id, x, y, intensity, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [id, x, y, intensity, sessionId, now]
        );
        persist();

        res.status(201).json({ id, x, y, intensity, session_id: sessionId, created_at: now });
      })
    )
  );

  // POST /sessions/:sessionId/clicks/batch - Registra múltiplos clicks de uma vez
  router.post(
    "/batch",
    withErrorHandler(async (req, res) => {
      const { sessionId } = req.params;
      const { clicks: rawClicks } = req.body || {};

      if (!Array.isArray(rawClicks) || rawClicks.length === 0) {
        return res.status(400).json({ error: "Envie um array 'clicks' com ao menos 1 item" });
      }

      const sessionExists = db.exec("SELECT id FROM sessions WHERE id = ?", [sessionId]);
      if (!sessionExists.length || !sessionExists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      // flattenClicks garante que listas aninhadas também funcionem
      const flatClicks = flattenClicks(rawClicks);
      const now = new Date().toISOString();

      const created = flatClicks.map((click) => {
        const id = uuidv4();
        db.run(
          "INSERT INTO clicks (id, x, y, intensity, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [id, click.x, click.y, click.intensity || 1, sessionId, now]
        );
        return { id, x: click.x, y: click.y, intensity: click.intensity || 1, session_id: sessionId, created_at: now };
      });

      persist();

      res.status(201).json({ created, total: created.length });
    })
  );

  // PATCH /sessions/:sessionId/clicks/:id - Atualiza intensidade de um click
  router.patch(
    "/:id",
    withErrorHandler(async (req, res) => {
      const { sessionId, id } = req.params;
      const { intensity } = req.body || {};

      if (intensity === undefined) {
        return res.status(400).json({ error: "Campo 'intensity' é obrigatório" });
      }

      const exists = db.exec(
        "SELECT id FROM clicks WHERE id = ? AND session_id = ?",
        [id, sessionId]
      );
      if (!exists.length || !exists[0].values.length) {
        return res.status(404).json({ error: "Click não encontrado" });
      }

      db.run("UPDATE clicks SET intensity = ? WHERE id = ?", [intensity, id]);
      persist();

      res.json({ id, intensity, updated: true });
    })
  );

  // DELETE /sessions/:sessionId/clicks - Reseta todos os clicks da sessão
  router.delete(
    "/",
    withErrorHandler(async (req, res) => {
      const { sessionId } = req.params;

      const sessionExists = db.exec("SELECT id FROM sessions WHERE id = ?", [sessionId]);
      if (!sessionExists.length || !sessionExists[0].values.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      db.run("DELETE FROM clicks WHERE session_id = ?", [sessionId]);
      persist();

      // Atualiza o updated_at da sessão
      db.run("UPDATE sessions SET updated_at = ? WHERE id = ?", [new Date().toISOString(), sessionId]);
      persist();

      res.json({ message: "Todos os clicks foram removidos", sessionId });
    })
  );

  // DELETE /sessions/:sessionId/clicks/:id - Remove um click específico
  router.delete(
    "/:id",
    withErrorHandler(async (req, res) => {
      const { sessionId, id } = req.params;

      const exists = db.exec(
        "SELECT id FROM clicks WHERE id = ? AND session_id = ?",
        [id, sessionId]
      );
      if (!exists.length || !exists[0].values.length) {
        return res.status(404).json({ error: "Click não encontrado" });
      }

      db.run("DELETE FROM clicks WHERE id = ?", [id]);
      persist();

      res.status(204).send();
    })
  );

  return router;
};

module.exports = { createClickRouter };