/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script migrates all data from SQLite to PostgreSQL:
 * - users
 * - categories
 * - creatures
 * - feedback
 *
 * Run with: node scripts/migrate-sqlite-to-postgres.js
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

// SQLite connection
const sqliteDbPath = path.join(__dirname, '..', 'database.db');
let sqlite;

// PostgreSQL connection
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'wildlife_gallery',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
});

async function createTables(client) {
  console.log('Creating PostgreSQL tables...');

  // Users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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

  // Create indexes
  await client.query(`CREATE INDEX IF NOT EXISTS idx_creatures_category ON creatures(category_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_feedback_creature ON feedback(creature_id)`);

  console.log('Tables created successfully');
}

async function migrateCategories(client) {
  console.log('Migrating categories...');

  const categories = sqlite.prepare('SELECT * FROM categories').all();

  for (const cat of categories) {
    await client.query(
      `INSERT INTO categories (id, name, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = $2, description = $3`,
      [cat.id, cat.name, cat.description]
    );
  }

  // Reset sequence to max id + 1
  if (categories.length > 0) {
    const maxId = Math.max(...categories.map(c => c.id));
    await client.query(`SELECT setval('categories_id_seq', $1)`, [maxId]);
  }

  console.log(`Migrated ${categories.length} categories`);
}

async function migrateUsers(client) {
  console.log('Migrating users...');

  const users = sqlite.prepare('SELECT * FROM users').all();

  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, username, email, password, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET username = $2, email = $3, password = $4`,
      [user.id, user.username, user.email, user.password, user.created_at]
    );
  }

  // Reset sequence
  if (users.length > 0) {
    const maxId = Math.max(...users.map(u => u.id));
    await client.query(`SELECT setval('users_id_seq', $1)`, [maxId]);
  }

  console.log(`Migrated ${users.length} users`);
}

async function migrateCreatures(client) {
  console.log('Migrating creatures...');

  const creatures = sqlite.prepare('SELECT * FROM creatures').all();

  for (const creature of creatures) {
    await client.query(
      `INSERT INTO creatures (id, name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = $2, scientific_name = $3, category_id = $4, description = $5,
         habitat = $6, diet = $7, lifespan = $8, conservation_status = $9,
         image_url = $10, fun_facts = $11`,
      [
        creature.id, creature.name, creature.scientific_name, creature.category_id,
        creature.description, creature.habitat, creature.diet, creature.lifespan,
        creature.conservation_status, creature.image_url, creature.fun_facts, creature.created_at
      ]
    );
  }

  // Reset sequence
  if (creatures.length > 0) {
    const maxId = Math.max(...creatures.map(c => c.id));
    await client.query(`SELECT setval('creatures_id_seq', $1)`, [maxId]);
  }

  console.log(`Migrated ${creatures.length} creatures`);
}

async function migrateFeedback(client) {
  console.log('Migrating feedback...');

  const feedback = sqlite.prepare('SELECT * FROM feedback').all();

  for (const fb of feedback) {
    try {
      await client.query(
        `INSERT INTO feedback (id, user_id, creature_id, comment, rating, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           user_id = $2, creature_id = $3, comment = $4, rating = $5`,
        [fb.id, fb.user_id, fb.creature_id, fb.comment, fb.rating, fb.created_at]
      );
    } catch (error) {
      console.warn(`Skipping feedback ${fb.id}: ${error.message}`);
    }
  }

  // Reset sequence
  if (feedback.length > 0) {
    const maxId = Math.max(...feedback.map(f => f.id));
    await client.query(`SELECT setval('feedback_id_seq', $1)`, [maxId]);
  }

  console.log(`Migrated ${feedback.length} feedback entries`);
}

async function migrate() {
  console.log('Starting SQLite to PostgreSQL migration...\n');

  // Check if SQLite database exists
  try {
    sqlite = new Database(sqliteDbPath, { readonly: true });
  } catch (error) {
    console.error(`SQLite database not found at ${sqliteDbPath}`);
    console.error('Make sure database.db exists before running migration.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');

    // Create tables
    await createTables(client);

    // Migrate data in order (respecting foreign keys)
    await migrateCategories(client);
    await migrateUsers(client);
    await migrateCreatures(client);
    await migrateFeedback(client);

    // Commit transaction
    await client.query('COMMIT');

    console.log('\nMigration completed successfully!');
    console.log('\nVerifying data...');

    // Verify counts
    const counts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM creatures) as creatures,
        (SELECT COUNT(*) FROM feedback) as feedback,
        (SELECT COUNT(*) FROM images) as images
    `);

    console.log('\nPostgreSQL table counts:');
    console.log(`  Categories: ${counts.rows[0].categories}`);
    console.log(`  Users: ${counts.rows[0].users}`);
    console.log(`  Creatures: ${counts.rows[0].creatures}`);
    console.log(`  Feedback: ${counts.rows[0].feedback}`);
    console.log(`  Images: ${counts.rows[0].images}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

// Run migration
migrate().catch(error => {
  console.error('Migration error:', error);
  process.exit(1);
});
