/**
 * Image Service
 * Handles image operations with Redis caching
 */

const { getImage, saveImage, imageExists } = require('../config/postgres');
const { getCachedImage, setCachedImage, invalidateCachedImage } = require('../config/redis');

/**
 * Get image with cache-first strategy
 * @param {number} creatureId - Creature ID
 * @returns {Promise<Object>} - { data, contentType, source }
 * @throws {Error} - If image not found
 */
async function getImageWithCache(creatureId) {
  // Try cache first
  try {
    const cached = await getCachedImage(creatureId);
    if (cached) {
      return {
        data: cached.data,
        contentType: cached.contentType,
        source: 'cache'
      };
    }
  } catch (error) {
    console.error('Cache read error:', error.message);
    // Continue to database fallback
  }

  // Fallback to database
  const image = await getImage(creatureId);

  if (!image) {
    const error = new Error('Image not found');
    error.code = 'NOT_FOUND';
    throw error;
  }

  // Cache the image for future requests
  try {
    await setCachedImage(creatureId, {
      data: image.data,
      contentType: image.contentType
    });
  } catch (error) {
    console.error('Cache write error:', error.message);
    // Non-fatal, continue
  }

  return {
    data: image.data,
    contentType: image.contentType,
    source: 'database'
  };
}

/**
 * Save image to database and invalidate cache
 * @param {number} creatureId - Creature ID
 * @param {Buffer} imageBuffer - Image data
 * @param {string} contentType - MIME type
 * @param {string} originalUrl - Original URL (optional)
 * @returns {Promise<Object>} - Saved image record
 */
async function saveImageWithCacheInvalidation(creatureId, imageBuffer, contentType, originalUrl = null) {
  // Save to database
  const result = await saveImage(creatureId, imageBuffer, contentType, originalUrl);

  // Invalidate cache
  try {
    await invalidateCachedImage(creatureId);
  } catch (error) {
    console.error('Cache invalidation error:', error.message);
    // Non-fatal
  }

  return result;
}

/**
 * Check if image exists
 * @param {number} creatureId - Creature ID
 * @returns {Promise<boolean>}
 */
async function checkImageExists(creatureId) {
  return await imageExists(creatureId);
}

/**
 * Get image URL for a creature
 * @param {number} creatureId - Creature ID
 * @returns {string} - Image URL
 */
function getImageUrl(creatureId) {
  return `/api/images/${creatureId}`;
}

module.exports = {
  getImageWithCache,
  saveImageWithCacheInvalidation,
  checkImageExists,
  getImageUrl
};
