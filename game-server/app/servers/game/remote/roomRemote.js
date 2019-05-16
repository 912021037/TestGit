const User = require('../../../models/user')
const Room = require('../../../models/room')
const Redis = require('../../../models/redis')
const redis = Redis()

module.exports = function(app) {
    return new RoomRemote(app)
}

var RoomRemote = function(app) {
    this.app = app
    this.channelService = app.get('channelService')
    this.users = {}
    this.rooms = {}
    this.subscribeClient = redis.newConnection()

    const self = this
    const RedisCleanRoomsChannel = 'casino:clean-rooms'
    this.subscribeClient.on('message', (channel, message) => {
        console.log('sub channel %s, %s', channel, message)
        if (channel !== RedisCleanRoomsChannel) {
            return
        }

        try {
            let roomSns = JSON.parse(message)
            roomSns.forEach((roomSn) => {
                let room = self.rooms[roomSn]
                if (!room) {
                    return
                }
                room.clean()
            })
        } catch (ex) {
        }
    })
    this.subscribeClient.subscribe(RedisCleanRoomsChannel)
}

var r = RoomRemote.prototype

/**
 * Add user into game channel
 * 
 * @param {String} sid server id
 * @param {String} rid room id
 * @param {String} uid user id
 * @param {String} uid user nickname
 * @param {String} uid user avatar
 */
r.join = function (sid, rid, uid, nickname, avatar, cb) {
    const self = this

	// duplicate log in room
	if (self.users[uid]) {
        console.log(`duplicate log in room, ${uid}`, self.users[uid]);
        cb(false);
		return;
    }

    // save user
    let user = User(uid)
    user.nickname = nickname
    user.avatar = avatar
    user.frontendServerId = sid
    user.channel = this.channelService.getChannel(`roomuser-${rid}-${uid}`, true)
    user.channel.add(uid, sid)
    self.users[uid] = user

    // save room
    let room = self.rooms[rid]
    if (!room) {
        room = Room(rid)
        self.rooms[rid] = room
        room.setRemoteServer(this)
        room.init(this.channelService, () => {
            room.join(user, sid)
        })
    } else {
        room.join(user, sid)
    }
    cb(true)
}

/**
 * user leave game
 * 
 * @param {String} sid server id
 * @param {String} rid room id
 * @param {String} uid user id
 */
r.leave = function(sid, rid, uid, cb) {
    const self = this

    const user = self.users[uid]
    if (!user) {
        cb(false)
        return
    }

    // remove user
    if (user.channel) {
        user.channel.destroy()
    }
    self.users[uid] = undefined

    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }
    room.leave(uid, sid)
    cb(true)
}

/**
 * change room owner
 * 
 * @param {String} rid room id
 * @param {String} fromUid user id
 * @param {String} toUid user id
 */
r.changeOwner = function(rid, fromUid, toUid, cb) {
    const self = this

    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }

    const fromUser = self.users[fromUid]
    if (!fromUser) {
        cb(false)
        return
    }

    const toUser = self.users[toUid]
    if (!toUser) {
        cb(false)
        return
    }

    room.changeOwner(fromUser, toUser)
    cb(true)
}

/**
 * kick room user
 * 
 * @param {String} rid room id
 * @param {String} fromUid user id
 * @param {String} toUid user id
 */
r.kick = function(rid, fromUid, toUid, cb) {
    const self = this

    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }

    const fromUser = self.users[fromUid]
    if (!fromUser) {
        cb(false)
        return
    }

    const toUser = self.users[toUid]
    if (!toUser) {
        cb(false)
        return
    }

    if (!room.canKickUser(fromUser, toUser)) {
        cb(false)
        return
    }

    self.users[toUid] = undefined
    room.kickUser(toUser.uid, toUser.frontendServerId)
    cb(true)
}

/**
 * dismiss room
 * 
 * @param {String} rid room id
 * @param {String} fromUid user id
 * @param {String} toUid user id
 */
r.dismiss = function(rid, uid, cb) {
    const self = this

    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }

    const user = self.users[uid]
    if (!user) {
        cb(false)
        return
    }

    if (!room.canDismiss(uid)) {
        cb(false)
        return
    }

    self.rooms[rid] = undefined
    self.users[uid] = undefined
    room.dismiss()
    cb(true)
}

/**
 *  user send game req
 * 
 * @param {String} sid server id
 * @param {String} rid room id
 * @param {String} uid user id
 * @param {String} request user request payload
 */
r.req = function (sid, rid, uid, request, cb) {
    const self = this
    const user = self.users[uid]
    if (!user) {
        cb(false)
        return
    }

    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }

    room.handleRequest(user, JSON.parse(request))
    cb(true)
}

/**
 *  game over close room
 * 
 * @param {String} rid room id
 */
r.close = function (rid, cb) {
    const self = this
    const room = self.rooms[rid]
    if (!room) {
        cb(false)
        return
    }

    const users = room.getUsers()
    for(let uid in users) {
        const user = users[uid]
        if (user && user.channel) {
            user.channel.destroy()
        }

        let u = this.users[uid]
        if (u) {
            this.users[uid] = undefined
        }
    }
    let channel = room.getChannel()
    if (channel) {
        channel.destroy()
    }
    self.rooms[rid] = undefined

    if (cb) {
        cb(true)
    }
}