const fs = require('fs');
const uuid = require('uuid');

const { logger } = require('../utils/logger');

const DEFAULT_DOWNLOAD_PATH = './files/';

const getFileStream = (out) => fs.createWriteStream(out);

const getDefaultPath = () => {
    const uniqueFolderName = uuid.v4();
    const downloadPath = DEFAULT_DOWNLOAD_PATH.concat(uniqueFolderName);

    return downloadPath;
};

const createFoldersStructure = (path) => {
  if (!fs.existsSync(DEFAULT_DOWNLOAD_PATH)) {
    fs.mkdirSync(DEFAULT_DOWNLOAD_PATH);

    logger.log(`Basic ${DEFAULT_DOWNLOAD_PATH} folder created 'Successfully'.`);
  }

  if (!fs.existsSync(path)) {
    fs.mkdirSync(path);

    logger.log(`Folder ${path} created 'Successfully'.`);
  }
};

module.exports = {
  getFileStream,
  getDefaultPath,
  createFoldersStructure,
};
