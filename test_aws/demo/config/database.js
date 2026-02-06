/**
 * Database configuration - PostgreSQL
 * All app data (users, categories, creatures, feedback) stored in PostgreSQL
 */

const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'wildlife_gallery',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add is_admin column if it doesn't exist (for existing databases)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name='users' AND column_name='is_admin') THEN
          ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
        END IF;
      END $$;
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    // Creatures table
    await client.query(`
      CREATE TABLE IF NOT EXISTS creatures (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        scientific_name VARCHAR(255),
        category_id INTEGER NOT NULL REFERENCES categories(id),
        description TEXT,
        habitat TEXT,
        diet TEXT,
        lifespan VARCHAR(100),
        conservation_status VARCHAR(100),
        image_url TEXT,
        fun_facts TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        creature_id INTEGER NOT NULL REFERENCES creatures(id),
        comment TEXT NOT NULL,
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Activity logs table for tracking user actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        username VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_creatures_category ON creatures(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_feedback_creature ON feedback(creature_id)`);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

// Query helper functions
const db = {
  // Get single row
  async get(query, params = []) {
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  },

  // Get all rows
  async all(query, params = []) {
    const result = await pool.query(query, params);
    return result.rows;
  },

  // Run insert/update/delete
  async run(query, params = []) {
    const result = await pool.query(query, params);
    return {
      changes: result.rowCount,
      lastInsertRowid: result.rows[0]?.id
    };
  },

  // Get the pool for direct access if needed
  pool
};

module.exports = { db, pool, initializeDatabase };
