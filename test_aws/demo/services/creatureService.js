/**
 * Creature Service
 * Handles creature data operations including CRUD and search
 */

const { db } = require('../config/database');

/**
 * Get all categories
 * @returns {Promise<Array>} - List of categories
 */
async function getAllCategories() {
  return await db.all('SELECT * FROM categories ORDER BY name');
}

/**
 * Get category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>} - Category object or null
 */
async function getCategoryById(categoryId) {
  return await db.get('SELECT * FROM categories WHERE id = $1', [categoryId]);
}

/**
 * Get all creatures with optional category filter
 * @param {number|null} categoryId - Optional category ID filter
 * @returns {Promise<Array>} - List of creatures
 */
async function getAllCreatures(categoryId = null) {
  if (categoryId) {
    return await db.all(`
      SELECT c.*, cat.name as category_name
      FROM creatures c
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.category_id = $1
      ORDER BY c.name
    `, [categoryId]);
  }

  return await db.all(`
    SELECT c.*, cat.name as category_name
    FROM creatures c
    JOIN categories cat ON c.category_id = cat.id
    ORDER BY c.name
  `);
}

/**
 * Get creature by ID with category info
 * @param {number} creatureId - Creature ID
 * @returns {Promise<Object|null>} - Creature object or null
 */
async function getCreatureById(creatureId) {
  return await db.get(`
    SELECT c.*, cat.name as category_name
    FROM creatures c
    JOIN categories cat ON c.category_id = cat.id
    WHERE c.id = $1
  `, [creatureId]);
}

/**
 * Search creatures by name or description
 * @param {string} query - Search query
 * @returns {Promise<Array>} - List of matching creatures
 */
async function searchCreatures(query) {
  const searchPattern = `%${query}%`;
  return await db.all(`
    SELECT c.*, cat.name as category_name
    FROM creatures c
    JOIN categories cat ON c.category_id = cat.id
    WHERE c.name ILIKE $1 OR c.description ILIKE $1 OR c.scientific_name ILIKE $1
    ORDER BY c.name
  `, [searchPattern]);
}

/**
 * Get creature count
 * @returns {Promise<number>} - Total creature count
 */
async function getCreatureCount() {
  const result = await db.get('SELECT COUNT(*) as count FROM creatures');
  return parseInt(result?.count || 0);
}

/**
 * Get category count
 * @returns {Promise<number>} - Total category count
 */
async function getCategoryCount() {
  const result = await db.get('SELECT COUNT(*) as count FROM categories');
  return parseInt(result?.count || 0);
}

/**
 * Get creatures by category with pagination
 * @param {number} categoryId - Category ID
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - { creatures, total, pages }
 */
async function getCreaturesByCategory(categoryId, page = 1, limit = 12) {
  const offset = (page - 1) * limit;

  const creatures = await db.all(`
    SELECT c.*, cat.name as category_name
    FROM creatures c
    JOIN categories cat ON c.category_id = cat.id
    WHERE c.category_id = $1
    ORDER BY c.name
    LIMIT $2 OFFSET $3
  `, [categoryId, limit, offset]);

  const countResult = await db.get(
    'SELECT COUNT(*) as count FROM creatures WHERE category_id = $1',
    [categoryId]
  );
  const total = parseInt(countResult?.count || 0);

  return {
    creatures,
    total,
    pages: Math.ceil(total / limit)
  };
}

module.exports = {
  getAllCategories,
  getCategoryById,
  getAllCreatures,
  getCreatureById,
  searchCreatures,
  getCreatureCount,
  getCategoryCount,
  getCreaturesByCategory
};
