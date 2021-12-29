const { finished } = require('stream');
const { promisify } = require('util');

const file = require("./file");
const google = require("./google");
const archiver = require("./archiver");
const { logger } = require("./logger");

const promisifiedFinished = promisify(finished);

async function main(id) {
  const defaultPath = file.getDefaultPath();
  file.createFoldersStructure(defaultPath);

  const archiveStream = archiver.getArchiver();
  const fileStream = file.getFileStream(defaultPath + "/google-drive.zip");

  fileStream.on("close", function () {
    logger.log(
      "archiver has been finalized and the output file descriptor has closed."
    );
  });

  archiveStream.on("error", function (err) {
    throw err;
  });
  archiveStream.pipe(fileStream);

  const googleResponse = (await isFolder(id))
    ? await downloadFolderFiles(id)
    : await downloadFile(id);

  // 1 way stream and return buffer
  // const buffer = await downloadFromGDIntoBuffer(googleResponse.stream, archiveStream);
  // archiveStream.append(buffer, {
  //   name: googleResponse.details.name,
  // });

  // 2 way download array buffer and convert into buffer
  // const buffer = Buffer.from(googleBuffer, "utf-8")
  // archiveStream.append(buffer, {
  //   name: googleResponse.details.name,
  // });

  // 3 way how to download
  archiveStream.append(googleResponse.stream, {
    name: googleResponse.details.name,
  });
  await promisifiedFinished(googleResponse.stream)
  // archive.directory(dest, name);
  await archiveStream.finalize(function (err, bytes) {
    if (err) {
      throw err;
    }

    logger.log(bytes + " total bytes");
  });
}

async function downloadFromGDIntoBuffer(googleStream) {
  let data = [];
  return new Promise((resolve, reject) => {
    googleStream
      .on("data", (chunk) => {
        data.push(chunk);
      })
      .on("error", (error) => reject(error))
      .on("end", () => {
        let buffer = Buffer.concat(data);
        resolve(buffer);
      });
  });
}

async function isFolder(id) {
  const authClient = await google.authentication();
  const result = await google.isFolder(id, authClient);
  logger.log("This is folder:", result);
  return result;
}

async function downloadFile(fileId) {
  const authClient = await google.authentication();
  const file = await google.getObject(fileId, authClient);

  const stream = await google.downloadFile(file.id, file.mimeType, authClient);

  return { details: file, stream };
}

async function downloadFolderFiles(folderId) {
  const authClient = await google.authentication();
  const filesDownloads = [];
  logger.log(`Getting folder files (folderId: "${folderId}")`);
  const files = await google.getFolderFiles(folderId, authClient);
  logger.log(`Folder files count: ${files.length}`);
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    filesDownloads.push(
      downloadFile(file.id)
    );
  }

  return await Promise.all(filesDownloads);
}

const getFileExtension = (file, defaultExtension = "txt") => {
  return file.fullFileExtension == undefined && file.fileExtension == undefined
    ? "doc"
    : file.fullFileExtension == file.fileExtension
    ? file.fullFileExtension
    : defaultExtension;
};

const getDownloadingFileFullName = (file) =>
  `${file.name}.${getFileExtension(file)}`;

const driveResourceUrl =
  "https://drive.google.com/file/d/1o6iY2kHCIp8BiVgrHQgBAYXVXk-3kGsh";
const id = "1o6iY2kHCIp8BiVgrHQgBAYXVXk-3kGsh";
Promise.resolve(main(id)).catch(console.error);
