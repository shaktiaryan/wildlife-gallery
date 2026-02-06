const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { feedbackService, creatureService } = require('../services');

const router = express.Router();

// POST /feedback - Add feedback for a creature
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { creatureId, comment, rating } = req.body;
    const userId = req.session.userId;

    if (!creatureId || !comment) {
      req.flash('error', 'Please provide a comment');
      return res.redirect(`/gallery/creature/${creatureId}`);
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      req.flash('error', 'Please provide a valid rating (1-5)');
      return res.redirect(`/gallery/creature/${creatureId}`);
    }

    // Check if creature exists
    const creature = await creatureService.getCreatureById(creatureId);
    if (!creature) {
      req.flash('error', 'Creature not found');
      return res.redirect('/gallery');
    }

    // Create feedback using service
    await feedbackService.createFeedback({
      userId,
      creatureId,
      comment,
      rating: ratingNum
    });

    req.flash('success', 'Thank you for your feedback!');
    res.redirect(`/gallery/creature/${creatureId}`);
  } catch (error) {
    console.error('Feedback error:', error);
    req.flash('error', error.message || 'Error submitting feedback');
    res.redirect('/gallery');
  }
});

// DELETE /feedback/:id - Delete feedback (only own feedback)
router.post('/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const userId = req.session.userId;
    const isAdmin = req.session.isAdmin || false;

    // Get creature ID for redirect (need to read before delete)
    const { db } = require('../config/database');
    const feedback = await db.get('SELECT creature_id FROM feedback WHERE id = $1', [feedbackId]);

    if (!feedback) {
      req.flash('error', 'Feedback not found');
      return res.redirect('/gallery');
    }

    await feedbackService.deleteFeedback(feedbackId, userId, isAdmin);

    req.flash('success', 'Feedback deleted');
    res.redirect(`/gallery/creature/${feedback.creature_id}`);
  } catch (error) {
    console.error('Delete feedback error:', error);
    req.flash('error', error.message || 'Error deleting feedback');
    res.redirect('/gallery');
  }
});

// API: GET /feedback/api/:creatureId - Get all feedback for a creature
router.get('/api/:creatureId', isAuthenticated, async (req, res) => {
  try {
    const creatureId = req.params.creatureId;
    const feedback = await feedbackService.getFeedbackForCreature(creatureId);
    res.json(feedback);
  } catch (error) {
    console.error('API feedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
