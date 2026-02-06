const express = require('express');
const os = require('os');
const { db, pool } = require('../config/database');
const { pool: pgPool } = require('../config/postgres');
const { redisClient, getCacheStats } = require('../config/redis');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { logActivity, getActivityStats, getRecentLogs, cleanOldLogs } = require('../middleware/activityLogger');

const router = express.Router();

// Sample data for seeding
const sampleCategories = [
  { name: 'Animals', description: 'Mammals and other land animals' },
  { name: 'Birds', description: 'Flying and flightless birds' }
];

const sampleCreatures = [
  { name: 'African Lion', scientific_name: 'Panthera leo', category: 'Animals', description: 'The African lion is one of the most iconic animals in the world.', habitat: 'African savannas', diet: 'Carnivore', lifespan: '10-14 years', conservation_status: 'Vulnerable', image_url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800', fun_facts: 'A lion\'s roar can be heard from 5 miles away!' },
  { name: 'African Elephant', scientific_name: 'Loxodonta africana', category: 'Animals', description: 'The largest land animal on Earth.', habitat: 'Sub-Saharan Africa', diet: 'Herbivore', lifespan: '60-70 years', conservation_status: 'Vulnerable', image_url: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800', fun_facts: 'Elephants can\'t jump!' },
  { name: 'Giant Panda', scientific_name: 'Ailuropoda melanoleuca', category: 'Animals', description: 'A beloved bear native to China.', habitat: 'Mountain forests of China', diet: 'Herbivore - bamboo', lifespan: '20 years', conservation_status: 'Vulnerable', image_url: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=800', fun_facts: 'Pandas spend 12 hours a day eating!' },
  { name: 'Bengal Tiger', scientific_name: 'Panthera tigris tigris', category: 'Animals', description: 'The most numerous tiger subspecies.', habitat: 'Indian forests', diet: 'Carnivore', lifespan: '10-15 years', conservation_status: 'Endangered', image_url: 'https://images.unsplash.com/photo-1561731216-c3a4d99437d5?w=800', fun_facts: 'No two tigers have the same stripes!' },
  { name: 'Red Fox', scientific_name: 'Vulpes vulpes', category: 'Animals', description: 'The largest of the true foxes.', habitat: 'Worldwide', diet: 'Omnivore', lifespan: '2-5 years', conservation_status: 'Least Concern', image_url: 'https://images.unsplash.com/photo-1474511320723-9a56873571b7?w=800', fun_facts: 'Foxes can hear mice underground!' },
  { name: 'Gray Wolf', scientific_name: 'Canis lupus', category: 'Animals', description: 'The largest wild dog family member.', habitat: 'Northern Hemisphere', diet: 'Carnivore', lifespan: '6-8 years', conservation_status: 'Least Concern', image_url: 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800', fun_facts: 'Wolves can run 40 mph!' },
  { name: 'Bald Eagle', scientific_name: 'Haliaeetus leucocephalus', category: 'Birds', description: 'The national bird of the United States.', habitat: 'North America', diet: 'Carnivore - fish', lifespan: '20-30 years', conservation_status: 'Least Concern', image_url: 'https://images.unsplash.com/photo-1611689342806-0863700ce1e4?w=800', fun_facts: 'Eagles can see fish from a mile away!' },
  { name: 'Peacock', scientific_name: 'Pavo cristatus', category: 'Birds', description: 'Famous for stunning tail feathers.', habitat: 'South Asia', diet: 'Omnivore', lifespan: '15-20 years', conservation_status: 'Least Concern', image_url: 'https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=800', fun_facts: 'Tail feathers reach 6 feet long!' },
  { name: 'Atlantic Puffin', scientific_name: 'Fratercula arctica', category: 'Birds', description: 'Colorful seabird of the North Atlantic.', habitat: 'North Atlantic', diet: 'Carnivore - fish', lifespan: '20-30 years', conservation_status: 'Vulnerable', image_url: 'https://images.unsplash.com/photo-1591608971362-f08b2a75731a?w=800', fun_facts: 'Puffins carry 12 fish at once!' },
  { name: 'Snowy Owl', scientific_name: 'Bubo scandiacus', category: 'Birds', description: 'Large white Arctic owl.', habitat: 'Arctic tundra', diet: 'Carnivore', lifespan: '10 years', conservation_status: 'Vulnerable', image_url: 'https://images.unsplash.com/photo-1579019163248-e7761241d85a?w=800', fun_facts: 'Snowy owls hunt during the day!' },
  { name: 'Hummingbird', scientific_name: 'Trochilidae', category: 'Birds', description: 'The smallest birds in the world.', habitat: 'Americas', diet: 'Omnivore - nectar', lifespan: '3-5 years', conservation_status: 'Varies', image_url: 'https://images.unsplash.com/photo-1520808663317-647b476a81b9?w=800', fun_facts: 'Wings beat 80 times per second!' },
  { name: 'Flamingo', scientific_name: 'Phoenicopterus', category: 'Birds', description: 'Famous for pink feathers.', habitat: 'Worldwide lagoons', diet: 'Omnivore', lifespan: '20-30 years', conservation_status: 'Least Concern', image_url: 'https://images.unsplash.com/photo-1497206365907-f5e630693df0?w=800', fun_facts: 'Born gray, turn pink over time!' }
];

// ============== DASHBOARD ==============

// GET /admin - Main dashboard with stats
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Database stats
    const dbStats = await db.get(`
      SELECT
        (SELECT COUNT(*) FROM users) as user_count,
        (SELECT COUNT(*) FROM categories) as category_count,
        (SELECT COUNT(*) FROM creatures) as creature_count,
        (SELECT COUNT(*) FROM feedback) as feedback_count,
        (SELECT COUNT(*) FROM images) as image_count,
        (SELECT COUNT(*) FROM activity_logs) as log_count
    `);

    // Activity stats for last 7 days
    const activityStats = await getActivityStats(7);

    // Recent logs
    const recentLogs = await getRecentLogs(10);

    // Log admin dashboard access
    await logActivity(req.session.userId, req.session.username, 'ADMIN_DASHBOARD_VIEW', null, req);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      stats: dbStats,
      activityStats,
      recentLogs,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.flash('error', 'Error loading dashboard');
    res.redirect('/gallery');
  }
});

// ============== HEALTH MONITORING ==============

// GET /admin/health - System health dashboard
router.get('/health', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // System info
    const systemHealth = {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      uptime: Math.floor(os.uptime() / 3600) + 'h ' + Math.floor((os.uptime() % 3600) / 60) + 'm',
      nodeVersion: process.version,
      processUptime: Math.floor(process.uptime() / 3600) + 'h ' + Math.floor((process.uptime() % 3600) / 60) + 'm',
      memoryUsage: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
        free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
        used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
        usedPercent: Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)
      },
      cpuLoad: os.loadavg(),
      cpuCores: os.cpus().length
    };

    // Process memory
    const processMemory = process.memoryUsage();
    systemHealth.processMemory = {
      heapUsed: Math.round(processMemory.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(processMemory.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(processMemory.rss / 1024 / 1024) + ' MB'
    };

    // PostgreSQL health
    let pgHealth = { status: 'error', message: 'Not connected' };
    try {
      const pgStart = Date.now();
      const pgResult = await pool.query('SELECT version(), pg_database_size(current_database()) as db_size');
      const pgLatency = Date.now() - pgStart;
      pgHealth = {
        status: 'healthy',
        latency: pgLatency + 'ms',
        version: pgResult.rows[0].version.split(' ')[1],
        dbSize: Math.round(pgResult.rows[0].db_size / 1024 / 1024 * 100) / 100 + ' MB'
      };

      // Connection pool stats
      pgHealth.poolStats = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount
      };
    } catch (err) {
      pgHealth.message = err.message;
    }

    // Redis health
    let redisHealth = { status: 'error', message: 'Not connected' };
    try {
      if (redisClient && redisClient.isOpen) {
        const redisStart = Date.now();
        await redisClient.ping();
        const redisLatency = Date.now() - redisStart;
        const cacheStats = await getCacheStats();
        redisHealth = {
          status: 'healthy',
          latency: redisLatency + 'ms',
          cachedImages: cacheStats?.cachedImages || 0,
          memoryUsed: cacheStats?.memoryUsed || 'unknown'
        };
      }
    } catch (err) {
      redisHealth.message = err.message;
    }

    await logActivity(req.session.userId, req.session.username, 'ADMIN_HEALTH_VIEW', null, req);

    res.render('admin/health', {
      title: 'System Health',
      systemHealth,
      pgHealth,
      redisHealth,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Health page error:', error);
    req.flash('error', 'Error loading health page');
    res.redirect('/admin');
  }
});

// ============== ACTIVITY LOGS ==============

// GET /admin/logs - Activity logs page
router.get('/logs', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await db.get('SELECT COUNT(*) as total FROM activity_logs');
    const totalLogs = parseInt(countResult.total);
    const totalPages = Math.ceil(totalLogs / limit);

    // Get logs for current page
    const logs = await db.all(`
      SELECT id, user_id, username, action, details, ip_address, user_agent, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    // Activity stats
    const activityStats = await getActivityStats(7);

    res.render('admin/logs', {
      title: 'Activity Logs',
      logs,
      activityStats,
      pagination: { page, totalPages, totalLogs },
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Logs page error:', error);
    req.flash('error', 'Error loading logs');
    res.redirect('/admin');
  }
});

// POST /admin/logs/clean - Clean old logs
router.post('/logs/clean', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 30;
    const deleted = await cleanOldLogs(days);
    await logActivity(req.session.userId, req.session.username, 'ADMIN_LOGS_CLEAN', `Deleted ${deleted} logs older than ${days} days`, req);
    req.flash('success', `Cleaned ${deleted} logs older than ${days} days`);
  } catch (error) {
    req.flash('error', 'Error cleaning logs');
  }
  res.redirect('/admin/logs');
});

// ============== USER MANAGEMENT ==============

// GET /admin/users - List all users
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await db.all(`
      SELECT
        u.id, u.username, u.email, u.is_admin, u.created_at,
        (SELECT COUNT(*) FROM feedback WHERE user_id = u.id) as feedback_count,
        (SELECT MAX(created_at) FROM activity_logs WHERE user_id = u.id) as last_active
      FROM users u
      ORDER BY u.created_at DESC
    `);

    await logActivity(req.session.userId, req.session.username, 'ADMIN_USERS_VIEW', null, req);

    res.render('admin/users', {
      title: 'Manage Users',
      users,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Admin users error:', error);
    req.flash('error', 'Error loading users');
    res.redirect('/admin');
  }
});

// POST /admin/users/:userId/make-admin - Promote user to admin
router.post('/users/:userId/make-admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const targetUser = await db.get('SELECT username FROM users WHERE id = $1', [userId]);

    if (!targetUser) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    await db.run('UPDATE users SET is_admin = TRUE WHERE id = $1', [userId]);
    await logActivity(req.session.userId, req.session.username, 'ADMIN_PROMOTE_USER', `Promoted ${targetUser.username} to admin`, req);
    req.flash('success', `${targetUser.username} is now an admin`);
  } catch (error) {
    console.error('Make admin error:', error);
    req.flash('error', 'Error promoting user');
  }
  res.redirect('/admin/users');
});

// POST /admin/users/:userId/revoke-admin - Revoke admin rights
router.post('/users/:userId/revoke-admin', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent self-demotion
    if (parseInt(userId) === req.session.userId) {
      req.flash('error', 'You cannot revoke your own admin rights');
      return res.redirect('/admin/users');
    }

    const targetUser = await db.get('SELECT username FROM users WHERE id = $1', [userId]);

    if (!targetUser) {
      req.flash('error', 'User not found');
      return res.redirect('/admin/users');
    }

    await db.run('UPDATE users SET is_admin = FALSE WHERE id = $1', [userId]);
    await logActivity(req.session.userId, req.session.username, 'ADMIN_REVOKE_USER', `Revoked admin from ${targetUser.username}`, req);
    req.flash('success', `Admin rights revoked from ${targetUser.username}`);
  } catch (error) {
    console.error('Revoke admin error:', error);
    req.flash('error', 'Error revoking admin rights');
  }
  res.redirect('/admin/users');
});

// ============== CREATURE MANAGEMENT ==============

// GET /admin/creatures - List all creatures
router.get('/creatures', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const creatures = await db.all(`
      SELECT c.*, cat.name as category_name
      FROM creatures c
      LEFT JOIN categories cat ON c.category_id = cat.id
      ORDER BY c.name ASC
    `);

    const categories = await db.all('SELECT * FROM categories ORDER BY name');

    res.render('admin/creatures', {
      title: 'Manage Creatures',
      creatures,
      categories,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Admin creatures error:', error);
    req.flash('error', 'Error loading creatures');
    res.redirect('/admin');
  }
});

// GET /admin/creatures/new - New creature form
router.get('/creatures/new', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const categories = await db.all('SELECT * FROM categories ORDER BY name');

    res.render('admin/creature-form', {
      title: 'Add New Creature',
      creature: null,
      categories,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('New creature form error:', error);
    req.flash('error', 'Error loading form');
    res.redirect('/admin/creatures');
  }
});

// POST /admin/creatures - Create new creature
router.post('/creatures', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts } = req.body;

    if (!name || !category_id) {
      req.flash('error', 'Name and category are required');
      return res.redirect('/admin/creatures/new');
    }

    await db.run(
      `INSERT INTO creatures (name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [name, scientific_name || '', category_id, description || '', habitat || '', diet || '', lifespan || '', conservation_status || '', image_url || '', fun_facts || '']
    );

    await logActivity(req.session.userId, req.session.username, 'ADMIN_CREATURE_CREATE', `Created creature: ${name}`, req);
    req.flash('success', `Creature "${name}" created successfully!`);
    res.redirect('/admin/creatures');
  } catch (error) {
    console.error('Create creature error:', error);
    req.flash('error', 'Error creating creature: ' + error.message);
    res.redirect('/admin/creatures/new');
  }
});

// GET /admin/creatures/:id/edit - Edit creature form
router.get('/creatures/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const creature = await db.get('SELECT * FROM creatures WHERE id = $1', [req.params.id]);

    if (!creature) {
      req.flash('error', 'Creature not found');
      return res.redirect('/admin/creatures');
    }

    const categories = await db.all('SELECT * FROM categories ORDER BY name');

    res.render('admin/creature-form', {
      title: 'Edit Creature',
      creature,
      categories,
      user: { id: req.session.userId, username: req.session.username, isAdmin: req.session.isAdmin },
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Edit creature form error:', error);
    req.flash('error', 'Error loading creature');
    res.redirect('/admin/creatures');
  }
});

// POST /admin/creatures/:id - Update creature
router.post('/creatures/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts } = req.body;
    const { id } = req.params;

    if (!name || !category_id) {
      req.flash('error', 'Name and category are required');
      return res.redirect(`/admin/creatures/${id}/edit`);
    }

    await db.run(
      `UPDATE creatures SET name = $1, scientific_name = $2, category_id = $3, description = $4, habitat = $5, diet = $6, lifespan = $7, conservation_status = $8, image_url = $9, fun_facts = $10 WHERE id = $11`,
      [name, scientific_name || '', category_id, description || '', habitat || '', diet || '', lifespan || '', conservation_status || '', image_url || '', fun_facts || '', id]
    );

    await logActivity(req.session.userId, req.session.username, 'ADMIN_CREATURE_UPDATE', `Updated creature: ${name}`, req);
    req.flash('success', `Creature "${name}" updated successfully!`);
    res.redirect('/admin/creatures');
  } catch (error) {
    console.error('Update creature error:', error);
    req.flash('error', 'Error updating creature: ' + error.message);
    res.redirect(`/admin/creatures/${req.params.id}/edit`);
  }
});

// POST /admin/creatures/:id/delete - Delete creature
router.post('/creatures/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const creature = await db.get('SELECT name FROM creatures WHERE id = $1', [req.params.id]);

    if (!creature) {
      req.flash('error', 'Creature not found');
      return res.redirect('/admin/creatures');
    }

    // Delete associated feedback first
    await db.run('DELETE FROM feedback WHERE creature_id = $1', [req.params.id]);
    // Delete the creature
    await db.run('DELETE FROM creatures WHERE id = $1', [req.params.id]);

    await logActivity(req.session.userId, req.session.username, 'ADMIN_CREATURE_DELETE', `Deleted creature: ${creature.name}`, req);
    req.flash('success', `Creature "${creature.name}" deleted successfully!`);
    res.redirect('/admin/creatures');
  } catch (error) {
    console.error('Delete creature error:', error);
    req.flash('error', 'Error deleting creature: ' + error.message);
    res.redirect('/admin/creatures');
  }
});

// ============== CATEGORY MANAGEMENT ==============

// POST /admin/categories - Create new category
router.post('/categories', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      req.flash('error', 'Category name is required');
      return res.redirect('/admin/creatures');
    }

    await db.run('INSERT INTO categories (name, description) VALUES ($1, $2)', [name, description || '']);
    await logActivity(req.session.userId, req.session.username, 'ADMIN_CATEGORY_CREATE', `Created category: ${name}`, req);
    req.flash('success', `Category "${name}" created successfully!`);
    res.redirect('/admin/creatures');
  } catch (error) {
    console.error('Create category error:', error);
    req.flash('error', 'Error creating category: ' + error.message);
    res.redirect('/admin/creatures');
  }
});

// ============== SEED DATA ==============

// POST /admin/seed/reset - Reset and seed fresh data
router.post('/seed/reset', isAuthenticated, isAdmin, async (req, res) => {
  try {
    await db.run('DELETE FROM feedback');
    await db.run('DELETE FROM creatures');
    await db.run('DELETE FROM categories');

    const categoryIds = {};
    for (const cat of sampleCategories) {
      const result = await db.pool.query('INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id', [cat.name, cat.description]);
      categoryIds[cat.name] = result.rows[0].id;
    }

    for (const creature of sampleCreatures) {
      await db.pool.query(
        `INSERT INTO creatures (name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [creature.name, creature.scientific_name, categoryIds[creature.category], creature.description, creature.habitat, creature.diet, creature.lifespan, creature.conservation_status, creature.image_url, creature.fun_facts]
      );
    }

    await logActivity(req.session.userId, req.session.username, 'ADMIN_SEED_RESET', `Reset database with ${sampleCreatures.length} creatures`, req);
    req.flash('success', `Database reset! Added ${sampleCategories.length} categories and ${sampleCreatures.length} creatures.`);
  } catch (error) {
    console.error('Seed reset error:', error);
    req.flash('error', 'Error resetting database: ' + error.message);
  }
  res.redirect('/admin');
});

// POST /admin/seed/add - Add missing sample data
router.post('/seed/add', isAuthenticated, isAdmin, async (req, res) => {
  try {
    let addedCategories = 0, addedCreatures = 0;

    for (const cat of sampleCategories) {
      const existing = await db.get('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (!existing) {
        await db.pool.query('INSERT INTO categories (name, description) VALUES ($1, $2)', [cat.name, cat.description]);
        addedCategories++;
      }
    }

    const categoryIds = {};
    for (const cat of sampleCategories) {
      const result = await db.get('SELECT id FROM categories WHERE name = $1', [cat.name]);
      if (result) categoryIds[cat.name] = result.id;
    }

    for (const creature of sampleCreatures) {
      const existing = await db.get('SELECT id FROM creatures WHERE name = $1', [creature.name]);
      if (!existing && categoryIds[creature.category]) {
        await db.pool.query(
          `INSERT INTO creatures (name, scientific_name, category_id, description, habitat, diet, lifespan, conservation_status, image_url, fun_facts) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [creature.name, creature.scientific_name, categoryIds[creature.category], creature.description, creature.habitat, creature.diet, creature.lifespan, creature.conservation_status, creature.image_url, creature.fun_facts]
        );
        addedCreatures++;
      }
    }

    await logActivity(req.session.userId, req.session.username, 'ADMIN_SEED_ADD', `Added ${addedCategories} categories, ${addedCreatures} creatures`, req);

    if (addedCategories === 0 && addedCreatures === 0) {
      req.flash('success', 'All sample data already exists!');
    } else {
      req.flash('success', `Added ${addedCategories} categories and ${addedCreatures} creatures.`);
    }
  } catch (error) {
    console.error('Seed add error:', error);
    req.flash('error', 'Error adding sample data: ' + error.message);
  }
  res.redirect('/admin');
});

module.exports = router;
