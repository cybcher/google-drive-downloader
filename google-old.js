const { google } = require("googleapis");
const fs = require("fs");

const keys = require("./jwt.keys.json");

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.appdata",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive.photos.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

async function authentication() {
    const auth = new google.auth.JWT(
        keys.client_email,
        null,
        keys.private_key,
        SCOPES,
        keys.client_email
      );

    await auth.authorize().then(res => res).catch(console.error);
    return auth;
}

async function isFolder(id, auth) {
 const item = await getObject(id, auth);
 return 'application/vnd.google-apps.folder' === item.mimeType;
}

async function isFile(id, auth) {
  return !(await isFolder(id, auth));
}

async function getObject(fileId, auth) {
  const drive = google.drive({ version: "v3", auth });
  let result = undefined;
  try {
    result = await drive.files.get({ fileId });
  } catch (e) {
    console.log(e);
  }

  if (!result) {
    console.log("No response");
  }

  if ((result.status = 200 && result.data)) {
    return result.data;
  }

  return false;
}

async function getFolderFiles(folderId, auth) {
  const query = "'" + folderId + "' in parents";
  const drive = google.drive({ version: "v3", auth });
  let result = undefined;
  try {
    result = await drive.files.list({
      q: query,
      pageSize: 10,
      fields: "nextPageToken, files(*)",
    });
  } catch (e) {
    console.log(e);
  }

  if (!result) {
    console.log("No response");
  }

  if ((result.status = 200 && result.data.files.length > 0)) {
    return result.data.files;
  }

  return false;
}

function downloadFile(
  fileId,
  fileMimeType,
  fileDownloadPath,
  auth
) {
  return ["application/vnd.google-apps.document"].includes(fileMimeType)
    ? downloadGoogleWorkspaceFile(
        fileId,
        fileDownloadPath,
        auth
      )
    : downloadStoredFileOnGoogleDrive(fileId, fileDownloadPath, auth);
}

// privet
function downloadGoogleWorkspaceFile(
  fileId,
  filePath,
  auth
) {
  const drive = google.drive({ version: "v3", auth });
  return drive.files
    .export(
      {
        fileId: fileId,
        mimeType: "application/vnd.oasis.opendocument.text",
      },
      {
        responseType: "stream",
      }
    )
    .then((res) => downloading(res.data, filePath))
    .catch(console.error);
}

function downloadStoredFileOnGoogleDrive(
  fileId,
  filePath,
  auth
) {
  const drive = google.drive({ version: "v3", auth });
  return drive.files
    .get(
      {
        fileId: fileId,
        alt: "media",
      },
      {
        responseType: "stream",
      }
    )
    .then((res) => downloading(res.data, filePath))
    .catch(console.error);
}

function downloading(stream, path) {
  return new Promise((resolve, reject) => {
    console.log(`\r\nStart downloading file: ${path}`);
    const destination = fs.createWriteStream(path);
    let progress = 0;

    stream
      .on("end", () => {
        console.log('\r\nDownloading file "DONE"');
        resolve(path);
      })
      .on("error", (err) => {
        console.error('\r\nError while downloading file');
        reject(err);
      })
      .on("data", (d) => {
        progress += d.length;
        if (process.stdout.isTTY) {
          process.stdout.clearLine();
          process.stdout.cursorTo(0);
          process.stdout.write(`Downloaded ${progress} bytes`);
        }
      })
      .pipe(destination);
  });
};

exports.authentication = authentication;
exports.getFolderFiles = getFolderFiles;
exports.downloadFile = downloadFile;
exports.getObject = getObject;
exports.isFile = isFile;
exports.isFolder = isFolder;