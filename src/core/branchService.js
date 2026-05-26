const db = require('../db/database');

function getAllBranches() {
  return db.prepare('SELECT * FROM branches WHERE is_active = 1 ORDER BY id').all();
}

function getBranchById(id) {
  return db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
}

function createBranch(name, address) {
  const info = db.prepare(
    'INSERT INTO branches (name, address) VALUES (?, ?)'
  ).run(name, address || null);
  return db.prepare('SELECT * FROM branches WHERE id = ?').get(info.lastInsertRowid);
}

function updateBranch(id, name, address) {
  db.prepare('UPDATE branches SET name = ?, address = ? WHERE id = ?').run(name, address || null, id);
  return getBranchById(id);
}

function deactivateBranch(id) {
  db.prepare('UPDATE branches SET is_active = 0 WHERE id = ?').run(id);
}

module.exports = { getAllBranches, getBranchById, createBranch, updateBranch, deactivateBranch };
