const ROOM_STATUS = require('../constants/model').ROOM_STATUS
const ROOM_GAME_STATUS = require('../constants/model').ROOM_GAME_STATUS
const User = require('../models/user')
const UserModel = new User()
const GameLogger = require('../models/gameLogger');

module.exports = function(baseGame, seatCount) {
	return new GameRoom(baseGame, seatCount)
};

const NULLHandler = () => {}

/**
 * 有座位的房间
 */
var GameRoom = function(baseGame, seatCount) {
    this.baseGame = baseGame
    this.seatCount = seatCount // 座椅数目
    this.seats = {} // 目前的座椅状态
    for(let i = 0; i < this.seatCount; i++) {
        this.seats[i] = undefined
    }

    this.gameLogger = GameLogger();
    this.roomGameId = 0;
    this.players = {}
    this.isInited = false;
    this._currentRounds = 0;
};

var p = GameRoom.prototype

p.getSatUsers = function() {
    let ret = []

    for(let i = 0; i < this.seatCount; i++) {
        let u = this.seats[i]
        if (u !== undefined) {
            ret.push(u)
        }
    }

    return ret
}

p.takeSeat = function(user, extraData) {
    // duplicate sit
    let position = this.getPosition(user)
    if (position >= 0) {
        return position
    }

    for(let i = 0; i < this.seatCount; i++) {
        if (this.seats[i] === undefined) {
            this.sit(i, user, extraData)
            return i
        }
    }

    console.log('no empty seat')

    return -1
}

p.sit = function(position, user, extraData) {
    this.seats[position] = user
    user.seatPosition = position
    let ret = {
        position: position,
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
    }
    if (extraData) {
        for(let d in extraData) {
            ret[d] = extraData[d]
        }
    }
    this.baseGame.sendResp('onUserSit', ret)
}

p.standUp = function(user) {
    for(let i = 0; i < this.seatCount; i++) {
        let u = this.seats[i]
        if (u !== undefined && u.uid === user.uid) {
            this.seats[i] = undefined
            user.seatPosition = undefined
            this.baseGame.sendResp('onUserStandUp', {
                position: i,
                uid: user.uid,
                nickname: user.nickname,
                avatar: user.avatar,
            })
            return i
        }
    }

    console.log('no sit but stand up')

    return -1
}

p.getPosition = function(user) {
    for(let i = 0; i < this.seatCount; i++) {
        let u = this.seats[i]
        if (u !== undefined && u.uid === user.uid) {
            return i
        }
    }
    return -1
}

p.wasSat = function(user) {
    for(let i = 0; i < this.seatCount; i++) {
        let u = this.seats[i]
        if (u !== undefined && u.uid === user.uid) {
            return true
        }
    }
    return false
}

p.hasEmptySeat = function() {
    return this.getEmptySeatCount() > 0
}

p.getNonEmptySeatCount = function() {
    return this.seatCount - this.getEmptySeatCount()
}

p.getEmptySeatCount = function() {
    let count = 0
    for(let i = 0; i < this.seatCount; i++) {
        if (this.seats[i] === undefined) {
            count++
        }
    }
    return count
}

p.chat = function(user, request) {
    if (!this.wasSat(user)) {
        return
    }
    this.baseGame.sendResp('onUserChat', {
        uid: user.uid,
        payload: request.payload,
    })
}

p.handleRequestSit = function(position, user, extraData) {
    if (position >= this.seatCount) {
        return;
    }

    if (this.seats[position] !== undefined) {
        return;
    }

    const seatPosition = this.getPosition(user);
    if (seatPosition >= 0) {
        this.standUp(user);
    }

    this.sit(position, user, extraData);
}

p.handleUserRequest = function(room, user, request, extraData) {
    if (request.type !== 'gameRoom') {
        return
    }

    switch(request.action) {
        case 'takeSeat':
            this.takeSeat(user, extraData);
            break
        case 'sit':
            this.handleRequestSit(request.position, user, extraData);
            break;
        case 'standUp':
            this.standUp(user)
            break
        case 'chat':
            this.chat(user, request)
            break
    }
}

p.init = function(room) {
    const self = this

    self._prepareData(room, (roomGameId) => {
        self.roomGameId = roomGameId
        self.gameLogger.getCurrentGameRounds(room.id, self.roomGameId, (rounds) => {
            console.log('current rounds %s', rounds)
            self._currentRounds = parseInt(rounds)

            room.fetchAllUsers((results) => {
                results.forEach((u) => {
                    let uid = parseInt(u.user_id)
                    self.players[uid] = {
                        uid: uid,
                        memberId: u.casino_member_id,
                        ready: false,
                        offline: true,
                        currentBalance: parseInt(u.current_balance),
                        balance: parseInt(u.balance),
                    }
                })
                self.isInited = true
            })
        })
    })
}

p._prepareData = function(room, cb) {
    const self = this;
    self.gameLogger.getLastRoomGameId(room.id, (roomGameId) => {
        if (roomGameId) {
            cb(roomGameId)
        } else {
            self.gameLogger.createRoomGame(room, ROOM_GAME_STATUS.GAMING, (roomGameId) => {
                cb(roomGameId)
            })
        }
    })
}

p.buildPlayer = function(room, user) {
    const p = {
        uid: user.uid,
        nickname: user.nickname,
        avatar: user.avatar,
        channel: user.channel,
        currentBalance: 0,
        balance: 0,
        ready: false,
        offline: false,
        logged: false,               // 是否必须计入结算记录
    };

    if (room.isClubRoom()) {
        UserModel.fetchClubMembers(room.casino_club_id, [user.uid], (members) => {
            if (members && members.length > 0) {
                const m = members[0];
                p.memberId = parseInt(m.id);
                // for 实时结算
                // p.balance = parseInt(m.balance);
            }
        });
    }

    return p;
}

p.handleUserJoinRoom = function(room, user) {
    const self = this;
    if (!this.isInited) {
        setTimeout(() => {
            self.handleUserJoinRoom(room, user);
        }, 300);
        return;
    }
    let player = this.players[user.uid];
    if (!player) {
        player = this.buildPlayer(room, user);
        this.players[user.uid] = player;
    } else {
        player.channel = user.channel;
        player.nickname = user.nickname;
        player.avatar = user.avatar;
        player.offline = false;
    }
}

p.handleUserLeaveRoom = function(room, user) {
    const player = this.players[user.uid];
    player.offline = true;

    if (player.ready) {
        if (room.status === ROOM_STATUS.WAITING && player.balance === 0) {
            player.ready = false
            this.standUp(player)
        }
    } else {
        if (player.balance === 0) {
            this.standUp(player)
        }
    }
}

p.ready = function(room, user, canStartFunction, startFunction, readyWaitMS) {
    const self = this

    if (!self.wasSat(user)) {
        console.log('ready but no sat');
        return;
    }

    if (room.isClubRoom() && room.isClubPointLimit()) {
        UserModel.fetchClubMembers(room.casino_club_id, [user.uid], (members) => {
            if (members && members.length > 0) {
                const m = members[0];
                const balance = parseInt(m.balance);
                if (balance < room.getClubPointLimit()) {
                    console.log(`ready but club balance not enough, need: ${room.getClubPointLimit()}, balance: ${balance}`);
                    self.baseGame.sendRespByChannel(user.channel, 'onClubPointLimit', {
                        limit: room.getClubPointLimit(),
                        balance: balance,
                    });
                    return;
                }
            }
            self._readyAction(room, user, canStartFunction, startFunction, readyWaitMS);
        })
    } else {
        self._readyAction(room, user, canStartFunction, startFunction, readyWaitMS);
    }
}

p._readyAction = function(room, user, canStartFunction, startFunction, readyWaitMS) {
    const self = this;

    let p = self.players[user.uid];
    p.ready = true;
    p.logged = true;
    self.baseGame.sendResp('onReady', {
        uid: user.uid,
    });

    if (!canStartFunction(room, user)) {
        return;
    }

    if (self.readyCountDownTimer === undefined) {
        self.readyCountDownTimer = self.baseGame.newCountdownTimer(readyWaitMS, 'onStartCountdown', () => {
            self._start(room, user, startFunction);
        })
    }

    if (self._isEveryBodyReady()) {
        self._start(room, user, startFunction);
    }
}

p.unReady = function(uid) {
    this.baseGame.sendResp('onUnReady', {
        uid: uid,
    });
}

p._start = function (room, user, startFunction) {
    if (this.readyCountDownTimer !== undefined) {
        clearInterval(this.readyCountDownTimer)
        this.readyCountDownTimer = undefined
    }
    startFunction(room, user)
}

p._isEveryBodyReady = function() {
    const self = this;
    for (let uid in self.players) { 
        const p = self.players[uid];
        if (p.seatPosition !== undefined && p.seatPosition >= 0 && !p.offline && p.ready !== true) { 
            return false 
        } 
    } 
    return true 
}

p.end = function(room, isClean, delay) {
    const self = this;
    const players = self.getPlayers();
    const users = [];
    for (let uid in players) {
        const p = players[uid]
        if (p.logged) {
            users.push(p);
        }
    }

    let isAAPay = false;
    let aaPrice = 0;
    const o = room.options;
    if (o && o.payment && o.payment === "aa") {
        isAAPay = true;
        if (o.round_price && o.round_price.length >= 2) {
            aaPrice = parseInt(o.round_price[1]);
        }
    }

    const total = users.length;
    let index = 0;
    users.forEach((u) => {
        self.getGameLogger().createRoomGameUser(
            room, 
            self.getRoomGameId(), 
            u.uid, 
            u.seatPosition ? u.seatPosition : 0, 
            u.currentBalance, 
            u.nickname, 
            u.avatar, 
            () => {
                index++
                if (index === total) {
                    self._finishEnd(room, isClean, delay)
                }
            }
        )

        if (room.isClubRoom()) {
            UserModel.changeClubMemberBalance(u.memberId, u.currentBalance, {
                description: `${room.sn}结算`,
            }, NULLHandler);
        }

        if (isAAPay && aaPrice > 0) {
            UserModel.changeRoomCardBalance(u.uid, -1 * aaPrice, {
                targetId: room.id,
                description: `AA支付加入${room.sn}`,
            }, () => {
                // do nothings
            });
        } 
    })

    if (users.length <= 0) {
        self._finishEnd(room, isClean, delay)
    }
}

p._finishEnd = function(room, isClean, delay) {
    const self = this
    if (isClean) {
        self._doEnd(room, delay)
    } else {
        self.gameLogger.setRoomGameStatus(this.roomGameId, ROOM_GAME_STATUS.FINISH, () => {
            room.changeStatus(ROOM_STATUS.FINISH, () => {
                self._doEnd(room, delay)
            })
        })
    }
}

p._doEnd = function(room, delay) {
    const self = this;

    self.baseGame.sendResp('onGameEnd', {
        delay: delay ? delay : 3000,
    });

    self._sendClubCommission(room);

    room.getRemoteServer().close(room.sn);
}

p._sendClubCommission = function(room) {
    // 俱乐部积分模式抽水
    if (!room.isClubRoom()) {
        return;
    }

    const self = this;

    room.fetchClubConfig((config) => {
        if (!config.commissions) {
            return;
        }

        let players = [];
        for (let uid in self.getPlayers()) {
            const p = self.getPlayerByUID(uid);
            players.push(p);
        }
        players.sort((left, right) => {
            return right.currentBalance - left.currentBalance;
        });
        console.log('send club commission', players, config.commissions)

        // TODO 赢同样多应该怎么算佣金?
        config.commissions.forEach((rate, index) => {
            if (rate <= 0) {
                return;
            }

            if (index >= players.length) {
                return;
            }

            const p = players[index];
            const commission = p.currentBalance * rate;
            if (commission <= 0) {
                return;
            }
            UserModel.changeClubMemberBalance(p.memberId, -1 * commission, {
                description: `${room.sn}抽水`,
            }, () => {
                UserModel.logClubCommission(room, p.uid, p.currentBalance, rate, commission, self.getRoomGameId(), 0);
            });
        });
    })
}

p.changeBalance = function(room, player, change, cb) {
    player.balance += change;
    player.currentBalance += change;
    player.logged = true;
    // for 实时结算
    // if (room.isClubRoom()) {
    //     UserModel.changeClubMemberBalance(player.memberId, change, cb ? cb : NULLHandler);
    // }
}

p.fetchUserConfigs = function(userIds, cb) {
    const self = this;
    UserModel.fetchConfigs(userIds, (err, results) => {
        if (err) {
            console.error(err);
            return
        }
        results.forEach((row) => {
            const uid = parseInt(row.user_id);
            const p = self.getPlayerByUID(uid);
            if (!p) {
                return;
            }
            p.luck = parseInt(row.luck);
            p.isPerspective = parseInt(row.is_perspective);
        })
        cb();
    })
}

p.getRoomGameId = function() {
    return this.roomGameId;
}

p.getCurrentRounds = function() {
    return this._currentRounds;
}

p.increaseCurrentRounds = function() {
    this._currentRounds++;
}

p.getPlayers = function() {
    return this.players;
}

p.getPlayerByUID = function(uid) {
    return this.players[uid];
}

p.getReadyPlayers = function() {
    const ret = []
    for(let uid in this.players) {
        let p = this.players[uid]
        if (p.ready) {
            ret.push(p)
        }
    }
    return ret
}

p.getGameLogger = function() {
    return this.gameLogger;
}