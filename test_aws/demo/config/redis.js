const { createClient } = require('redis');

// Redis client with limited retry to avoid flooding logs
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.log('Redis unavailable - caching disabled');
        return false; // stop retrying
      }
      return Math.min(retries * 500, 3000);
    }
  }
});

// TTL for cached images (30 minutes)
const IMAGE_CACHE_TTL = 30 * 60; // seconds

// Handle connection events
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

// Initialize Redis connection
async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log('Redis initialized - image caching enabled (TTL: 30 minutes)');
    return true;
  } catch (error) {
    console.error('Redis initialization error:', error.message);
    console.log('Image caching disabled - falling back to PostgreSQL only');
    return false;
  }
}

// Get image from cache
async function getCachedImage(creatureId) {
  try {
    if (!redisClient.isOpen) return null;

    const cacheKey = `image:${creatureId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        data: Buffer.from(parsed.data, 'base64'),
        contentType: parsed.contentType,
        fileSize: parsed.fileSize,
        updatedAt: parsed.updatedAt,
        fromCache: true
      };
    }
    return null;
  } catch (error) {
    console.error('Redis get error:', error.message);
    return null;
  }
}

// Store image in cache
async function setCachedImage(creatureId, imageData) {
  try {
    if (!redisClient.isOpen) return false;

    const cacheKey = `image:${creatureId}`;
    const cacheData = JSON.stringify({
      data: imageData.data.toString('base64'),
      contentType: imageData.contentType,
      fileSize: imageData.fileSize,
      updatedAt: imageData.updatedAt
    });

    await redisClient.setEx(cacheKey, IMAGE_CACHE_TTL, cacheData);
    return true;
  } catch (error) {
    console.error('Redis set error:', error.message);
    return false;
  }
}

// Invalidate cached image
async function invalidateCachedImage(creatureId) {
  try {
    if (!redisClient.isOpen) return false;

    const cacheKey = `image:${creatureId}`;
    await redisClient.del(cacheKey);
    return true;
  } catch (error) {
    console.error('Redis delete error:', error.message);
    return false;
  }
}

// Get cache stats
async function getCacheStats() {
  try {
    if (!redisClient.isOpen) return null;

    const keys = await redisClient.keys('image:*');
    const info = await redisClient.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);

    return {
      cachedImages: keys.length,
      memoryUsed: memoryMatch ? memoryMatch[1] : 'unknown'
    };
  } catch (error) {
    return null;
  }
}

// Close Redis connection
async function closeRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}

module.exports = {
  redisClient,
  initializeRedis,
  getCachedImage,
  setCachedImage,
  invalidateCachedImage,
  getCacheStats,
  closeRedis,
  IMAGE_CACHE_TTL
};
