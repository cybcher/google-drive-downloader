const archiver = require('archiver');

const { logger } = require('../logger');

const getArchiver = () => {
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });

  logger.log('Archiver created.')
  return archive;
};

module.exports = {
  getArchiver,
};
