/**
 * User Service
 * Handles user management operations (admin functions)
 */

const { db } = require('../config/database');

/**
 * Get all users with stats
 * @returns {Promise<Array>} - List of users with feedback count
 */
async function getAllUsers() {
  return await db.all(`
    SELECT
      u.id, u.username, u.email, u.is_admin, u.created_at, u.last_active,
      COUNT(f.id) as feedback_count
    FROM users u
    LEFT JOIN feedback f ON u.id = f.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>}
 */
async function getUserById(userId) {
  return await db.get(`
    SELECT id, username, email, is_admin, created_at, last_active
    FROM users WHERE id = $1
  `, [userId]);
}

/**
 * Get user count
 * @returns {Promise<number>}
 */
async function getUserCount() {
  const result = await db.get('SELECT COUNT(*) as count FROM users');
  return parseInt(result?.count || 0);
}

/**
 * Get admin count
 * @returns {Promise<number>}
 */
async function getAdminCount() {
  const result = await db.get('SELECT COUNT(*) as count FROM users WHERE is_admin = true');
  return parseInt(result?.count || 0);
}

/**
 * Make user an admin
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - True if updated
 */
async function makeAdmin(userId) {
  const result = await db.run('UPDATE users SET is_admin = true WHERE id = $1', [userId]);
  return result.changes > 0;
}

/**
 * Revoke admin rights
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - True if updated
 */
async function revokeAdmin(userId) {
  const result = await db.run('UPDATE users SET is_admin = false WHERE id = $1', [userId]);
  return result.changes > 0;
}

/**
 * Check if user is admin
 * @param {number} userId - User ID
 * @returns {Promise<boolean>}
 */
async function isAdmin(userId) {
  const user = await db.get('SELECT is_admin FROM users WHERE id = $1', [userId]);
  return user?.is_admin === true;
}

/**
 * Update user's last active timestamp
 * @param {number} userId - User ID
 */
async function updateLastActive(userId) {
  await db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
}

/**
 * Delete user (admin only)
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} - True if deleted
 */
async function deleteUser(userId) {
  // Delete user's feedback first
  await db.run('DELETE FROM feedback WHERE user_id = $1', [userId]);
  // Delete user
  const result = await db.run('DELETE FROM users WHERE id = $1', [userId]);
  return result.changes > 0;
}

module.exports = {
  getAllUsers,
  getUserById,
  getUserCount,
  getAdminCount,
  makeAdmin,
  revokeAdmin,
  isAdmin,
  updateLastActive,
  deleteUser
};
