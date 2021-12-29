module.exports = {
    logger: {
        log: (message, object = {}) => { console.log(message, JSON.stringify(object)); },
    },
}