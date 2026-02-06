// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Please login to access this page');
  res.redirect('/auth/login');
}

// Middleware to check if user is NOT authenticated (for login/register pages)
function isNotAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/gallery');
  }
  next();
}

// Middleware to check if user is admin
function isAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  req.flash('error', 'Admin access required');
  res.redirect('/gallery');
}

module.exports = { isAuthenticated, isNotAuthenticated, isAdmin };
