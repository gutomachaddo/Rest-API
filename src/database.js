const { PrismaClient } = require("@prisma/client");
const { PrismaLibSql } = require("@prisma/adapter-libsql");
const path = require("path");
const fs = require("fs");

const initDb = async () => {
  const dataDir = path.resolve("data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const adapter = new PrismaLibSql({
    url: `file:${path.resolve("data/heatmap.db")}`,
  });

  const prisma = new PrismaClient({ adapter });

  return { prisma };
};

module.exports = { initDb };