const { google } = require("googleapis");

const { googleCredentials, googleScopes } = require("../config");

const GOOGLE_WORKSPACE_MIME_TYPES = [
  "application/vnd.google-apps.document",
  "application/vnd.google-apps.presentation",
  "application/vnd.google-apps.spreadsheet",
  "application/vnd.google-apps.drawing",
  "application/vnd.google-apps.form",
];

const GOOGLE_WORKSPACE_MIME_TYPE_DOWNLOAD_MAP = {
  "application/vnd.google-apps.document": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
  },
  "application/vnd.google-apps.presentation": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: ".pptx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.drawing": {
    mimeType: "image/png",
    ext: ".png",
  },
  "application/vnd.google-apps.form": {
    mimeType: "application/zip",
    ext: ".zip",
  },
};

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
    .catch((err) => {
      throw err;
    });

  return auth;
}

async function getObject(fileId, auth) {
  const drive = google.drive({ version: "v3", auth });
  let result;
  try {
    result = await drive.files.get({ fileId });
  } catch (err) {
    throw err;
  }

  if (!result) {
    throw new Error("No response while getting google drive object");
  }

  if (result.status === 200 && result.data) {
    return result.data;
  }

  return false;
}

function isFolderType(mimeType) {
  return mimeType === "application/vnd.google-apps.folder";
}

async function isFolder(id, auth) {
  const object = await getObject(id, auth);

  return isFolderType(object.mimeType);
}

async function getFolderObjects(folderId, auth) {
  const query = `'${folderId}' in parents`;
  const drive = google.drive({ version: "v3", auth });
  let result;
  try {
    result = await drive.files.list({
      q: query,
      pageSize: 10,
      fields: "nextPageToken, files(*)",
    });
  } catch (err) {
    throw err;
  }

  if (!result) {
    throw new Error("No response while getting google drive folder files");
  }

  if (result.status === 200 && result.data.files.length > 0) {
    return result.data.files;
  }

  return false;
}

function downloadWorkspaceFile(fileId, auth, mimeType) {
  const drive = google.drive({ version: "v3", auth });
  return drive.files
    .export(
      {
        fileId,
        mimeType,
      },
      {
        responseType: "stream",
      }
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
}

function downloadStoredFile(fileId, auth) {
  const drive = google.drive({ version: "v3", auth });
  return drive.files
    .get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      }
    )
    .then((res) => res.data)
    .catch((err) => {
      throw err;
    });
}

function downloadFile(fileId, fileMimeType, auth) {
  return GOOGLE_WORKSPACE_MIME_TYPES.includes(fileMimeType)
    ? downloadWorkspaceFile(
        fileId,
        auth,
        GOOGLE_WORKSPACE_MIME_TYPE_DOWNLOAD_MAP[fileMimeType].mimeType
      )
    : downloadStoredFile(fileId, auth);
}

module.exports = {
  GOOGLE_WORKSPACE_MIME_TYPE_DOWNLOAD_MAP,
  GOOGLE_WORKSPACE_MIME_TYPES,
  getFolderObjects,
  authentication,
  isFolderType,
  downloadFile,
  getObject,
  isFolder,
};
