require('dotenv').config();
const https = require('https');
const { db } = require('../config/database');
const { initializePostgres, saveImage, closePool } = require('../config/postgres');

// Download image from URL and return buffer
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const request = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        return reject(new Error('Too many redirects'));
      }

      const urlObj = new URL(currentUrl);
      const protocol = urlObj.protocol === 'https:' ? https : require('http');

      protocol.get(currentUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return request(response.headers.location, redirectCount + 1);
        }

        if (response.statusCode !== 200) {
          return reject(new Error(`HTTP ${response.statusCode}`));
        }

        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'image/jpeg';
          resolve({ buffer, contentType });
        });
        response.on('error', reject);
      }).on('error', reject);
    };

    request(url);
  });
}

// Main migration function
async function migrateImages() {
  console.log('Starting image migration to PostgreSQL...\n');

  // Initialize PostgreSQL
  const pgReady = await initializePostgres();
  if (!pgReady) {
    console.error('Failed to connect to PostgreSQL. Check your connection settings.');
    process.exit(1);
  }

  // Get all creatures with external image URLs
  const creatures = await db.all(`
    SELECT id, name, image_url
    FROM creatures
    WHERE image_url IS NOT NULL
      AND image_url NOT LIKE '/api/images/%'
  `);

  console.log(`Found ${creatures.length} creatures with external images to migrate.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const creature of creatures) {
    process.stdout.write(`Migrating: ${creature.name} (ID: ${creature.id})... `);

    try {
      // Download the image
      const { buffer, contentType } = await downloadImage(creature.image_url);

      // Save to PostgreSQL images table
      await saveImage(creature.id, buffer, contentType, creature.image_url);

      // Update creatures table to use local API endpoint
      await db.run(
        `UPDATE creatures SET image_url = $1 WHERE id = $2`,
        [`/api/images/${creature.id}`, creature.id]
      );

      console.log(`OK (${(buffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
    } catch (error) {
      console.log(`FAILED - ${error.message}`);
      errorCount++;
    }

    // Small delay to be respectful to external servers
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
  console.log('========================================\n');

  await closePool();
  process.exit(errorCount > 0 ? 1 : 0);
}

// Run migration
migrateImages().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
