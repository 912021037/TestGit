const ROOM_STATUS = require('../../constants/model').ROOM_STATUS
const ROOM_GAME_STATUS = require('../../constants/model').ROOM_GAME_STATUS
const BaseGame = require('../baseGame')
const GameLogger = require('../../models/gameLogger')
const BaccaratGame = require('../../../../shared/game/poker/Baccarat').Baccarat

const PHASE = {
    BETTING: 0,
    SETTLING: 1,
}

const BET_TYPE = {
    BANKER: 1,
    PLAYER: 2,
    TIE: 3,
    BANKER_PAIR: 4,
    PLAYER_PAIR: 5,
}

class Baccarat extends BaseGame {
    constructor(channel) {
        super(channel)
        this.gameLogger = GameLogger()
        this.roomGameId = 0

        // 系统配置
        this.sureWin = false;   // 是否必赢
        this.sureWinStake = 10; // 大于多少开启必赢
        this.stakes = [5, 10, 50, 100, 500, 1000] // 筹码类型
        this.bankerBonusRate = 0.95 // 庄赔率
        this.playerBonusRate = 1 // 闲赔率
        this.tieBonusRate = 8 // 和赔率
        this.pairBonusRate = 11 // 对子赔率
        this.configUserBetWaitMS = 16000 // 用户投注毫秒数
        this.configSettleWaitMS = 15000 // 等待用户查看结果毫秒数
        this.configBetCommission = "[0.05,0.03,0.02]"; // 投注佣金

        // 房间局部变量
        this.players = {} // 当前房间玩家
        this.playerCount = 0
        this._currentBetPlayers = {} // 当前下注玩家
        this._currentGame = null
        this._currentPhase = PHASE.BETTING
        this._currentResult = null
    }

    onInit (room) {
        const o = room.options
        this._currentGame = new BaccaratGame()
        this._currentGame.start()
        this._resultLogs = [];

        this.isInited = true
        this._start(room)
    }

    _buildPlayer(user) {
        return {
            uid: user.uid,
            nickname: user.nickname,
            avatar: user.avatar,
            channel: user.channel,
        }
    }

    onUserJoinRoom (room, user) {
        const self = this
        if (!this.isInited) {
            setTimeout(() => {
                self.onUserJoinRoom(room, user)
                }, 300)
            return
        }
        let player = this.players[user.uid]
        if (!player) {
            player = this._buildPlayer(user)
            this.players[user.uid] = player
        } else {
            player.channel = user.channel
            player.nickname = user.nickname
            player.avatar = user.avatar
        }
        this.playerCount++
    }

    onUserLeaveRoom (room, user) {
        const player = this.players[user.uid]
        if (player) {
            this.players[user.uid] = undefined
        }
        this.playerCount--
    }

    onUserRequest (room, user, request) {
        console.log('on user request', request)

        // game room handle request
        let player = this.players[user.uid]
        if (!player) {
            player = this._buildPlayer(user)
            this.players[user.uid] = player
        }

        if (request.type !== 'game') {
            return
        }

        switch (request.action) {
            case 'sync':
                this._sync(room, user)
                break
            case 'bet':
                this._bet(room, user, parseInt(request.t), parseInt(request.s))
                break
        }
    }

    _sync (room, user) {
        const self = this

        let payload = {
            room_sn: room.sn,
            room_game_id: self.roomGameId,
            stakes: self.stakes,
            cards: self._currentGame.getPokerQuantity(),
            result_logs: self._resultLogs,
            result_statistics: {
                banker: self._currentGame.getBankerWinCount(),
                player: self._currentGame.getPlayerWinCount(),
                tie: self._currentGame.getTieCount(),
            },
            player_count: self.playerCount + 30 + Math.ceil(Math.random() * 10 + 1),
            phase: self._currentPhase,
            result: self._currentResult,
        }

        this.sendRespByChannel(user.channel, 'onSync', payload)
    }

    _start (room) {
        console.log('start game')
        const self = this

        self._fetchGameConfigs(room)

        room.changeStatus(ROOM_STATUS.GAMING, () => {
            self.gameLogger.createRoomGame(room, ROOM_GAME_STATUS.GAMING, (roomGameId) => {
                self.roomGameId = roomGameId
                self._waitBet(room)
            })
        })
    }

    _waitBet (room) {
        const self = this

        self._currentPhase = PHASE.BETTING
        self._currentBetPlayers = {}
        let timer = self.newCountdownTimer(self.configUserBetWaitMS, 'onUserBetTimer', () => {
            clearInterval(timer)
            self._settle(room)
        })
    }

    _dealPoker() {
        if (!this._currentGame.canDeal()) {
            this._currentGame.start()
            this._resultLogs = [];
        }
        return this._currentGame.deal()
    }

    _settle (room) {
        const self = this

        self._currentPhase = PHASE.SETTLING

        let result;
        if (self.sureWin) {
            let betBankerTotal = 0;
            let betPlayerTotal = 0;
            for(let uid in self._currentBetPlayers) {
                const p = self._currentBetPlayers[uid]
                betBankerTotal += p.banker;
                betPlayerTotal += p.player;
            }
            if (Math.abs(betBankerTotal - betPlayerTotal) < self.sureWinStake) {
                result = this._dealPoker();
            } else {
                console.log(`sure win open, banker: ${betBankerTotal}, player: ${betPlayerTotal}`);
                let needPlayerWin = betBankerTotal > betPlayerTotal;
                let isWin = false
                let count = 1;
                while(!isWin) {
                    console.log(`try times ${count}`);
                    result = this._dealPoker();
                    if (needPlayerWin && result.isPlayerWin()) {
                        isWin = true;
                    } else if (!needPlayerWin && result.isBankerWin()) {
                        isWin = true;
                    }
                    count++;
                }
            }
        } else {
            result = this._dealPoker();
        }

        self._resultLogs.push({
            type: result.type,
            banker_pair: result.isBankerPair(),
            player_pair: result.isPlayerPair(),
        })
        const payload = self._buildResultPayload(result)
        self._currentResult = payload
        self.sendResp('onSettle', {
            res: payload,
            cards: self._currentGame.getPokerQuantity(),
            result_statistics: {
                banker: self._currentGame.getBankerWinCount(),
                player: self._currentGame.getPlayerWinCount(),
                tie: self._currentGame.getTieCount(),
            },
        })

        let users = []
        for(let uid in self._currentBetPlayers) {
            const p = self._currentBetPlayers[uid]
            const bonus = self._rewardUser(result, p)
            users.push({
                uid: p.uid,
                balance: p.balance,
                bonus: bonus,
                banker: p.banker,
                player: p.player,
                tie: p.tie,
                banker_pair: p.bankerPair,
                player_pair: p.playerPair,
            })
        }

        self.gameLogger.createRoomGameRound(room.id, self.roomGameId, payload, (roundId) => {
            users.forEach((u) => {
                self.gameLogger.createRoomGameRoundUser(roundId, room.id, self.roomGameId, u.uid, u.balance, u, () => {
                    // do nothing
                })
            })

            self.gameLogger.setRoomGameStatus(self.roomGameId, ROOM_GAME_STATUS.FINISH, () => {
            room.changeStatus(ROOM_STATUS.WAITING, () => {
                    let timer = self.newCountdownTimer(self.configSettleWaitMS, 'onSettleTimer', () => {
                        clearInterval(timer)
                        self._start(room)
                    })
                })
            })
        })
    }

    _rewardUser(result, p) {
        const self = this;
        let bonus = 0;
        let betTotal = 0;
        if (p.banker > 0) {
            betTotal += p.banker;
            if (result.isBankerWin()) {
                bonus += p.banker * (1 + self.bankerBonusRate);
            }
        }
        if (p.player > 0) {
            betTotal += p.player;
            if (result.isPlayerWin()) {
                bonus += p.player * (1 + self.playerBonusRate)
            }
        }
        if (result.isTie()) {
            if (p.tie > 0) {
                bonus += p.tie * (1 + self.tieBonusRate)
            }
            if (p.player > 0) {
                bonus += p.player
            }
            if (p.banker > 0) {
                bonus += p.banker
            }
        }
        if (p.bankerPair > 0) {
            betTotal += p.bankerPair;
            if (result.isBankerPair()) {
                bonus += p.bankerPair * (1 + self.pairBonusRate);
            }
        }
        if (p.playerPair > 0) {
            betTotal += p.playerPair;
            if (result.isPlayerPair()) {
                bonus += p.playerPair * (1 + self.pairBonusRate);
            }
        }

        // 发佣金
        if (!result.isTie()) {
            p.user.sendCommission(p.uid, self.roomGameId, 0, betTotal, self.configBetCommission);
        }

        // 开始赔付
        if (bonus <= 0) {
            return 0
        }
        p.balance += bonus
        p.user.changeCashBalance(p.uid, bonus, {
            targetId: self.roomGameId,
            description: "百家乐赔付"
        }, (status, balance) => {
            if (status === false) {
                return
            }
            self._notifyPlayerBalance(p.user.channel, balance)
        })

        return bonus
    }

    _buildBetPlayer(user) {
        return {
            user: user,
            uid: user.uid,
            balance: 0,
            banker: 0,
            player: 0,
            tie: 0,
            bankerPair: 0,
            playerPair: 0,
        }
    }

    _bet(room, user, type, stake) {
        const self = this

        const uid = user.uid

        if (self._currentPhase !== PHASE.BETTING) {
            console.error(`no betting phase: ${stake}`);
            return;
        }
        if (!self._isValidStake(stake)) {
            console.error(`no valid stake: ${stake}`);
            return
        } 

        if (!self.lockUser(uid)) {
            console.error(`can not lock user: ${uid}`);
            return
        }

        let p = self._currentBetPlayers[uid];
        if (!p) {
            p = self._buildBetPlayer(user);
        }

        let description = "";
        switch(type) {
            case BET_TYPE.BANKER:
                description = "百家乐押庄"
                break
            case BET_TYPE.PLAYER:
                description = "百家乐押闲"
                break
            case BET_TYPE.TIE:
                description = "百家乐押和"
                break
            case BET_TYPE.BANKER_PAIR:
                description = "百家乐押庄对"
                break
            case BET_TYPE.PLAYER_PAIR:
                description = "百家乐押闲对"
                break
        }
        user.changeCashBalance(p.uid, -1 * stake, {
            targetId: self.roomGameId,
            description: description,
        }, (status, balance, accountTransactionId) => {
            self.unlockUser(p.uid)
            if (status === false) {
                console.error(`fail to bet, uid: ${p.uid}, stake: ${stake}`);
                self._notifyPlayerMsg(p.user.channel, "余额不足");
                return
            }

            self._currentBetPlayers[uid] = p;

            p.balance = balance
            switch(type) {
                case BET_TYPE.BANKER:
                    p.banker += stake
                    break
                case BET_TYPE.PLAYER:
                    p.player += stake
                    break
                case BET_TYPE.TIE:
                    p.tie += stake
                    break
                case BET_TYPE.BANKER_PAIR:
                    p.bankerPair += stake
                    break
                case BET_TYPE.PLAYER_PAIR:
                    p.playerPair += stake
                    break
            }
            self._notifyPlayerBalance(user.channel, balance)
            self._broadcastPlayerBet(uid, type, stake)
        })
    }

    _broadcastPlayerBet(uid, type, stake) {
        this.sendResp('onBet', {
            uid: uid,
            t: type,
            s: stake,
        })
    }

    _notifyPlayerMsg(channel, msg) {
        this.sendRespByChannel(channel, 'onMsg', {
            msg,
        })
    }

    _notifyPlayerBalance(channel, balance) {
        this.sendRespByChannel(channel, 'onBalanceChange', {
            balance: balance
        })
    }

    _buildResultPayload(res) {
        return {
            result_type: res.type,
            banker_pokers: res.getBankerPokers(),
            player_pokers: res.getPlayerPokers(),
            banker_point: res.getBankerPoint(),
            player_point: res.getPlayerPoint(),
            banker_pair: res.isBankerPair(),
            player_pair: res.isPlayerPair(),
        }
    }

    _isValidStake(stake) {
        for(let i = 0; i < this.stakes.length; i++) {
            if (this.stakes[i] === stake) {
                return true
            }
        }
        return false
    }

    _fetchGameConfigs(room) {
        const self = this

        room.fetchGameConfigs((err, results) => {
            results.forEach((row) => {
                switch (row.name) {
                    case 'SURE_WIN':
                        self.sureWin = parseInt(row.value) > 0 ? true : false;
                        break;
                    case 'SURE_WIN_STAKE':
                        self.sureWinStake = parseInt(row.value);
                        break;
                    case 'PLAYER_STAKES':
                        self.stakes = JSON.parse(row.value);
                        break;
                    case 'BONUS_RATE_BANKER':
                        self.bankerBonusRate = parseFloat(row.value);
                        break;
                    case 'BONUS_RATE_PLAYER':
                        self.playerBonusRate = parseFloat(row.value);
                        break;
                    case 'BONUS_RATE_TIE':
                        self.tieBonusRate = parseFloat(row.value);
                        break;
                    case 'BONUS_RATE_PAIR':
                        self.pairBonusRate = parseFloat(row.value);
                        break;
                    case 'USER_BET_WAIT_MS':
                        self.configUserBetWaitMS = parseInt(row.value);
                        break;
                    case 'SETTLE_WAIT_MS':
                        self.configSettleWaitMS = parseInt(row.value);
                        break;
                    case 'BET_COMMISSION':
                        self.configBetCommission = row.value;
                        break;
                }
            })
        })
    }
}

module.exports = Baccarat