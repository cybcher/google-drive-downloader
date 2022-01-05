const archiver = require("archiver");

const getArchiver = () => {
  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  archive.on("error", function (err) {
    throw err;
  });

  return archive;
};

module.exports = {
  getArchiver,
};
