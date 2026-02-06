const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'wildlife_gallery',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize PostgreSQL - create images table
async function initializePostgres() {
  try {
    const client = await pool.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        creature_id INTEGER NOT NULL UNIQUE,
        image_data BYTEA NOT NULL,
        content_type VARCHAR(50) DEFAULT 'image/jpeg',
        original_url TEXT,
        file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_images_creature_id ON images(creature_id)
    `);

    client.release();
    console.log('PostgreSQL initialized - images table ready');
    return true;
  } catch (error) {
    console.error('PostgreSQL initialization error:', error.message);
    return false;
  }
}

// Save image to PostgreSQL
async function saveImage(creatureId, buffer, contentType = 'image/jpeg', originalUrl = null) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO images (creature_id, image_data, content_type, original_url, file_size)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (creature_id)
       DO UPDATE SET image_data = $2, content_type = $3, original_url = $4, file_size = $5, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [creatureId, buffer, contentType, originalUrl, buffer.length]
    );
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// Get image from PostgreSQL
async function getImage(creatureId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT image_data, content_type, file_size, updated_at FROM images WHERE creature_id = $1`,
      [creatureId]
    );
    if (result.rows.length === 0) {
      return null;
    }
    return {
      data: result.rows[0].image_data,
      contentType: result.rows[0].content_type,
      fileSize: result.rows[0].file_size,
      updatedAt: result.rows[0].updated_at
    };
  } finally {
    client.release();
  }
}

// Check if image exists
async function imageExists(creatureId) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 1 FROM images WHERE creature_id = $1`,
      [creatureId]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}

// Close pool (for graceful shutdown)
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  initializePostgres,
  saveImage,
  getImage,
  imageExists,
  closePool
};
