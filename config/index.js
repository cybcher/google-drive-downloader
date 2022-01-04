const dotenv = require('dotenv');

const { logger } = require('../utils/logger');

dotenv.config();

const env = (name, defaultValue) => {
  if (process.env[name]) return process.env[name];
  if (typeof defaultValue !== 'undefined') {
    logger.log(`Using default value ${defaultValue} for ${name}`);
    return defaultValue;
  }

  throw new Error(`No default value for ${name}`);
};

module.exports = {
  googleCredentials: env('GOOGLE_CREDENTIALS', '{}'),
  googleScopes: env('GOOGLE_SCOPES', ''),
};
