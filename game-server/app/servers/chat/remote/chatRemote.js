module.exports = function(app) {
    return new ChatRemote(app)
}

var ChatRemote = function(app) {
    this.app = app
    this.channelService = app.get('channelService')
}

var r = ChatRemote.prototype

/**
 * Add user into chat channel
 * 
 * @param {String} uid user id
 * @param {String} sid server id
 */
r.add = function (sid, uid, nickname, cb) {
    let channel = this.channelService.getChannel(sid, true)
    channel.pushMessage({
        route: 'onChatAdd',
        uid: uid,
        nickname: nickname,
    })
    channel.add(uid, sid)
    cb()
}

/**
 * Kick user out chat channel
 * 
 * @param {String} sid server id
 * @param {String} uid user id
 */
r.kick = function(sid, uid, cb) {
    let channel = this.channelService.getChannel(sid, true)
    channel.leave(uid, sid)
    channel.pushMessage({
        route: 'onChatLeave',
        uid: uid
    })
    cb()
}