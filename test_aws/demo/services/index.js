/**
 * Services Index
 * Export all services for easy importing
 */

const authService = require('./authService');
const creatureService = require('./creatureService');
const imageService = require('./imageService');
const feedbackService = require('./feedbackService');
const userService = require('./userService');

module.exports = {
  authService,
  creatureService,
  imageService,
  feedbackService,
  userService
};
