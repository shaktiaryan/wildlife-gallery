/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

const bcrypt = require('bcryptjs');
const { db } = require('../config/database');

class AuthError extends Error {
  constructor(message, code = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} - User object (without password)
 * @throws {AuthError} - If authentication fails
 */
async function authenticate(email, password) {
  if (!email || !password) {
    throw new AuthError('Email and password are required', 'MISSING_CREDENTIALS');
  }

  const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);

  if (!user) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.username - Username
 * @param {string} userData.email - Email
 * @param {string} userData.password - Plain text password
 * @returns {Promise<Object>} - Created user object
 * @throws {AuthError} - If registration fails
 */
async function register({ username, email, password }) {
  // Validate input
  if (!username || !email || !password) {
    throw new AuthError('All fields are required', 'MISSING_FIELDS');
  }

  if (password.length < 6) {
    throw new AuthError('Password must be at least 6 characters', 'WEAK_PASSWORD');
  }

  // Check if user exists
  const existingUser = await db.get(
    'SELECT * FROM users WHERE email = $1 OR username = $2',
    [email, username]
  );

  if (existingUser) {
    throw new AuthError('User with this email or username already exists', 'USER_EXISTS');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const result = await db.run(
    'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
    [username, email, hashedPassword]
  );

  return {
    id: result.lastInsertRowid,
    username,
    email,
    is_admin: false
  };
}

/**
 * Get user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} - User object or null
 */
async function getUserById(userId) {
  const user = await db.get('SELECT id, username, email, is_admin, created_at FROM users WHERE id = $1', [userId]);
  return user;
}

/**
 * Update user's last active timestamp
 * @param {number} userId - User ID
 */
async function updateLastActive(userId) {
  await db.run('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
}

module.exports = {
  authenticate,
  register,
  getUserById,
  updateLastActive,
  AuthError
};
