const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");

const DB_PATH = path.resolve(__dirname, "../data/heatmap.db");

const ensureDataDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// A cada   operação no banco, pegam os dados da RAM e salvam
// no arquivo heatmap.db
const persistDb = (db) => {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
};

const loadOrCreateDb = async (SQL) => {
  ensureDataDir();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    return new SQL.Database(fileBuffer);
  }
  return new SQL.Database();
};

const initDb = async () => {
  const SQL = await initSqlJs();
  const db = await loadOrCreateDb(SQL);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id TEXT PRIMARY KEY,
      x REAL NOT NULL,
      y REAL NOT NULL,
      intensity INTEGER DEFAULT 1,
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  persistDb(db);

  return { db, persist: () => persistDb(db) };
};

module.exports = { initDb };
