require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { RedisStore } = require('connect-redis');

const { initializeDatabase, pool } = require('./config/database');
const { initializePostgres } = require('./config/postgres');
const { initializeRedis, redisClient } = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Track service health status
const serviceHealth = {
  postgres: false,
  redis: false
};

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Basic middleware (before session)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoints (before session - no session needed)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: 'v1.2.0-cicd',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health/ready', async (req, res) => {
  const checks = {
    postgres: serviceHealth.postgres,
    redis: serviceHealth.redis
  };

  // Check PostgreSQL connectivity
  try {
    await pool.query('SELECT 1');
    checks.postgres = true;
  } catch {
    checks.postgres = false;
  }

  // Check Redis connectivity
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.ping();
      checks.redis = true;
    }
  } catch {
    checks.redis = false;
  }

  const allHealthy = checks.postgres;
  const status = allHealthy ? 200 : 503;

  res.status(status).json({
    status: allHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  });
});

app.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  await pool.end();
  process.exit(0);
});

// Initialize services and start server
async function startServer() {
  // Validate SESSION_SECRET FIRST (fail fast in production)
  const sessionSecret = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!sessionSecret || sessionSecret.length < 32) {
      console.error('FATAL: SESSION_SECRET must be set and at least 32 characters in production');
      console.error('Current length:', sessionSecret ? sessionSecret.length : 0);
      console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }
  } else if (!sessionSecret) {
    console.warn('WARNING: SESSION_SECRET not set - using insecure default for development only');
  }

  // Initialize databases
  try {
    await initializeDatabase();
    serviceHealth.postgres = true;
    console.log('PostgreSQL app tables ready');
  } catch (error) {
    console.error('PostgreSQL initialization error:', error.message);
  }

  try {
    await initializePostgres();
    console.log('PostgreSQL images table ready');
  } catch (error) {
    console.error('PostgreSQL images table error:', error.message);
  }

  // Initialize Redis BEFORE setting up session
  let redisStore = null;
  try {
    await initializeRedis();
    serviceHealth.redis = true;

    if (redisClient && redisClient.isOpen) {
      redisStore = new RedisStore({
        client: redisClient,
        prefix: 'session:'
      });
      console.log('Redis session store configured');
    }
  } catch (error) {
    console.error('Redis initialization error:', error.message);
    console.log('Session storage: Memory (Redis unavailable)');
  }

  // Session configuration - NOW with Redis store if available
  const sessionConfig = {
    store: redisStore || undefined,  // Use Redis if available, otherwise memory
    secret: sessionSecret || 'dev-only-insecure-secret-do-not-use-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.FORCE_HTTPS === 'true',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  // Trust proxy for production (behind load balancer)
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Session middleware - configured with correct store
  app.use(session(sessionConfig));

  // Flash messages
  app.use(flash());

  // Make user available to all templates
  app.use((req, res, next) => {
    res.locals.user = req.session?.userId ? {
      id: req.session.userId,
      username: req.session.username,
      isAdmin: req.session.isAdmin || false
    } : null;
    next();
  });

  // Load routes AFTER session is configured
  const authRoutes = require('./routes/auth');
  const galleryRoutes = require('./routes/gallery');
  const feedbackRoutes = require('./routes/feedback');
  const chatRoutes = require('./routes/chat');
  const imageRoutes = require('./routes/images');
  const adminRoutes = require('./routes/admin');

  // Routes
  app.use('/auth', authRoutes);
  app.use('/gallery', galleryRoutes);
  app.use('/feedback', feedbackRoutes);
  app.use('/chat', chatRoutes);
  app.use('/api/images', imageRoutes);
  app.use('/admin', adminRoutes);

  // Home route - redirect to gallery or login
  app.get('/', (req, res) => {
    if (req.session?.userId) {
      res.redirect('/gallery');
    } else {
      res.redirect('/auth/login');
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>404 - Page Not Found</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container text-center py-5">
          <h1 class="display-1">404</h1>
          <p class="lead">Page not found</p>
          <a href="/" class="btn btn-primary">Go Home</a>
        </div>
      </body>
      </html>
    `);
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
      </head>
      <body class="bg-light">
        <div class="container text-center py-5">
          <h1 class="display-1">500</h1>
          <p class="lead">Something went wrong</p>
          <a href="/" class="btn btn-primary">Go Home</a>
        </div>
      </body>
      </html>
    `);
  });

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    const sessionType = redisStore ? 'Redis' : 'Memory';
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   Wildlife Gallery Server Started!                         ║
║                                                            ║
║   Server running at: http://0.0.0.0:${PORT}                   ║
║   Database: PostgreSQL                                     ║
║   Session Store: ${sessionType.padEnd(40)}║
║                                                            ║
║   Health endpoints:                                        ║
║   - /health        (basic health check)                    ║
║   - /health/ready  (readiness with DB checks)              ║
║   - /health/live   (liveness probe)                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer();

module.exports = app;
