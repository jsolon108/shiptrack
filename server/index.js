const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Create / connect to the database file
const db = new Database(path.join(__dirname, 'shiptrack.db'));

// Create tables if they don't exist yet
db.exec(`
  CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    branch TEXT,
    supplier TEXT,
    po TEXT,
    carrier TEXT,
    carrierPhone TEXT,
    carrierContact TEXT,
    tracking TEXT,
    pieces TEXT,
    eta TEXT,
    etaStart TEXT,
    etaEnd TEXT,
    status TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    name TEXT PRIMARY KEY
  );

  CREATE TABLE IF NOT EXISTS carriers (
    name TEXT PRIMARY KEY
  );
`);

// ── Shipments ──────────────────────────────────────────────────────
app.get('/api/shipments', (req, res) => {
  const rows = db.prepare('SELECT * FROM shipments').all();
  res.json(rows);
});

app.post('/api/shipments', (req, res) => {
  const s = req.body;
  db.prepare(`
    INSERT INTO shipments VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(s.id,s.branch,s.supplier,s.po,s.carrier,s.carrierPhone,s.carrierContact,s.tracking,s.pieces,s.eta,s.etaStart,s.etaEnd,s.status,s.notes);
  res.json({ ok: true });
});

app.put('/api/shipments/:id', (req, res) => {
  const s = req.body;
  db.prepare(`
    UPDATE shipments SET branch=?,supplier=?,po=?,carrier=?,carrierPhone=?,carrierContact=?,tracking=?,pieces=?,eta=?,etaStart=?,etaEnd=?,status=?,notes=? WHERE id=?
  `).run(s.branch,s.supplier,s.po,s.carrier,s.carrierPhone,s.carrierContact,s.tracking,s.pieces,s.eta,s.etaStart,s.etaEnd,s.status,s.notes,s.id);
  res.json({ ok: true });
});

// ── Suppliers ──────────────────────────────────────────────────────
app.get('/api/suppliers', (req, res) => {
  res.json(db.prepare('SELECT name FROM suppliers ORDER BY name').all().map(r => r.name));
});

app.post('/api/suppliers', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO suppliers VALUES (?)').run(req.body.name);
  res.json({ ok: true });
});

// ── Carriers ───────────────────────────────────────────────────────
app.get('/api/carriers', (req, res) => {
  res.json(db.prepare('SELECT name FROM carriers ORDER BY name').all().map(r => r.name));
});

app.post('/api/carriers', (req, res) => {
  db.prepare('INSERT OR IGNORE INTO carriers VALUES (?)').run(req.body.name);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`ShipTrack server running on http://localhost:${PORT}`));