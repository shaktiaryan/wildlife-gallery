const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { imageService } = require('../services');
const { getCacheStats } = require('../config/redis');

// GET /api/images/:creatureId - Serve image with Redis caching
router.get('/:creatureId', async (req, res) => {
  const creatureId = parseInt(req.params.creatureId, 10);

  if (isNaN(creatureId) || creatureId <= 0) {
    return res.status(400).json({ error: 'Invalid creature ID' });
  }

  try {
    // Use service to get image with caching
    const result = await imageService.getImageWithCache(creatureId);

    // Generate ETag from image data
    const etag = crypto.createHash('md5').update(result.data).digest('hex');

    // Check If-None-Match header for browser caching
    if (req.headers['if-none-match'] === etag) {
      res.set('X-Cache', result.source === 'cache' ? 'HIT' : 'MISS');
      return res.status(304).end();
    }

    // Set response headers
    res.set({
      'Content-Type': result.contentType,
      'Content-Length': result.data.length,
      'Cache-Control': 'public, max-age=86400',
      'ETag': etag,
      'X-Cache': result.source === 'cache' ? 'HIT' : 'MISS'
    });

    res.send(result.data);
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.redirect(`https://placehold.co/400x300/3498db/ffffff?text=Image+Not+Found`);
    }
    console.error('Error serving image:', error.message);
    res.redirect(`https://placehold.co/400x300/e74c3c/ffffff?text=Error`);
  }
});

// GET /api/images/cache/stats - Cache statistics
router.get('/cache/stats', async (req, res) => {
  const stats = await getCacheStats();
  if (stats) {
    res.json(stats);
  } else {
    res.json({ error: 'Redis not available' });
  }
});

module.exports = router;
