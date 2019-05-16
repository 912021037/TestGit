const ROOM_STATUS = require('../../constants/model').ROOM_STATUS;
const BaseGame = require('../baseGame');
const GameRoom = require('../gameRoom');
const GameLogger = require('../../models/gameLogger');
const ShowHandGame = require('../../../../shared/game/poker/ShowHand').ShowHand;
const ShowHandResult = require('../../../../shared/game/poker/ShowHand').Result;
const User = require('../../models/user');
const UserModel = new User();
const Poker = require('../../../../shared/game/poker/Poker');

class ShowHand extends BaseGame {
    constructor(channel) {
        super(channel)
        this.gameRoom = null
        this.gameLogger = GameLogger()

        // 房间配置
        this.playerCount = 0 // 最大玩家人数限制
        this.basePoint = 0 // 底分
        this.totalRound = 0 // 共几局

        // 系统配置
        this.configReadyWaitMS = 6000 // 准备后多少秒自动开始
        this.configStartWaitMS = 3000 // 开始游戏后秒数
        this.configUserWaitMS = 15000 // 等待用户操作秒数
        this.configUserRevealWaitMS = 6000 // 等待用户开牌毫秒数
        this.configSettleWaitMS = 6000 // 等待用户查看结果秒数
        this.configEndWaitMS = 5000    // 最后一盘结束后延迟毫秒数

        // 房间局部变量
        this._currentTurn = 0;      // 第几轮
        this._currentGame = null;
    }

    onInit (room) {
        const o = room.options;
        this.playerCount = parseInt(o.player);
        this.basePoint = parseInt(o.base_point);
        this.totalRound = o.round_price[0];
        this.gameRoom = GameRoom(this, this.playerCount);
        this._init(room);
    }

    _init(room) {
        this.gameRoom.init(room);
        this._fetchGameConfigs(room);
    }

    onUserJoinRoom (room, user) {
        this.gameRoom.handleUserJoinRoom(room, user);
    }

    onUserLeaveRoom (room, user) {
        this.gameRoom.handleUserLeaveRoom(room, user);
    }

    onDismissRoom (room) {
        this.onCleanRoom(room);
    }

    onCleanRoom (room) {
        this._end(room, true);
    }

    onUserRequest (room, user, request) {
        // game room handle request
        this.gameRoom.handleUserJoinRoom(room, user);
        const player = this.gameRoom.getPlayerByUID(user.uid);
        this.gameRoom.handleUserRequest(room, player, request, {
            balance: player.balance,
        });

        if (request.type !== 'game') {
            return;
        }

        switch (request.action) {
            case 'sync':
                this._sync(room, user);
                break;
            case 'ready':
                this._ready(room, user);
                break;
            case 'bet':
                this._bet(room, user.uid, parseInt(request.stake));
                break;
            case 'giveUp':
                this._giveUp(room, user.uid);
                break;
            case 'reveal':
                this._reveal(room, user.uid);
                break;
        }
    }

    _sync (room, user) {
        const self = this

        let payload = {
            room_sn: room.sn,
            room_owner: room.user_id,
            room_game_id: self.gameRoom.getRoomGameId(),
            room_status: room.status,
            rounds: self.gameRoom.getCurrentRounds(),
            turn: self._currentTurn,
            min_stake: self._currentMinStake,
            total_stake: self._currentTotalStake,
            viewers: null,
            players: null,
            face_down_poker: null,
            current_wait_uid: null,
            current_wait_delay: null,
        }

        const currentPlayers = self.gameRoom.getPlayers();

        const viewers = [];
        for (let uid in currentPlayers) {
            const p = currentPlayers[uid];
            if ((p.seatPosition === undefined || p.seatPosition < 0) && !p.offline) {
                viewers.push({
                    uid: p.uid,
                    nickname: p.nickname,
                    avatar: p.avatar,
                })
            }
        }
        payload.viewers = viewers;

        const players = [];
        for (let uid in currentPlayers) {
            const p = currentPlayers[uid];
            if (p.seatPosition === undefined || p.seatPosition < 0) {
                continue;
            }

            let result = null;
            if (p.faceUpPokers) {
                const res = new ShowHandResult(p.uid, p.faceUpPokers);
                result = {
                    type: res.type,
                    max_poker: res.getMaxPoker(),
                };
            }

            let data = {
                uid: p.uid,
                nickname: p.nickname,
                avatar: p.avatar,
                position: p.seatPosition,
                ready: p.ready,
                stake: p.stake,
                is_give_up: p.isGiveUp,
                turn_stake: p.currentTurnStake,
                balance: p.balance,
                face_up_pokers: p.faceUpPokers,
                result: result,
            }
            players.push(data);
        }
        payload.players = players;

        const p = self.gameRoom.getPlayerByUID(user.uid);
        if (p) {
            payload.face_down_poker = p.faceDownPoker;
        }

        if (self.waitResults && self.waitResultIndex !== undefined) {
            let res = self.waitResults[self.waitResultIndex - 1]
            if (res) {
                payload.current_wait_uid = res.index;
                payload.current_wait_delay = self.configUserWaitMS;
            }
        }

        this.sendRespByChannel(user.channel, 'onSync', payload);
    }

    _ready (room, user) {
        if (!this._canReady(room)) {
            console.log('ready but status not allow, status: %s', room.status);
            return
        }

        this.gameRoom.ready(room, user, this._canStart.bind(this), this._start.bind(this), this.configReadyWaitMS);
    }

    _start (room, user) {
        const self = this;

        if (self.isGameStarted) {
            return;
        }
        self.isGameStarted = true;

        room.changeStatus(ROOM_STATUS.GAMING, () => {
            self._begin(room);
        })
    }

    _begin (room) {
        const self = this;

        self._currentGame = new ShowHandGame();

        this.sendResp('onStart');

        setTimeout(() => {
            self._startNewRound(room);
        }, self.configStartWaitMS);
    }

    _startNewRound (room) {
        this.gameRoom.increaseCurrentRounds();
        this._currentTurn = 0;
        const players = this.gameRoom.getPlayers();
        for(let uid in players) {
            let player = players[uid];
            player.isGiveUp = false;
            player.stake = 0;
            player.currentTurnStake = 0;
            player.faceDownPoker = null;
            player.faceUpPokers = [];
            player.revealed = false;
        }

        this.sendResp('onNewRound', {
            rounds: this.gameRoom.getCurrentRounds(),
        });

        this._startFirstTurn(room);
    }

    _startFirstTurn (room) {
        const self = this;

        self._currentTurn = 1;
        self._currentMinStake = 0;
        self._currentTotalStake = 0;

        // 用于用户配置功能
        const userIds = [];
        const faceDownPokers = [];

        let players = self._getReadyPlayers();
        let currentPlayerCount = players.length;
        let gamePokers = self._currentGame.start(currentPlayerCount);
        let i = 0;
        players.forEach((player) => {
            userIds.push(player.uid)

            // 下底注
            self._playerToStake(room, player, self.basePoint, true)

            // 发牌
            const pokers = gamePokers[i]
            player.faceDownPoker = pokers[0]
            player.faceUpPokers.push(pokers[1])
            i++

            // 用户配置功能: 透视
            faceDownPokers.push({
                uid: player.uid,
                poker: player.faceDownPoker
            })

            // 推送底牌
            self.sendRespByChannel(player.channel, 'onFaceDownPoker', {
                poker: player.faceDownPoker,
            })
        })

        self._sendFirstTurn()

        self._startWaitingPlayer(room)

        // 顺便获取用户配置
        self._fetchUserConfigs(userIds, faceDownPokers)
    }

    _sendFirstTurn () {
        const self = this

        let payload = {
            players: null,
        }

        const players = self._getReadyPlayers()
        const ps = []
        players.forEach((p) => {
            ps.push({
                uid: p.uid,
                stake: p.stake,
                balance: p.balance,
                face_up_pokers: p.faceUpPokers,
            })
        })
        payload.players = ps

        self.sendResp('onFirstTurn', payload)
    }

    _startWaitingPlayer(room) {
        const self = this

        const players = self._getReadyPlayers()
        let results = []
        players.forEach((p) => {
            if (p.isGiveUp) {
                return
            }
            let res = new ShowHandResult(p.uid, p.faceUpPokers)
            results.push(res)
        })
        ShowHandGame.sortResult(results)

        // 开始等待
        self.waitResults = results
        self.waitResultIndex = 0
        self.waitTimeoutEvent = undefined
        self._waitNextPlayer(room)
    }

    _isPlayerTurn(uid) {
        if (this.waitResults === undefined || this.waitResultIndex === undefined) {
            return false
        }

        let res = this.waitResults[this.waitResultIndex - 1]

        if (!res) {
            return false
        }

        return res.index === uid
    }

    _waitNextPlayer(room) {
        const self = this

        if (self.betCountDownTimer !== undefined) {
            clearInterval(self.betCountDownTimer)
            self.betCountDownTimer = undefined
        }

        // last player
        if (self._getSurvivalPlayer() === 1) {
            self.waitResults = undefined;
            self.waitResultIndex = undefined;
            self._settle(room);
            return
        }

        // all player finish waiting
        if (self.waitResultIndex >= self.waitResults.length) {
            // 判断是否所有玩家都压了同样的注码, 不够的要补
            const players = self._getReadyPlayers()
            let maxStake = 0
            players.forEach((p) => {
                if (p.isGiveUp) {
                    return
                }
                if (p.currentTurnStake > maxStake) {
                    maxStake = p.currentTurnStake
                }
            })
            let results = []
            players.forEach((p) => {
                if (p.isGiveUp) {
                    return
                }
                if (p.currentTurnStake < maxStake) {
                    let res = new ShowHandResult(p.uid, p.faceUpPokers)
                    results.push(res)
                }
            })

            if (results.length != 0) {
                ShowHandGame.sortResult(results)
                self.waitResults = results
                self.waitResultIndex = 0
                self._waitNextPlayer(room)
            } else {
                self.waitResults = undefined
                self.waitResultIndex = undefined
                if (self._canSettle()) {
                    self._startWaitReveal(room)
                } else {
                    self._startNextTurn(room)
                }
            }
            return
        }

        const res = self.waitResults[self.waitResultIndex]
        const uid = res.index
        self.sendResp('onWaitPlayer', {
            uid: uid
        })

        self.waitResultIndex++

        self.betCountDownTimer = self.newCountdownTimer(self.configUserWaitMS, 'onWaitPlayerCountdown', () => {
            if (self._currentMinStake > 0) {
                self._giveUpAction(room, uid)
            } else {
                self._betAction(room, uid, self.basePoint)
            }
        })
    }

    _startNextTurn(room) {
        const self = this
        self._currentTurn++
        self._currentMinStake = 0

        // 用于用户配置功能
        const userIds = []
        let luckIsOn = true
        let luckIsSame = true
        let firstPlayerLuck
        let maxPlayerLuckUid
        let maxPlayerLuck
        let totalLuck = 0

        // 给每个没结束的玩家发牌
        const players = this._getReadyPlayers()
        let results = []
        players.forEach((p, index) => {
            if (p.isGiveUp) {
                return
            }
            let res = new ShowHandResult(p.uid, p.faceUpPokers)
            results.push(res)

            // 用于用户配置功能
            if (self._currentTurn >= 4 && luckIsOn) {
                userIds.push(p.uid)
                if (index === 0 && p.luck !== undefined) {
                    firstPlayerLuck = p.luck
                    maxPlayerLuckUid = p.uid
                    maxPlayerLuck = firstPlayerLuck
                }
                if (p.luck !== undefined) {
                    totalLuck += p.luck
                    if (p.luck != firstPlayerLuck) {
                        luckIsSame = false
                    }
                    if (p.luck > maxPlayerLuck) {
                        maxPlayerLuckUid = p.uid
                        maxPlayerLuck = p.luck
                    }
                } else {
                    luckIsOn = false
                }
            }
        })
        ShowHandGame.sortResult(results)

        // 最后一轮
        if (self._currentTurn >= 4) {
            // 检查有否开启用户配置功能
            if (luckIsOn === true && luckIsSame === false) {
                console.log('luck is working, total: %s, max: %s, maxuid: %s', totalLuck, maxPlayerLuck, maxPlayerLuckUid)
                if (self._canUserLuck(totalLuck, maxPlayerLuck)) {
                    // 开启用户配置功能 不使用系统的派牌
                    self._useLuckToDealCardByResults(room, results, maxPlayerLuckUid)
                    return
                }
            }
        }

        self._dealCardByResults(room, results)
    }

    _dealCardByResults(room, results) {
        const self = this

        results.forEach((res) => {
            const p = self.gameRoom.getPlayerByUID(res.index)

            p.currentTurnStake = 0

            const poker = self._currentGame.deal()
            p.faceUpPokers.push(poker)

            const newResult = new ShowHandResult(p.uid, p.faceUpPokers);
            let result = {
                type: newResult.type,
                max_poker: newResult.maxPoker,
            };

            self.sendResp('onUserDeal', {
                uid: p.uid,
                poker: poker,
                result: result,
            })
        })

        self._startWaitingPlayer(room)
    }

    _canUserLuck(totalLuck, maxPlayerLuck) {
        let rate = maxPlayerLuck / totalLuck
        let res = Math.random()
        if (res <= rate) {
            return true
        } else {
            return false
        }
    }

    _useLuckToDealCardByResults(room, results, maxPlayerLuckUid) {
        console.log('use luck, uid: %s', maxPlayerLuckUid)
        const self = this

        // 先派牌
        let realResults = []
        results.forEach((res) => {
            const p = self.gameRoom.getPlayerByUID(res.index)
            const poker = self._currentGame.deal()
            p.faceUpPokers.push(poker)

            const pokers = [p.faceDownPoker]
            p.faceUpPokers.forEach((p) => {
                pokers.push(p)
            })

            let realResult = new ShowHandResult(p.uid, pokers)
            realResults.push(realResult)
        })
        ShowHandGame.sortResult(realResults)

        let dealTimes = 1;
        const willWinPlayer = self.gameRoom.getPlayerByUID(maxPlayerLuckUid);
        let isWin = realResults[0].index === maxPlayerLuckUid;
        while(isWin === false && self._currentGame.hasMore()) {
            for (let i = 1; i < realResults.length; i++) {
                const res = realResults[i]
                if (res.index !== maxPlayerLuckUid) {
                    continue
                }
                const newPoker = self._currentGame.deal()
                willWinPlayer.faceUpPokers[willWinPlayer.faceUpPokers.length - 1] = newPoker
                const newPokers = [willWinPlayer.faceDownPoker]
                willWinPlayer.faceUpPokers.forEach((p) => {
                    newPokers.push(p)
                })
                realResults[i] = new ShowHandResult(res.index, newPokers)
                ShowHandGame.sortResult(realResults)
                isWin = realResults[0].index === maxPlayerLuckUid
                dealTimes++
                break
            }
        }
        console.log('luck sure win deal time %s', dealTimes)

        results.forEach((res) => {
            const p = self.gameRoom.getPlayerByUID(res.index);

            p.currentTurnStake = 0;

            const newResult = new ShowHandResult(p.uid, p.faceUpPokers);
            let result = {
                type: newResult.type,
                max_poker: newResult.maxPoker,
            };

            self.sendResp('onUserDeal', {
                uid: p.uid,
                poker: p.faceUpPokers[p.faceUpPokers.length - 1],
                result: result
            });
        })

        self._startWaitingPlayer(room);
    }

    _startWaitReveal(room) {
        const self = this

        self.revealCountDownTimer = self.newCountdownTimer(self.configUserRevealWaitMS, 'onRevealCountdown', () => {
            self._finishWaitReveal(room)
        })
    }

    _finishWaitReveal(room) {
        const self = this

        if (self.revealCountDownTimer !== undefined) {
            clearInterval(self.revealCountDownTimer)
            self.revealCountDownTimer = undefined
        }

        const players = self._getReadyPlayers()
        players.forEach((p) => {
            if (p.isGiveUp) {
                return;
            }
            if (!p.revealed) {
                self._revealAction(room, p.uid)
            }
        })

        self._settle(room)
    }

    _settle(room) {
        const self = this

        // do settle job
        const players = self._getReadyPlayers()
        let results = []
        players.forEach((p) => {
            if (p.isGiveUp) {
                return
            }
            let pokers = [p.faceDownPoker]
            p.faceUpPokers.forEach((p) => {
                pokers.push(p)
            })

            let res = new ShowHandResult(p.uid, pokers)
            results.push(res)
        })
        ShowHandGame.sortResult(results)

        const winner = results[0];
        const winnerPlayer = self.gameRoom.getPlayerByUID(winner.index);
        self.gameRoom.changeBalance(room, winnerPlayer, self._currentTotalStake);
        const playersData = [];
        if (results.length > 1) {
            results.forEach((res) => {
                const p = self.gameRoom.getPlayerByUID(res.index);
                playersData.push({
                    uid: res.index,
                    face_down_poker: p.faceDownPoker,
                    result_type: res.type,
                })
            })
        }

        // save to db
        self.gameLogger.createRoomGameRound(room.id, self.gameRoom.getRoomGameId(), {
            winner_user_id: winnerPlayer.uid,
            winner_bonus: self._currentTotalStake,
        }, (roundId) => {
            players.forEach((p) => {
                const pokers = [p.faceDownPoker]
                p.faceUpPokers.forEach((p) => {
                    pokers.push(p)
                })
                self.gameLogger.createRoomGameRoundUser(roundId, room.id, self.gameRoom.getRoomGameId(), p.uid, p.balance, {
                    isGiveUp: p.isGiveUp,
                    stake: p.stake,
                    pokers: pokers,
                }, () => {
                    room.updateUserBalance(p.uid, p.currentBalance, () => {
                    })
                })
            })
        })

        self._finishSettle(room, winnerPlayer, playersData)
    }

    _finishSettle(room, winnerPlayer, responsePlayers) {
        const self = this

        this.sendResp('onSettle', {
            winner_uid: winnerPlayer.uid,
            winner_balance: winnerPlayer.balance,
            winner_bonus: self._currentTotalStake,
            players: responsePlayers,
            delay: self.configSettleWaitMS,
        })

        const players = self.gameRoom.getPlayers();
        for(let uid in players) {
            const p = players[uid];
            if (p.ready === false) {
                continue;
            }
            p.ready = false;
            self.gameRoom.unReady(p.uid);

            if (p.offline && p.currentBalance === 0) {
                self.gameRoom.standUp(p);
            }
        }

        room.changeStatus(ROOM_STATUS.WAITING, () => {
            self.isGameStarted = false

            if (self._canEnd()) {
                console.log('current rounds equal total rounds, end game')
                self._end(room)
                return
            }
        })
    }

    _bet(room, uid, stake) {
        const self = this

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
        }

        if (!self._isPlayerTurn(uid)) {
            return
        }

        if (!self.lockUser(uid)) {
            return
        }

        self._betAction(room, uid, stake)

        self.unlockUser(uid)
    }

    _betAction(room, uid, stake) {
        const self = this

        const player = self.gameRoom.getPlayerByUID(uid);

        let minStake = self._currentMinStake - player.currentTurnStake
        if (stake < minStake) {
            stake = minStake
        }
        let totalStake = player.currentTurnStake + stake
        if (totalStake > self._currentMinStake) {
            self._currentMinStake = totalStake
        }
        self._playerToStake(room, player, stake)

        self._waitNextPlayer(room)
    }

    _giveUp(room, uid) {
        const self = this

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p) {
            return
        }

        if (!self._isPlayerTurn(uid)) {
            return
        }

        if (!self.lockUser(uid)) {
            return
        }

        self._giveUpAction(room, uid)

        self.unlockUser(uid)
    }

    _giveUpAction(room, uid) {
        const self = this
        const p = self.gameRoom.getPlayerByUID(uid);

        p.isGiveUp = true
        self.sendResp('onGiveUp', {
            uid: uid,
        })
        self._waitNextPlayer(room)
    }

    _reveal(room, uid) {
        const self = this

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
        }

        if (p.isGiveUp) {
            return;
        }

        if (p.revealed) {
            return
        }

        if (!self.lockUser(uid)) {
            return
        }

        self._revealAction(room, uid)

        self.unlockUser(uid)

        if (self._isEveryBodyReveal()) {
            self._finishWaitReveal(room)
        }
    }

    _revealAction(room, uid) {
        const self = this;
        const p = self.gameRoom.getPlayerByUID(uid);
        p.revealed = true;
        const pokers = [p.faceDownPoker, ...p.faceUpPokers];
        const newResult = new ShowHandResult(p.uid, pokers);
        const result = {
            type: newResult.type,
            max_poker: newResult.maxPoker
        }
        
        self.sendResp('onReveal', {
            uid: p.uid,
            poker: p.faceDownPoker,
            result: result
        })
    }

    _isEveryBodyReveal() {
        const players = this.gameRoom.getPlayers();
        for (let uid in players) {
            const p = players[uid];
            if (p.seatPosition !== undefined && p.seatPosition >= 0 && p.ready && (p.revealed !== true || p.isGiveUp)) {
                return false;
            }
        }
        return true;
    }

    _end (room, isClean) {
        this.gameRoom.end(room, isClean, this.configEndWaitMS);
    }

    _getReadyPlayers () {
        return this.gameRoom.getReadyPlayers();
    }

    _getSurvivalPlayer() {
        let survivalPlayer = 0
        const players = this._getReadyPlayers()
        players.forEach((p) => {
            if (!p.isGiveUp) {
                survivalPlayer++
            }
        })
        return survivalPlayer
    }

    _canReady(room) {
        return room.status === ROOM_STATUS.WAITING || room.status === ROOM_STATUS.READY
    }

    _canStart (room, user) {
        if (room.status !== ROOM_STATUS.WAITING && room.status !== ROOM_STATUS.READY) {
            return false
        }

        const readyPlayers = this._getReadyPlayers()
        if (readyPlayers.length < 2) {
            return false
        }

        return true
    }

    _canSettle() {
        // last player
        if (this._getSurvivalPlayer() === 1) {
            return true
        }

        // last turn
        if (this._currentTurn >= 4) {
            return true
        }
        
        return false
    }

    _canEnd() {
        if (this.gameRoom.getCurrentRounds() < this.totalRound) {
            return false
        }

        return true
    }

    _playerToStake(room, player, stake, noIncreaseCurrentTurnStake) {
        if (noIncreaseCurrentTurnStake === undefined) {
            player.currentTurnStake += stake
        }
        player.stake += stake
        this.gameRoom.changeBalance(room, player, -1 * stake);
        this._currentTotalStake += stake

        this.sendResp('onBet', {
            uid: player.uid,
            current_stake: stake,
            player_stake: player.stake,
            player_turn_stake: player.currentTurnStake,
            balance: player.balance,
            min_stake: this._currentMinStake,
            total_stake: this._currentTotalStake,
        })
    }

    _fetchGameConfigs(room) {
        const self = this

        room.fetchGameConfigs((err, results) => {
            results.forEach((row) => {
                switch (row.name) {
                    case 'READY_WAIT_MS':
                        self.configReadyWaitMS = parseInt(row.value)
                        break
                    case 'START_WAIT_MS':
                        self.configStartWaitMS = parseInt(row.value)
                        break
                    case 'USER_WAIT_MS':
                        self.configUserWaitMS = parseInt(row.value)
                        break
                    case 'SETTLE_WAIT_MS':
                        self.configSettleWaitMS = parseInt(row.value)
                        break
                    case 'END_WAIT_MS':
                        self.configEndWaitMS = parseInt(row.value)
                        break
                }
            })
        })
    }

    _fetchUserConfigs(userIds, faceDownPokers) {
        const self = this;
        UserModel.fetchConfigs(userIds, (err, results) => {
            if (err) {
                console.error(err);
                return;
            }
            results.forEach((row) => {
                const uid = parseInt(row.user_id);
                const p = self.gameRoom.getPlayerByUID(uid);
                if (!p) {
                    return;
                }
                p.luck = parseInt(row.luck);
                p.isPerspective = parseInt(row.is_perspective);
                if (p.isPerspective > 0) {
                    self.sendRespByChannel(p.channel, 'onPerspective', {
                        pokers: faceDownPokers
                    });
                }
            })
        })
    }
}

module.exports = ShowHand