module.exports = function(app) {
    return new ChatHandler(app)
}

var ChatHandler = function (app) {
    this.app = app
    this.channelService = app.get('channelService')
}

var h = ChatHandler.prototype

/**
 * Send message to users
 * 
 * @param {Object} msg 
 * @param {Object} session 
 * @param {Function} next 
 */
h.send = function (msg, session, next) {
    const self = this
}