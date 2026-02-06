const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const { creatureService, feedbackService } = require('../services');

const router = express.Router();

// GET /gallery - Main gallery page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const categories = await creatureService.getAllCategories();
    const creatures = await creatureService.getAllCreatures();

    res.render('gallery/index', {
      title: 'Animal & Bird Gallery',
      categories,
      creatures,
      user: { username: req.session.username },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Gallery error:', error);
    req.flash('error', 'Error loading gallery');
    res.redirect('/');
  }
});

// GET /gallery/category/:id - Filter by category
router.get('/category/:id', isAuthenticated, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categories = await creatureService.getAllCategories();
    const currentCategory = await creatureService.getCategoryById(categoryId);
    const creatures = await creatureService.getAllCreatures(categoryId);

    res.render('gallery/index', {
      title: currentCategory ? `${currentCategory.name} Gallery` : 'Gallery',
      categories,
      creatures,
      currentCategory,
      user: { username: req.session.username },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Category filter error:', error);
    req.flash('error', 'Error loading category');
    res.redirect('/gallery');
  }
});

// GET /gallery/creature/:id - Creature detail page
router.get('/creature/:id', isAuthenticated, async (req, res) => {
  try {
    const creatureId = req.params.id;

    const creature = await creatureService.getCreatureById(creatureId);

    if (!creature) {
      req.flash('error', 'Creature not found');
      return res.redirect('/gallery');
    }

    const feedback = await feedbackService.getFeedbackForCreature(creatureId);
    const avgRating = await feedbackService.getAverageRating(creatureId);

    res.render('gallery/detail', {
      title: creature.name,
      creature,
      feedback,
      avgRating: avgRating ? avgRating.toFixed(1) : 'No ratings',
      feedbackCount: feedback.length,
      user: { id: req.session.userId, username: req.session.username },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Creature detail error:', error);
    req.flash('error', 'Error loading creature details');
    res.redirect('/gallery');
  }
});

// API: GET /gallery/api/creature/:id - Get creature data as JSON
router.get('/api/creature/:id', isAuthenticated, async (req, res) => {
  try {
    const creatureId = req.params.id;
    const creature = await creatureService.getCreatureById(creatureId);

    if (!creature) {
      return res.status(404).json({ error: 'Creature not found' });
    }

    res.json(creature);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// API: GET /gallery/api/search - Search creatures
router.get('/api/search', isAuthenticated, async (req, res) => {
  try {
    const query = req.query.q || '';
    const creatures = await creatureService.searchCreatures(query);
    res.json(creatures);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
