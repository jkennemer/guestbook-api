const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const DB_PATH = path.join(__dirname, 'guestbook.db');

app.use(cors());
app.use(express.json());

let db;

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  saveDb();
}

app.get('/messages', (req, res) => {
  const stmt = db.prepare('SELECT name, message, timestamp FROM messages ORDER BY id DESC');
  const rows = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    rows.push(row);
  }
  stmt.free();
  res.json(rows);
});

app.post('/messages', (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }

  db.run('INSERT INTO messages (name, message) VALUES (?, ?)', [name, message]);
  saveDb();

  const stmt = db.prepare('SELECT name, message, timestamp FROM messages ORDER BY id DESC LIMIT 1');
  stmt.step();
  const created = stmt.getAsObject();
  stmt.free();

  res.status(201).json(created);
});

const PORT = process.env.PORT || 3000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Guestbook API running on port ${PORT}`);
  });
});
