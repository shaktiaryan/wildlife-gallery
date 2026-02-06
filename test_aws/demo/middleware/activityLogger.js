const { db } = require('../config/database');

/**
 * Log user activity to database
 */
async function logActivity(userId, username, action, details = null, req = null) {
  try {
    const ipAddress = req ? (req.ip || req.connection?.remoteAddress || 'unknown') : 'system';
    const userAgent = req ? (req.get('User-Agent') || 'unknown') : 'system';

    await db.pool.query(
      `INSERT INTO activity_logs (user_id, username, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, username, action, details, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Activity log error:', error.message);
  }
}

/**
 * Middleware to automatically log page views
 */
function activityLoggerMiddleware(req, res, next) {
  // Skip logging for static files, health checks, and API calls
  const skipPaths = ['/health', '/api/', '/favicon', '.css', '.js', '.png', '.jpg', '.ico'];
  const shouldSkip = skipPaths.some(path => req.path.includes(path));

  if (!shouldSkip && req.session?.userId) {
    const action = `${req.method} ${req.path}`;
    logActivity(req.session.userId, req.session.username, action, null, req);
  }

  next();
}

/**
 * Get activity statistics
 */
async function getActivityStats(days = 7) {
  try {
    // Activity by day
    const dailyActivity = await db.all(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Top actions
    const topActions = await db.all(`
      SELECT
        action,
        COUNT(*) as count
      FROM activity_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    // Active users
    const activeUsers = await db.all(`
      SELECT
        username,
        COUNT(*) as activity_count,
        MAX(created_at) as last_active
      FROM activity_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
        AND username IS NOT NULL
      GROUP BY username
      ORDER BY activity_count DESC
      LIMIT 10
    `);

    // Total counts
    const totals = await db.get(`
      SELECT
        COUNT(*) as total_activities,
        COUNT(DISTINCT user_id) as unique_users
      FROM activity_logs
      WHERE created_at > NOW() - INTERVAL '${days} days'
    `);

    return {
      dailyActivity,
      topActions,
      activeUsers,
      totals
    };
  } catch (error) {
    console.error('Activity stats error:', error.message);
    return null;
  }
}

/**
 * Get recent activity logs
 */
async function getRecentLogs(limit = 50) {
  try {
    return await db.all(`
      SELECT id, user_id, username, action, details, ip_address, created_at
      FROM activity_logs
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
  } catch (error) {
    console.error('Recent logs error:', error.message);
    return [];
  }
}

/**
 * Clean old logs (older than specified days)
 */
async function cleanOldLogs(days = 30) {
  try {
    const result = await db.run(`
      DELETE FROM activity_logs
      WHERE created_at < NOW() - INTERVAL '${days} days'
    `);
    return result.changes;
  } catch (error) {
    console.error('Clean logs error:', error.message);
    return 0;
  }
}

module.exports = {
  logActivity,
  activityLoggerMiddleware,
  getActivityStats,
  getRecentLogs,
  cleanOldLogs
};
