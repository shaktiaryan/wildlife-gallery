/**
 * Feedback Service
 * Handles creature feedback operations (comments and ratings)
 */

const { db } = require('../config/database');

/**
 * Get feedback for a creature
 * @param {number} creatureId - Creature ID
 * @returns {Promise<Array>} - List of feedback with user info
 */
async function getFeedbackForCreature(creatureId) {
  return await db.all(`
    SELECT f.*, u.username
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    WHERE f.creature_id = $1
    ORDER BY f.created_at DESC
  `, [creatureId]);
}

/**
 * Get average rating for a creature
 * @param {number} creatureId - Creature ID
 * @returns {Promise<number|null>} - Average rating or null
 */
async function getAverageRating(creatureId) {
  const result = await db.get(`
    SELECT AVG(rating)::numeric(3,2) as avg_rating, COUNT(*) as count
    FROM feedback
    WHERE creature_id = $1 AND rating IS NOT NULL
  `, [creatureId]);

  return result?.avg_rating ? parseFloat(result.avg_rating) : null;
}

/**
 * Create feedback for a creature
 * @param {Object} feedbackData - Feedback data
 * @param {number} feedbackData.userId - User ID
 * @param {number} feedbackData.creatureId - Creature ID
 * @param {string} feedbackData.comment - Comment text
 * @param {number} feedbackData.rating - Rating (1-5)
 * @returns {Promise<Object>} - Created feedback
 */
async function createFeedback({ userId, creatureId, comment, rating }) {
  if (!comment || comment.trim().length === 0) {
    throw new Error('Comment is required');
  }

  if (rating && (rating < 1 || rating > 5)) {
    throw new Error('Rating must be between 1 and 5');
  }

  const result = await db.run(`
    INSERT INTO feedback (user_id, creature_id, comment, rating)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [userId, creatureId, comment.trim(), rating || null]);

  return {
    id: result.lastInsertRowid,
    userId,
    creatureId,
    comment: comment.trim(),
    rating
  };
}

/**
 * Delete feedback
 * @param {number} feedbackId - Feedback ID
 * @param {number} userId - User ID (for ownership check)
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {Promise<boolean>} - True if deleted
 */
async function deleteFeedback(feedbackId, userId, isAdmin = false) {
  // Check ownership (unless admin)
  if (!isAdmin) {
    const feedback = await db.get('SELECT user_id FROM feedback WHERE id = $1', [feedbackId]);
    if (!feedback || feedback.user_id !== userId) {
      throw new Error('Not authorized to delete this feedback');
    }
  }

  const result = await db.run('DELETE FROM feedback WHERE id = $1', [feedbackId]);
  return result.changes > 0;
}

/**
 * Get total feedback count
 * @returns {Promise<number>}
 */
async function getFeedbackCount() {
  const result = await db.get('SELECT COUNT(*) as count FROM feedback');
  return parseInt(result?.count || 0);
}

/**
 * Get feedback count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>}
 */
async function getUserFeedbackCount(userId) {
  const result = await db.get('SELECT COUNT(*) as count FROM feedback WHERE user_id = $1', [userId]);
  return parseInt(result?.count || 0);
}

/**
 * Get recent feedback across all creatures
 * @param {number} limit - Max items to return
 * @returns {Promise<Array>}
 */
async function getRecentFeedback(limit = 10) {
  return await db.all(`
    SELECT f.*, u.username, c.name as creature_name
    FROM feedback f
    JOIN users u ON f.user_id = u.id
    JOIN creatures c ON f.creature_id = c.id
    ORDER BY f.created_at DESC
    LIMIT $1
  `, [limit]);
}

module.exports = {
  getFeedbackForCreature,
  getAverageRating,
  createFeedback,
  deleteFeedback,
  getFeedbackCount,
  getUserFeedbackCount,
  getRecentFeedback
};
