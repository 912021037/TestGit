const GameManager = require('../game/gameManager')
const ROOM_STATUS = require('../constants/model').ROOM_STATUS
let DB = require('./mysql')
const db = DB()
const User = require('./user')
const UserModel = new User()
const TimeUtil = require('../utils/timeUtil')

var Room = function (sn) {
    this.sn = sn
    this.id = undefined
    this.game_identity = undefined
    this.user_id = undefined
    this.casino_club_id = undefined
    this.casino_club_is_point_limit = undefined;
    this.casino_club_point_limit = undefined;
    this.casino_game_id = undefined
    this.mode = undefined
    this.status = undefined
    this.options = {}
    this.name = ''
    this.description = ''

    // private data
    this._users = {}
    this._channelService = null
    this._gameHandler = null
}

var r = Room.prototype

r.changeStatus = function(status, cb) {
    const now = TimeUtil.getNowDateTimeString();
    const self = this;
    const initStatus = self.status;
    self.status = status;
    db.query(
        `UPDATE casino_rooms SET
            status = ${db.escape(status)},
            updated_at = ${db.escape(now)}
            WHERE id = ${db.escape(self.id)}`,
        (err, results, fields) => {
            if (results.affectedRows <= 0) {
                self.status = initStatus;
                cb(false);
                return;
            }
            cb(true);
        }
    )
}

r.handleRequest = function(user, request) {
    this._triggerGameEvent('onUserRequest', this, user, request)
}

r.isOwner = function(uid) {
    return this.user_id !== undefined && this.user_id === uid
}

r.allowJoin = function(uid, cb) {
    var self = this
    db.query(`SELECT count(id) as c FROM casino_room_users 
        WHERE user_id = ${db.escape(uid)} 
        AND casino_room_id = (
            SELECT id FROM casino_rooms WHERE sn = ${db.escape(self.sn)} ORDER BY id DESC LIMIT 1
        )`, 
    (err, results, fields) => {
        if (results[0].c > 0) {
            cb(true)
        } else {
            cb(false)
        }
    })
}

r.join = function(user, sid) {
    this._users[user.uid] = user

    let channel = this.getChannel()
    channel.pushMessage({
        route: 'onJoinRoom',
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
    })
    channel.add(user.uid, sid)
    this._triggerGameEvent('onUserJoinRoom', this, user)
}

r.leave = function(uid, sid) {
    let user = this._users[uid]
    if (!user) {
        return
    }
    this._users[uid] = undefined

    let channel = this.getChannel()
    channel.leave(uid, sid)
    this._triggerGameEvent('onUserLeaveRoom', this, user)
    channel.pushMessage({
        route: 'onLeaveRoom',
        uid: uid,
        nickname: user.nickname,
        avatar: user.avatar,
    })
}

r.changeOwner = function(fromUser, toUser) {
    const self = this

    if (!self.isOwner(fromUser.uid)) {
        console.log('change owner but not own %s, %s', self.user_id, fromUser.uid)
        return
    }
    if (self.user_id === toUser.uid) {
        console.log('change owner is unnecessary')
        return
    }

    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `UPDATE casino_rooms SET
            user_id = ${db.escape(toUser.uid)},
            updated_at = ${db.escape(now)}
            WHERE id = ${db.escape(self.id)}`,
        (err, results, fields) => {
            if (results.affectedRows <= 0) {
                return
            }

            self.user_id = toUser.uid

            let channel = self.getChannel()
            channel.pushMessage({
                route: 'onChangeRoomOwner',
                uid: toUser.uid,
                nickname: toUser.nickname,
                avatar: toUser.avatar,
            })
        }
    )
}

r.canKickUser = function(fromUser, toUser) {
    const self = this

    if (!self.isOwner(fromUser.uid)) {
        console.log('kick user but not own %s, %s', self.user_id, fromUser.uid)
        return false
    }

    return true
}

r.kickUser = function(uid, sid) {
    let user = this._users[uid]
    if (!user) {
        return
    }
    this._users[uid] = undefined

    let channel = this.getChannel()
    channel.pushMessage({
        route: 'onLeaveRoom',
        uid: uid,
        nickname: user.nickname,
        avatar: user.avatar,
        is_kick: true
    })
    channel.leave(uid, sid)
    this._triggerGameEvent('onUserLeaveRoom', this, user)
}

r.canDismiss = function(uid) {
    const self = this

    if (!self.isOwner(uid)) {
        console.log('dismiss room but not own %s, %s', self.user_id, uid)
        return false
    }

    if (self.status !== ROOM_STATUS.WAITING) {
        console.log('dismiss room but already gaming, status = %s', self.status)
        return false
    }

    return true
}

r.dismiss = function(cb) {
    const self = this
    self.changeStatus(ROOM_STATUS.CANCEL, () => {
        let channel = self.getChannel()
        channel.pushMessage({
            route: 'onDismissRoom',
        }, cb)
        self._triggerGameEvent('onDismissRoom', this)
        channel.destroy()
    })
}

r.clean = function() {
    const self = this
    let channel = self.getChannel()
    channel.pushMessage({
        route: 'onCleanRoom',
    })
    self._triggerGameEvent('onCleanRoom', this)
}

r.init = function(channelService, cb) {
    const self = this
    self._channelService = channelService

    self.fetchInfo(() => {
        self._gameHandler = GameManager.buildGame(self.game_identity, self.getChannel(true))
        self._triggerGameEvent('onInit', this)
        cb()
    })
}

r.fetchInfo = function(cb) {
    const self = this
    db.query(
        `SELECT r.*, g.identity 
            FROM casino_rooms as r
            LEFT JOIN casino_games as g ON r.casino_game_id = g.id
            WHERE sn = ${db.escape(self.sn)} ORDER BY id DESC LIMIT 1`,
        (err, results, fields) => {
            results.forEach((r) => {
                self.id = parseInt(r.id)
                self.game_identity = r.identity
                self.user_id = parseInt(r.user_id)
                self.casino_club_id = parseInt(r.casino_club_id)
                self.casino_game_id = parseInt(r.casino_game_id)
                self.mode = parseInt(r.casino_game_mode)
                self.status = parseInt(r.status)
                self.options = JSON.parse(r.options)
                self.name = r.name
                self.description = r.description
            })
            if (!self.isClubRoom()) {
                cb();
                return;
            }
            db.query(
                `SELECT * 
                    FROM casino_clubs 
                    WHERE id = ${db.escape(self.casino_club_id)}`,
                (err, results, fields) => {
                    results.forEach((r) => {
                        self.casino_club_is_point_limit = r.is_point_limit > 0;
                        self.casino_club_point_limit = parseInt(r.point_limit);
                    })
                    cb();
                }
            );
        }
    )
}

r.fetchUsersInfo = function(userIds, cb) {
    const self = this
    db.query(
        `SELECT *
            FROM casino_room_users as u
            WHERE casino_room_id = ${db.escape(self.id)}
            AND user_id IN (${userIds.join(',')})
            ORDER BY id`,
        (err, results, fields) => {
            cb(results)
        }
    )
}

r.fetchAllUsers = function(cb) {
    const self = this
    db.query(
        `SELECT *
            FROM casino_room_users as u
            WHERE casino_room_id = ${db.escape(self.id)}
            ORDER BY id`,
        (err, users, fields) => {
            const userIds = [];
            for (let i = 0; i < users.length; i++) {
                const u = users[i];
                u.current_balance = u.balance;
                userIds.push(parseInt(u.user_id));
            }

            if (!self.isClubRoom()) {
                cb(users);
                return;
            }

            UserModel.fetchClubMembers(self.casino_club_id, userIds, (results) => {
                const members = {};
                results.forEach((m) => {
                    members[m.user_id] = m;
                });

                for (let i = 0; i < users.length; i++) {
                    const u = users[i];
                    const m = members[u.user_id];
                    // for 实时结算
                    // u.balance = m.balance;
                    u.casino_member_id = m.id;
                }
                cb(users);
            });
        }
    )
}

r.fetchGameConfigs = function(cb) {
    const self = this
    db.query(
        `SELECT *
            FROM casino_game_configs
            WHERE game_id = ${db.escape(self.casino_game_id)}
            ORDER BY id`,
            cb
    )
}

r.fetchClubConfig = function(cb) {
    const self = this
    db.query(
        `SELECT id,config
            FROM casino_clubs
            WHERE id = ${db.escape(self.casino_club_id)}`,
        (err, results) => {
            if (err || results.length < 1) {
                cb({});
                return;
            }

            const club = results[0];
            if (!club.config) {
                cb({});
                return;
            }

            let ret = {};
            try {
                ret = JSON.parse(club.config);
            } catch (ex) {
                cb({});
            }
            cb(ret);
        }
    )
}

r.updateUserStatus = function(uid, status, cb) {
    this._updateUserValue(uid, 'status', status, cb)
}

r.updateUserPosition = function(uid, position, cb) {
    this._updateUserValue(uid, 'position', position, cb)
}

r.updateUserBalance = function(uid, balance, cb) {
    this._updateUserValue(uid, 'balance', balance, cb)
}

r._updateUserValue = function(uid, key, value, cb) {
    const now = TimeUtil.getNowDateTimeString()
    const self = this
    db.query(
        `UPDATE casino_room_users SET
            ${key} = ${db.escape(value)},
            updated_at = ${db.escape(now)}
            WHERE casino_room_id = ${db.escape(self.id)}
            AND user_id = ${db.escape(uid)}`,
        (err, results, fields) => {
            if (err) {
                self._updateUserValue(uid, key, value, cb)
                return
            }

            if (results.affectedRows <= 0) {
                cb(false)
            } else {
                cb(true)
            }
        }
    )
}

r.setRemoteServer = function (server) {
    this._remoteServer = server
}

r.getRemoteServer = function () {
    return this._remoteServer
}

r.getChannel = function(isCreate) {
    return this._channelService.getChannel(this.sn, isCreate)
}

r.getUsers = function() {
    return this._users
}

r.isClubRoom = function() {
    return this.casino_club_id > 0;
}

r.isClubPointLimit = function() {
    return this.casino_club_is_point_limit;
}

r.getClubPointLimit = function() {
    return this.casino_club_point_limit;
}

r._triggerGameEvent = function(event) {
    if (!event) {
        return
    }

    let handler = this._gameHandler[event]
    if (!handler) {
        return
    }

    let params = Array.prototype.slice.call(arguments, 1)

    handler.apply(this._gameHandler, params)
}

module.exports = function(sn) {
    return new Room(sn)
}