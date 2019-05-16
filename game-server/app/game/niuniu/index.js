const ROOM_STATUS = require('../../constants/model').ROOM_STATUS
const BaseGame = require('../baseGame')
const GameRoom = require('../gameRoom')
const NiuNiuPokersType = require('../../../../shared/game/poker/NiuNiu').NiuNiuPokersType
const NiuNiuGame = require('../../../../shared/game/poker/NiuNiu').NiuNiu
const NiuNiuResult = require('../../../../shared/game/poker/NiuNiu').Result
const GAME_MODE = require('./constants').GAME_MODE
const GAME_STATUS = require('./constants').GAME_STATUS
const ModeMingPaiQiangZhuang = require('./modes/mingpaiqiangzhuang')
const ModeMingPaiChengChuan = require('./modes/mingpaichengchuan')
const ModeSuperBanker = require('./modes/superbanker')
const ModeNiuNiuShangZhuang = require('./modes/niuniushangzhuang');

class NiuNiu extends BaseGame {
    constructor(channel) {
        super(channel)
        this.gameRoom = null

        // 房间配置
        this.mode = 0           // 模式
        this.playerCount = 0    // 最大玩家人数限制
        this.basePoint = 0      // 底分
        this.bonusRule = {}     // 奖励倍数 格式:{"NiuNiuResultType": "倍数"} 例子:{"1": 8, "2", 5, "4": 3}五小牛8倍,炸弹牛5倍,普通牛牛3倍
        this.totalRound = 0     // 共几局

        // 系统配置
        this.configReadyWaitMS = 5000 // 准备后多少毫秒自动开始
        this.configStartWaitMS = 100 // 开始游戏后毫秒数
        this.configUserCompeteBankerWaitMS = 9000 // 等待用户抢庄毫秒数
        this.configOnBankerWaitMS = 3500 // 等待用户查看庄家结果毫秒数
        this.configUserBetWaitMS = 6000 // 等待用户投注毫秒数
        this.configUserRevealWaitMS = 6000 // 等待用户开牌毫秒数
        this.configSettleWaitMS = 3000 // 等待用户查看结果毫秒数
        this.configEndWaitMS = 5000    // 最后一盘结束后延迟毫秒数

        // 房间局部变量
        this._currentGame = null
    }

    onInit (room) {
        const o = room.options
        this.mode = room.mode
        this.playerCount = parseInt(o.player)
        this.basePoint = parseInt(o.base_point)
        for(let type in o.rule) {
          this.bonusRule[type] = parseInt(o.rule[type])
        }
        for(let i = 0; i < o.poker_result.length; i++) {
          const r = o.poker_result[i]
          this.bonusRule[r[0]] = parseInt(r[1])
        }
        this.totalRound = o.round_price[0]
        this.gameRoom = GameRoom(this, this.playerCount)

        this.modeRunner = null
        switch(this.mode) {
            case GAME_MODE.MING_PAI_QIANG_ZHUANG:
                this.modeRunner = new ModeMingPaiQiangZhuang(this)
                break
            case GAME_MODE.MING_PAI_CHENG_CHUAN:
                this.modeRunner = new ModeMingPaiChengChuan(this)
                break
            case GAME_MODE.SUPER_BANKER:
                this.modeRunner = new ModeSuperBanker(this)
                break
            case GAME_MODE.NIU_NIU_SHANG_ZHUANG:
                this.modeRunner = new ModeNiuNiuShangZhuang(this);
                break;
        }
        this._init(room)
    }

    _init(room) {
        this.gameRoom.init(room)
        this._fetchGameConfigs(room)
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
                this._sync(room, user)
                break
            case 'ready':
                this._ready(room, user)
                break
            case 'bet':
                this._bet(room, user.uid, parseInt(request.multiple))
                break
            case 'reveal':
                this._reveal(room, user.uid)
                break
        }

        this.modeRunner.onUserRequest(room, user, request)
    }

    _sync (room, user) {
        const self = this

        let payload = {
            room_sn: room.sn,
            room_owner: room.user_id,
            room_game_id: self.gameRoom.getRoomGameId(),
            room_status: room.status,
            rounds: self.gameRoom.getCurrentRounds(),
            viewers: null,
            // 游戏数据开始
            players: null,
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
            let data = {
                uid: p.uid,
                nickname: p.nickname,
                avatar: p.avatar,
                position: p.seatPosition,
                ready: p.ready,
                balance: p.balance,
                offline: p.offline,
                face_up_pokers: p.faceUpPokers,
            }
            if (self._isResultSend && p.faceDownPoker && p.result) {
                data.face_down_poker = p.faceDownPoker
                data.result_type = p.result.type
                data.result_slice_pokers = p.result.slicePokers
            }
            players.push(data)
        }
        payload.players = players

        self.modeRunner.onSync(payload)

        self.sendRespByChannel(user.channel, 'onSync', payload)
    }

    _ready (room, user) {
        if (!this._canReady(room)) {
            console.log('ready but status not allow, status: %s', room.status)
            return
        }

        this.gameRoom.ready(room, user, this._canStart.bind(this), this._start.bind(this), this.configReadyWaitMS);
    }

    _start (room, user) {
        const self = this

        if (self.isGameStarted) {
            return
        }
        self.isGameStarted = true

        room.changeStatus(ROOM_STATUS.GAMING, () => {
            self._begin(room)
        })
    }

    _begin (room) {
        const self = this;

        this.sendResp('onStart');

        setTimeout(() => {
            self._startNewRound(room);
        }, self.configStartWaitMS);
    }

    _startNewRound (room) {
        this._currentGame = null;
        this.gameRoom.increaseCurrentRounds();
        this._currentResults = [];
        this._currentGameStatus = GAME_STATUS.DEAL_CARD;
        this._isResultSend = false;

        const players = this.gameRoom.getPlayers();
        for(let uid in players) {
            let player = players[uid];
            player.betted = false;
            player.playerMultiple = 1;
            player.revealed = false;
            player.stake = 0;
            player.faceDownPoker = null;
            player.faceUpPokers = [];
            player.result = null;
            this.modeRunner.onInitNewRoundPlayer(player);
        }

        this.modeRunner.onStartNewRound(room)

        this.sendResp('onNewRound', {
            rounds: this.gameRoom.getCurrentRounds(),
        })

        this._dealPokers(room)
    }

    _dealPokers (room) {
        const self = this

        // 用于用户配置功能
        const userIds = []

        let players = self._getReadyPlayers()
        players.forEach((player) => {
            userIds.push(player.uid)
        })

        // 获取用户配置
        self.gameRoom.fetchUserConfigs(userIds, () => {
            let luckRes = self.useLuck(players)
            console.log('luck res', luckRes)
            if (luckRes === undefined || !self.drawLottery(luckRes[1], luckRes[2])) {
                // 正常
                self._dealPokersAction(players)
                self._finishDealPokers(room)
                return
            }

            console.log('use luck, uid: %s', luckRes)
            let maxPlayerLuckUID = luckRes[0]
            let currentWinnerUID
            let times = 0
            do {
                self._dealPokersAction(players)
                currentWinnerUID = self._currentResults[0].index
                times++
            } while(maxPlayerLuckUID !== currentWinnerUID && times < 20) // 最多20次
            self._finishDealPokers(room)
        })
    }

    _dealPokersAction(players) {
        const self = this

        if (self.playerCount > 12) {
          self._currentGame = new NiuNiuGame(NiuNiuPokersType.STAR);
        } else if (self.playerCount > 10) {
          self._currentGame = new NiuNiuGame(NiuNiuPokersType.GONG);
        } else {
          self._currentGame = new NiuNiuGame(NiuNiuPokersType.NORMAL);
        }

        self._currentResults = []
        let gamePokers = self._currentGame.start(players.length)
        let i = 0
        players.forEach((player) => {
            // 发牌
            const pokers = gamePokers[i];
            player.faceUpPokers = [];
            player.faceUpPokers.push(pokers[0])
            player.faceUpPokers.push(pokers[1])
            player.faceUpPokers.push(pokers[2])
            player.faceUpPokers.push(pokers[3])
            player.faceDownPoker = pokers[4]

            let result = new NiuNiuResult(player.uid, pokers, self.bonusRule)
            player.result = result
            self._currentResults.push(result)
            i++
        })

        NiuNiuGame.sortResult(self._currentResults)
    }

    _sendDealPokers () {
        const self = this

        let payload = {
            players: null,
        }

        const players = self._getReadyPlayers()
        const ps = []
        players.forEach((p) => {
            const data = {
                uid: p.uid,
                face_up_pokers: p.faceUpPokers,
            }
            ps.push(data)
        })
        payload.players = ps

        self.sendResp('onDealPokers', payload)

        const results = []
        self._currentResults.forEach((res) => {
            const p = self.gameRoom.getPlayerByUID(res.index);
            results.push({
                uid: p.uid,
                poker: p.faceDownPoker,
                result_type: res.type,
                result_slice_pokers: res.slicePokers,
            })
        })
        players.forEach((p) => {
            if (!p.isPerspective) {
                return
            }

            self.sendRespByChannel(p.channel, 'onPerspective', {
                results: results
            })
        })
    }

    _finishDealPokers(room) {
        const self = this

        self._sendDealPokers()

        self.modeRunner.onFinishDealPokers(room)
    }

    _startWaitBet(room) {
        const self = this

        self.betCountDownTimer = self.newCountdownTimer(self.configUserBetWaitMS, 'onBetCountdown', () => {
            self._finishWaitBet(room)
        })
    }

    _finishWaitBet(room) {
        const self = this

        if (self._currentGameStatus !== GAME_STATUS.BET) {
            return
        }
        self._currentGameStatus = GAME_STATUS.REVEAL

        if (self.betCountDownTimer !== undefined) {
          clearInterval(self.betCountDownTimer)
          self.betCountDownTimer = undefined
        }

        const players = self._getReadyPlayers()
        players.forEach((p) => {
          if (!p.betted && p.uid !== self.modeRunner.getCurrentBankerUID()) {
            self._betAction(room, p.uid, 1)
          }
        })

        self._sendResult(room)

        self._startWaitReveal(room)
    }

    _sendResult(room) {
        const players = []

        this._getReadyPlayers().forEach((p) => {
            players.push({
                uid: p.uid,
                face_down_poker: p.faceDownPoker,
                result_type: p.result.type,
                result_slice_pokers: p.result.slicePokers,
            })
        })

        this.sendResp('onResult', {
            players: players,
        })

        this._isResultSend = true
    }

    _startWaitReveal(room) {
        const self = this

        self.revealCountDownTimer = self.newCountdownTimer(self.configUserRevealWaitMS, 'onRevealCountdown', () => {
            self._finishWaitReveal(room)
        })
    }

    _finishWaitReveal(room) {
        const self = this

        if (self._currentGameStatus !== GAME_STATUS.REVEAL) {
            return
        }
        self._currentGameStatus = GAME_STATUS.SETTLE

        if (self.revealCountDownTimer !== undefined) {
          clearInterval(self.revealCountDownTimer)
          self.revealCountDownTimer = undefined
        }

        const players = self._getReadyPlayers()
        players.forEach((p) => {
          if (!p.revealed) {
            self._revealAction(room, p.uid)
          }
        })

        self._settle(room)
    }

    _settle(room) {
        const self = this

        let playersData = this.modeRunner.buildSettlePlayerData(room)
        let roundData = this.modeRunner.buildSettleRoundData(room)

        self._finishSettle(room, playersData, roundData)
    }

    _finishSettle(room, responsePlayers, roundData) {
        const self = this

        // save to db
        self.gameRoom.getGameLogger().createRoomGameRound(room.id, self.gameRoom.getRoomGameId(), roundData, (roundId) => {
            responsePlayers.forEach((data) => {
                const p = self.gameRoom.getPlayerByUID(data.uid);
                const pokers = []
                p.result.slicePokers.forEach((indexArr) => {
                    indexArr.forEach((index) => {
                        pokers.push(p.result.pokers[index])
                    })
                })
                self.gameRoom.getGameLogger().createRoomGameRoundUser(roundId, room.id, self.gameRoom.getRoomGameId(), p.uid, p.balance, {
                    position: p.seatPosition,
                    bonus: data.bonus,
                    player_multiple: p.playerMultiple,
                    pokers: pokers,
                    result_type: p.result.type,
                }, () => {
                    room.updateUserBalance(p.uid, p.currentBalance, () => {
                    })
                })
            })
        })

        this.sendResp('onSettle', {
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
            self.isGameStarted = false;

            if (self._canEnd()) {
                console.log('current rounds equal total rounds, end game')
                self._end(room)
                return
            }

            self.modeRunner.onFinishSettle(room)
        })
    }

    _bet(room, uid, multiple) {
        const self = this

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
        }

        if (p.betted) {
          return
        }

        if (!self.lockUser(uid)) {
          return
        }

        self._betAction(room, uid, multiple)

        self.unlockUser(uid)

        if (self._isEveryBodyBet()) {
            self._finishWaitBet(room)
            return
        }
    }

    _betAction(room, uid, multiple) {
        const self = this
        const p = self.gameRoom.getPlayerByUID(uid);
        p.betted = true
        p.playerMultiple = multiple

        self.sendResp('onBet', {
            uid: p.uid,
            multiple: multiple,
        })
    }

    _reveal(room, uid) {
        const self = this

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
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
        const self = this
        const p = self.gameRoom.getPlayerByUID(uid);
        p.revealed = true

        self.sendResp('onReveal', {
          uid: p.uid,
        })
    }

    _end (room, isClean) {
        this.gameRoom.end(room, isClean, this.configEndWaitMS);
    }

    _getReadyPlayers () {
        return this.gameRoom.getReadyPlayers();
    }

    _canReady(room) {
        return room.status === ROOM_STATUS.WAITING || room.status === ROOM_STATUS.READY
    }

    _isEveryBodyBet() {
        const players = this.gameRoom.getPlayers()
        for (let uid in players) {
            const p = players[uid]
            if (p.seatPosition !== undefined && p.seatPosition >= 0 && p.ready && (p.betted !== true && p.uid !== this.modeRunner.getCurrentBankerUID())) {
                return false
            }
        }
        return true
    }

    _isEveryBodyReveal() {
        return this._checkEveryBodyAttr('revealed', true);
    }

    _checkEveryBodyAttr(attrName, attrValue) {
        const players = this.gameRoom.getPlayers()
        for (let uid in players) {
            const p = players[uid]
            if (p.seatPosition !== undefined && p.seatPosition >= 0 && p.ready && p[attrName] !== attrValue) {
                return false
            }
        }
        return true
    }

    _canStart (room, user) {
        if (room.status !== ROOM_STATUS.WAITING && room.status !== ROOM_STATUS.READY) {
            return false
        }

        const readyPlayers = this._getReadyPlayers()
        if (readyPlayers.length < 2) {
            return false
        }

        if (!this.modeRunner.canStart(readyPlayers)) {
            return false
        }

        return true
    }

    _canEnd() {
        if (this.gameRoom.getCurrentRounds() < this.totalRound) {
            return false
        }

        return true
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
                    case 'USER_COMPETE_BANKER_WAIT_MS':
                        self.configUserCompeteBankerWaitMS = parseInt(row.value)
                        break
                    case 'ON_BANKER_WAIT_MS':
                        self.configOnBankerWaitMS = parseInt(row.value)
                        break
                    case 'USER_BET_WAIT_MS':
                        self.configUserBetWaitMS = parseInt(row.value)
                        break
                    case 'USER_REVEAL_WAIT_MS':
                        self.configUserRevealWaitMS = parseInt(row.value)
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
}

module.exports = NiuNiu