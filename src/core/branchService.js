'use strict';
const { query } = require('../db/database');

// ─── خواندن شعبه‌ها ───────────────────────────────────────────────────────────
async function getAllBranches(businessId) {
  if (businessId) {
    const result = await query(
      'SELECT * FROM branches WHERE is_active = 1 AND business_id = $1 ORDER BY id',
      [businessId]
    );
    return result.rows;
  }
  const result = await query('SELECT * FROM branches WHERE is_active = 1 ORDER BY id');
  return result.rows;
}

async function getBranchById(id) {
  const result = await query('SELECT * FROM branches WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// ─── ساخت شعبه ───────────────────────────────────────────────────────────────
async function createBranch(name, address, businessId) {
  const result = await query(
    'INSERT INTO branches (name, address, business_id) VALUES ($1, $2, $3) RETURNING *',
    [name, address || null, businessId || null]
  );
  return result.rows[0];
}

// ─── ویرایش شعبه ─────────────────────────────────────────────────────────────
async function updateBranch(id, name, address) {
  await query(
    'UPDATE branches SET name = $1, address = $2 WHERE id = $3',
    [name, address || null, id]
  );
  return getBranchById(id);
}

// ─── غیرفعال کردن شعبه ───────────────────────────────────────────────────────
async function deactivateBranch(id) {
  await query('UPDATE branches SET is_active = 0 WHERE id = $1', [id]);
}

module.exports = {
  getAllBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deactivateBranch,
};
