module.exports = {
  logger: {
    log: (message, object = undefined) => {
        object ? console.log(message, JSON.stringify(object)) : console.log(message)
    },
  },
};
