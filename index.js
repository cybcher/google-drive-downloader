const { finished } = require("stream");
const { promisify } = require("util");

const { logger } = require("./utils/logger");
const archiver = require("./libs/archiver");
const google = require("./libs/google");
const file = require("./libs/file");

const promisifiedFinished = promisify(finished);

async function main(id) {
  const defaultPath = file.getDefaultPath();
  file.createFoldersStructure(defaultPath);

  const archiveStream = archiver.getArchiver();
  const fileStream = file.getFileStream(`${defaultPath}/google-drive.zip`);

  archiveStream.pipe(fileStream);

  await download(id, archiveStream);

  archiveStream.finalize(function (err, bytes) {
    if (err) throw err;

    logger.log(`${bytes} total bytes`);
  });
}

async function downloadFileAndArchive(fileId, archiverStream, authClient, filePath = undefined) {
  logger.log(`Getting file (fileId: '${fileId}')`);
  let file = await google.getObject(fileId, authClient);
  if (google.GOOGLE_WORKSPACE_MIME_TYPES.includes(file.mimeType)) {
    file = {
      ...file,
      name: `${file.name}${
        google.GOOGLE_WORKSPACE_MIME_TYPE_DOWNLOAD_MAP[file.mimeType].ext
      }`,
    };
  }
  let fileSavePath = file.name;
  if (filePath !== undefined) {
    fileSavePath = `${filePath}/${file.name}`;
  }

  let stream;
  try {
    stream = await google.downloadFile(file.id, file.mimeType, authClient);
  } catch (err) {
    logger.log(err);
  }

  archiverStream.append(stream, { name: fileSavePath });

  return promisifiedFinished(stream);
}

async function downloadFolderFilesAndArchive(
  folderId,
  archiverStream,
  authClient,
  folderName = ""
) {
  const folderFiles = [];
  let googleObjects;
  try {
    logger.log(`Getting folder files (folderId: '${folderId}')`);
    googleObjects = await google.getFolderObjects(folderId, authClient);
  } catch (err) {
    logger.log(err);
  }

  logger.log(`Folder files count: ${googleObjects.length || 0}`);
  for (let i = 0; i < googleObjects.length; i++) {
    const googleObject = googleObjects[i];
    if (google.isFolderType(googleObject.mimeType)) {
      const downloadFiles = await downloadFolderFilesAndArchive(
        googleObject.id,
        archiverStream,
        authClient,
        `${folderName}/${googleObject.name}`
      );
      const downloadedFiles = await Promise.all(downloadFiles);

      folderFiles.push({ name: googleObject.name, files: downloadedFiles });
      continue;
    }

    const downloadedFile = downloadFileAndArchive(googleObject.id, archiverStream, authClient, folderName);
    folderFiles.push(downloadedFile);
  }

  return folderFiles;
}

async function download(id, archiverStream) {
  let authClient, objectIsFolder;
  try {
    authClient = await google.authentication();
    objectIsFolder = await google.isFolder(id, authClient);
  } catch (err) {
    logger.log(err);
  }

  const result = (objectIsFolder)
    ? await downloadFolderFilesAndArchive(id, archiverStream, authClient)
    : await downloadFileAndArchive(id, archiverStream, authClient);

  return result;
}

const testFile =
  "https://drive.google.com/file/d/1PCi2WSy-YH4sC_m5CasFlo7mos8Y6ExZ";
const mainTestFolder =
  "https://drive.google.com/drive/folders/1DXEXDpw1ufK2LNmnxrz0-hFBYfHMoJNg";
const testFolderWithFiles =
  "https://drive.google.com/drive/folders/1O2SrhuU_xENEE4mgjOLHBUfNyZ6-NwWv";
const testFolderWithFolders =
  "https://drive.google.com/drive/folders/1CI5ileDqe1zAnMIYiX_LYk7SEcEQtF00";
const testFolderWithFoldersChains =
  "https://drive.google.com/drive/folders/1b1KwBG5WrA16jqXaphdnbfr7Fa1KgMn2";

// Helpers
const getUrlId = (url) => {
  return url.split("/").reverse()[0];
};

// Promise.resolve(main(getUrlId(testFile))).catch(console.error);
Promise.resolve(main(getUrlId(mainTestFolder))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFiles))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFolders))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFoldersChains))).catch(console.error);

// Google: 18, 17, 11, NEW 15, 12, 16
// My tool: 44, 38, 41, NEW 21, 21, 21