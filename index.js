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
    if (err) {
      throw err;
    }

    logger.log(`${bytes} total bytes`);
  });
}

// helpers
const getUrlId = (url) => {
  return url.split("/").reverse()[0];
};

const isFolderType = (file) => {
  return file.mimeType === "application/vnd.google-apps.folder";
};

// downloadFileAndArchive and downloadFile can be merged into one function
async function downloadFileAndArchive(fileId, archiverStream, authClient) {
  const file = await downloadFile(fileId, authClient);
  archiverStream.append(file.stream, { name: file.details.name });
  await promisifiedFinished(file.stream);

  return file;
}

async function downloadFile(fileId, authClient, filePath = undefined) {
  let file = await google.getObject(fileId, authClient);
  if (google.GOOGLE_WORKSPACE_MIME_TYPES.includes(file.mimeType)) {
    file = {
      ...file,
      name: `${file.name}${
        google.GOOGLE_WORKSPACE_MIME_TYPE_DOWNLOAD_MAP[file.mimeType].ext
      }`,
    };
  }
  const stream = await google.downloadFile(file.id, file.mimeType, authClient);

  return { details: file, stream };
}

async function downloadFolderFilesAndArchive(
  folderId,
  archiverStream,
  authClient,
  folderName = ""
) {
  const filesDownloads = [];
  logger.log(`Getting folder files (folderId: '${folderId}')`);
  const files = await google.getFolderFiles(folderId, authClient);
  logger.log(`Folder files count: ${files.length || 0}`);
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    let name;
    if (isFolderType(file)) {
      name = file.name;
      const downloadedFiles = await downloadFolderFilesAndArchive(
        file.id,
        archiverStream,
        authClient,
        `${folderName}/${name}`
      );
      filesDownloads.push({ name, files: Promise.all(downloadedFiles) });
      continue;
    }

    const downloadedFile = await downloadFile(file.id, authClient, folderName);
    archiverStream.append(downloadedFile.stream, {
      name: `${folderName}/${downloadedFile.details.name}`,
    });
    await promisifiedFinished(downloadedFile.stream);
    filesDownloads.push(downloadedFile);
  }

  return filesDownloads;
}

async function download(id, archiverStream) {
  const authClient = await google.authentication();
  const isFolderFlag = await google.isFolder(id, authClient);
  const result = isFolderFlag
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

// Promise.resolve(main(getUrlId(testFile))).catch(console.error);
Promise.resolve(main(getUrlId(mainTestFolder))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFiles))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFolders))).catch(console.error);
// Promise.resolve(main(getUrlId(testFolderWithFoldersChains))).catch(console.error);
