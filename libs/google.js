const { google } = require('googleapis');
const { logger } = require('../logger');

const { googleCredentials, googleScopes } = require('../config');

async function authentication() {
  const credentials = JSON.parse(googleCredentials);
  const auth = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    googleScopes.split(","),
    credentials.client_email
  );

  await auth
    .authorize()
    .then((res) => res)
    .catch((err) => logger.log('Error while google authentication:', err));

  return auth;
}

async function getObject(fileId, auth) {
  const drive = google.drive({ version: 'v3', auth });
  let result;
  try {
    result = await drive.files.get({ fileId });
  } catch (err) {
    logger.log('Error while getting google drive object:', err);
  }

  if (!result) {
    logger.log('No response while getting google drive object');
  }

  if (result.status === 200 && result.data) {
    return result.data;
  }

  return false;
}

async function isFolder(id, auth) {
  const item = await getObject(id, auth);
  logger.log('Item:', item);
  return item.mimeType === 'application/vnd.google-apps.folder';
}

async function isFile(id, auth) {
  const result = await isFolder(id, auth);
  return result;
}

async function getFolderFiles(folderId, auth) {
  const query = `'${folderId}' in parents`;
  const drive = google.drive({ version: 'v3', auth });
  let result;
  try {
    result = await drive.files.list({
      q: query,
      pageSize: 10,
      fields: 'nextPageToken, files(*)',
    });
  } catch (err) {
    logger.log('Error while getting google drive folder files:', err);
  }

  if (!result) {
    logger.log('No response while getting google drive folder files');
  }

  if (result.status === 200 && result.data.files.length > 0) {
    return result.data.files;
  }

  return false;
}

function downloadGoogleWorkspaceFile(fileId, auth) {
  const drive = google.drive({ version: 'v3', auth });
  return drive.files
    .export(
      {
        fileId,
        mimeType: 'application/vnd.oasis.opendocument.text',
      },
      {
        responseType: 'stream',
        // responseType: 'arraybuffer',
      }
    )
    .then((res) => res.data)
    .catch((err) =>
      logger.log('Error while downloading google drive workspace file:', err)
    );
}

function downloadStoredFileOnGoogleDrive(fileId, auth) {
  const drive = google.drive({ version: 'v3', auth });
  return drive.files
    .get(
      {
        fileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
        // responseType: 'arraybuffer',
      }
    )
    .then((res) => res.data)
    .catch((err) =>
      logger.log('Error while downloading stored on google drive file:', err)
    );
}

function downloadFile(fileId, fileMimeType, auth) {
  return ['application/vnd.google-apps.document'].includes(fileMimeType)
    ? downloadGoogleWorkspaceFile(fileId, auth)
    : downloadStoredFileOnGoogleDrive(fileId, auth);
}

module.exports = {
  authentication,
  getFolderFiles,
  downloadFile,
  getObject,
  isFolder,
  isFile,
};
