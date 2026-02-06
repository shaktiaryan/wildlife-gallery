const express = require('express');
const { isNotAuthenticated } = require('../middleware/auth');
const { authService } = require('../services');

const router = express.Router();

// GET /auth/login
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/login
router.post('/login', isNotAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await authService.authenticate(email, password);

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAdmin = user.is_admin || false;

    req.flash('success', 'Welcome back!');
    res.redirect('/gallery');
  } catch (error) {
    if (error.name === 'AuthError') {
      req.flash('error', error.message);
    } else {
      console.error('Login error:', error);
      req.flash('error', 'An error occurred during login');
    }
    res.redirect('/auth/login');
  }
});

// GET /auth/register
router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST /auth/register
router.post('/register', isNotAuthenticated, async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validate password confirmation
    if (password !== confirmPassword) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/auth/register');
    }

    await authService.register({ username, email, password });

    req.flash('success', 'Registration successful! Please login.');
    res.redirect('/auth/login');
  } catch (error) {
    if (error.name === 'AuthError') {
      req.flash('error', error.message);
    } else {
      console.error('Registration error:', error);
      req.flash('error', 'An error occurred during registration');
    }
    res.redirect('/auth/register');
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login');
  });
});

module.exports = router;
