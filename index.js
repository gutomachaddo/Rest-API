import express from "express";
import cors from "cors";
import { initDb } from "./src/database.js";
import { createSessionRouter } from "./src/routes/sessions.js";
import { createClickRouter } from "./src/routes/clicks.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const { prisma } = await initDb();

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/sessions", createSessionRouter(prisma));
  app.use("/sessions/:sessionId/clicks", createClickRouter(prisma));

  app.get("/", (req, res) => {
    res.json({
      name: "Heatmap API",
      version: "1.0.0",
      status: "online",
      endpoints: {
        sessions: {
          "GET    /sessions": "Lista todas as sessões",
          "GET    /sessions/:id": "Busca uma sessão",
          "POST   /sessions": "Cria uma nova sessão",
          "PUT    /sessions/:id": "Substitui uma sessão",
          "PATCH  /sessions/:id": "Atualiza parcialmente uma sessão",
          "DELETE /sessions/:id": "Remove uma sessão e seus clicks",
        },
        clicks: {
          "GET    /sessions/:id/clicks": "Lista todos os clicks da sessão",
          "GET    /sessions/:id/clicks/heatmap": "Dados agrupados por região (heatmap tree)",
          "POST   /sessions/:id/clicks": "Registra um click",
          "POST   /sessions/:id/clicks/batch": "Registra múltiplos clicks",
          "PATCH  /sessions/:id/clicks/:clickId": "Atualiza intensidade de um click",
          "DELETE /sessions/:id/clicks": "Remove todos os clicks (reset)",
          "DELETE /sessions/:id/clicks/:clickId": "Remove um click específico",
        },
      },
    });
  });

  app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada" });
  });

  app.listen(PORT, () => {
    console.log(`\nHeatmap API rodando em http://localhost:${PORT}`);
    console.log(`Endpoints disponíveis em http://localhost:${PORT}/\n`);
  });
};

startServer();