const ROOM_STATUS = require('../../constants/model').ROOM_STATUS;
const BaseGame = require('../baseGame');
const GameRoom = require('../gameRoom');
const ZhaJinHuaGame = require('../../../../shared/game/poker/ZhaJinHua').ZhaJinHua;
const ZhaJinHuaResult = require('../../../../shared/game/poker/ZhaJinHua').Result;
const User = require('../../models/user');
const UserModel = new User();

class ZhaJinHua extends BaseGame {
    constructor(channel) {
        super(channel);
        this.gameRoom = null;

        // 房间配置
        this.playerCount = 0; // 最大玩家人数限制
        this.stakes = [];     // 底分
        this.maxStake = 0;     // 注码上限
        this.vsStake = 0;     // 比牌注码下限
        this.peekStake = 0;   // 看牌注码下限
        this.totalRound = 0;   // 共几局

        // 系统配置
        this.configReadyWaitMS = 6000;   // 准备后多少秒自动开始
        this.configStartWaitMS = 100;    // 开始游戏后秒数
        this.configUserWaitMS = 15000;   // 等待用户操作秒数
        this.configUserVSMS = 3000;      // 用户比牌秒数
        this.configSettleWaitMS = 6000;  // 等待用户查看结果秒数
        this.configEndWaitMS = 5000;     // 最后一盘结束后延迟毫秒数

        // 房间局部变量
        this._currentTurn = 0;  // 第几轮
        this._currentGame = null;
    }

    onInit (room) {
        const o = room.options;
        this.playerCount = parseInt(o.player);
        this.stakes = o.stakes;
        this.maxStake = parseInt(o.max_stake);
        this.vsStake = parseInt(parseFloat(o.rule_vs) * o.max_stake);
        this.peekStake = parseInt(parseFloat(o.rule_peek) * o.max_stake);

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
        this.onCleanRoom(room)
    }

    onCleanRoom (room) {
        this._end(room, true)
    }

    onUserRequest (room, user, request) {
        // game room handle request
        this.gameRoom.handleUserJoinRoom(room, user);
        const player = this.gameRoom.getPlayerByUID(user.uid);
        this.gameRoom.handleUserRequest(room, player, request, {
            balance: player.balance,
        });

        if (request.type !== 'game') {
            return
        }

        switch (request.action) {
            case 'sync':
                this._sync(room, user);
                break;
            case 'ready':
                this._ready(room, user);
                break;
            case 'bet':
                this._bet(room, user.uid, request.index);
                break;
            case 'peek':
                this._peek(room, user.uid);
                break;
            case 'vs':
                this._vs(room, user.uid, request.uid);
                break;
            case 'giveUp':
                this._giveUp(room, user.uid)
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
            viewers: null,
            // 游戏数据开始
            turn: self._currentTurn,
            min_stake: self._currentMinStakeIndex,
            total_stake: self._currentTotalStake,
            players: null,
            current_wait_uid: null,
            current_wait_delay: null,
            show_peek: null,
            show_vs: null,
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
                stake: p.stake,
                peek: p.peeked,
                give_up: p.isGiveUp,
                lost: p.isLost,
                pokers: [],
                result: null,
            }
            if (p.uid === user.uid && p.peeked) {
                data.pokers = p.faceDownPokers;
                data.result = p.result.type;
            }
            players.push(data);
        }
        payload.players = players;

        if (self.waitPlayers && self.waitPlayerIndex !== undefined) {
            const player = self.waitPlayers[self.waitPlayerIndex - 1];
            if (player) {
                payload.current_wait_uid = player.uid;
                payload.current_wait_delay = self.configUserWaitMS;
            }

            const currentPlayer = self.gameRoom.getPlayerByUID(user.uid);
            if (currentPlayer) {
                payload.show_peek = self._showPeek(currentPlayer);
                payload.show_vs = self._showVS(currentPlayer);
            }
        }

        this.sendRespByChannel(user.channel, 'onSync', payload);
    }

    _ready (room, user) {
        if (!this._canReady(room)) {
            console.log('ready but status not allow, status: %s', room.status)
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

        self._currentGame = new ZhaJinHuaGame();

        this.sendResp('onStart');

        setTimeout(() => {
            self._startNewRound(room);
        }, self.configStartWaitMS);
    }

    _startNewRound (room) {
        this.gameRoom.increaseCurrentRounds();
        this._currentTurn = 0;

        const currentPlayers = this.gameRoom.getPlayers();
        for(let uid in currentPlayers) {
            let player = currentPlayers[uid];
            player.stake = 0;
            player.betted = false;
            player.peeked = false;
            player.isGiveUp = false;
            player.isLost = false;
            player.faceDownPokers = [];
            player.faceUpPokers = [];
            player.result = null;
            player.revealPokers = [];
        }

        this.sendResp('onNewRound', {
            rounds: this.gameRoom.getCurrentRounds(),
        });

        this._startFirstTurn(room);
    }

    _startFirstTurn (room) {
        const self = this;

        self._currentTurn = 1;
        self._currentMinStakeIndex = 0;
        self._currentTotalStake = 0;

        // 用于用户配置功能
        const userIds = [];
        let faceDownPokers = [];

        let players = self._getReadyPlayers();
        let currentPlayerCount = players.length;
        let gamePokers = self._currentGame.start(currentPlayerCount);
        const basePoint = self.stakes[0][0];
        players.forEach((p, index) => {
            userIds.push(p.uid);

            // 下底注
            self._playerToStake(room, p, basePoint, true);

            // 发牌
            const pokers = gamePokers[index];
            p.faceDownPokers = pokers;
            p.result = new ZhaJinHuaResult(p.uid, pokers);

            // 用户配置功能: 透视
            faceDownPokers.push({
                uid: p.uid,
                pokers: pokers,
            });
        });

        self.gameRoom.fetchUserConfigs(userIds, () => {
            let luckRes = self.useLuck(players);
            console.log('luck res', luckRes);
            if (luckRes === undefined || !self.drawLottery(luckRes[1], luckRes[2])) {
                //正常
            } else {
                console.log('use luck, uid: %s', luckRes);
                let maxPlayerLuckUID = luckRes[0];
                let currentWinnerUID;
                let times = 0;
                let result = [];
                do {
                    //重新洗牌
                    result = [];
                    gamePokers = self._currentGame.start(currentPlayerCount);
                    players.forEach((p, index) => {
                        //重新发牌
                        const pokers = gamePokers[index];
                        p.faceDownPokers = pokers;
                        p.result = new ZhaJinHuaResult(p.uid, pokers);
                        result.push(p.result);
                    });
                    ZhaJinHuaGame.sortResult(result);
                    currentWinnerUID = result[0].index;
                } while (maxPlayerLuckUID !== currentWinnerUID && times < 20)

                faceDownPokers = [];
                //用户重新配置功能: 透视
                players.forEach((p) => {
                    faceDownPokers.push({
                        uid: p.uid,
                        pokers: p.result.pokers
                    });
                });
            }

            self._perspective(players, faceDownPokers);
            
            self._sendFirstTurn();
            
            self._startWaitingPlayer(room);
        });
    }
    
    _perspective(players, faceDownPokers) {
        const self = this;
        players.forEach((p) => {
            if (p.isPerspective > 0) {
                self.sendRespByChannel(p.channel, 'onPerspective', {
                    pokers: faceDownPokers,
                });
            }
        });
    }

    _sendFirstTurn () {
        const self = this;

        let payload = {
            players: null,
        }

        const players = self._getReadyPlayers();
        const ps = [];
        players.forEach((p) => {
            ps.push({
                uid: p.uid,
                stake: p.stake,
                balance: p.balance,
            });
        });
        payload.players = ps;

        self.sendResp('onFirstTurn', payload)
    }

    _startWaitingPlayer(room) {
        const self = this;

        const players = self._getReadyPlayers().filter((p) => {
            return self._canContinue(p);
        }).sort((left, right) => {
            return left.seatPosition - right.seatPosition;
        });

        players.forEach((p) => {
            p.betted = false;
        })

        // 开始等待
        self.waitPlayers = players;
        self.waitPlayerIndex = 0;
        self.waitTimeoutEvent = undefined;
        self._waitNextPlayer(room);
    }

    _canContinue(player) {
        return player.isGiveUp === false && player.isLost === false;
    }

    _isPlayerTurn(uid) {
        if (this.waitPlayers === undefined || this.waitPlayerIndex === undefined) {
            return false;
        }

        let res = this.waitPlayers[this.waitPlayerIndex - 1];

        if (!res) {
            return false;
        }

        return res.uid === uid;
    }

    _waitNextPlayer(room) {
        const self = this;

        if (self.waitTimeoutEvent !== undefined) {
            clearInterval(self.waitTimeoutEvent);
            self.waitTimeoutEvent = undefined;
        }

        const survivalPlayers = this._getSurvivalPlayers();
        // last player
        if (survivalPlayers.length === 1) {
            self.waitPlayers = undefined;
            self.waitPlayerIndex = undefined;
            self._settle(room);
            return;
        }

        // max stake
        if (self._currentTotalStake >= self.maxStake) {
            self._settle(room);
            return;
        }

        // all player finish waiting
        if (self.waitPlayerIndex >= self.waitPlayers.length) {
            self.waitPlayers = undefined;
            self.waitPlayerIndex = undefined;
            if (self._canSettle()) {
                self._settle(room);
            } else {
                self._startNextTurn(room);
            }
            return;
        }

        const player = self.waitPlayers[self.waitPlayerIndex];
        if (!self._canContinue(player)) {
            self.waitPlayerIndex++;
            self._waitNextPlayer(room);
            return;
        }
        const uid = player.uid;

        self.sendResp('onWaitPlayer', {
            uid: uid,
            peek: player.peeked,
            show_peek: this._showPeek(player),
            show_vs: this._showVS(player),
            survivor: survivalPlayers.map((p) => {
                return p.uid;
            }),
            turns: this._currentTurn,
        });

        self.waitTimeoutEvent = self.newCountdownTimer(self.configUserWaitMS, 'onWaitPlayerCountdown', () => {
            self._giveUp(room, uid);
        })
        self.waitPlayerIndex++;
    }

    _startNextTurn(room) {
        const self = this;
        self._currentTurn++;

        self._startWaitingPlayer(room);
    }

    _settle(room) {
        const self = this;

        // do settle job

        // 计算结果
        const results = [];
        const survivalPlayers = self._getSurvivalPlayers();
        survivalPlayers.forEach((p) => {
            results.push(p.result);
        });
        ZhaJinHuaGame.sortResult(results);
        let winnerPlayer;
        survivalPlayers.forEach((p) => {
            if (p.uid === results[0].index) {
                winnerPlayer = p;
            }
        });
        self.gameRoom.changeBalance(room, winnerPlayer, self._currentTotalStake);

        // 设置推送
        const players = self._getReadyPlayers();
        if (survivalPlayers.length > 1) {
            players.forEach((fromPlayer) => {
                survivalPlayers.forEach((p) => {
                    self._pushRevealPokers(fromPlayer, p);
                })
            })
        }

        // save to db
        self.gameRoom.getGameLogger().createRoomGameRound(room.id, self.gameRoom.getRoomGameId(), {
            winner_user_id: winnerPlayer.uid,
            winner_bonus: self._currentTotalStake,
        }, (roundId) => {
            players.forEach((p) => {
                self.gameRoom.getGameLogger().createRoomGameRoundUser(roundId, room.id, self.gameRoom.getRoomGameId(), p.uid, p.balance, {
                    position: p.seatPosition,
                    isLost: p.isLost,
                    isGiveUp: p.isGiveUp,
                    stake: p.stake,
                    pokers: p.faceDownPokers,
                    reveal_pokers: p.revealPokers,
                    result_type: p.result.type,
                }, () => {
                    room.updateUserBalance(p.uid, p.currentBalance, () => {
                    });
                })
            })
        })

        self._finishSettle(room, winnerPlayer);
    }

    _finishSettle(room, winnerPlayer) {
        const self = this;

        const allPlayers = this.gameRoom.getPlayers();
        Object.keys(allPlayers).forEach((uid) => {
            const p = allPlayers[uid];
            if (!p.channel) {
                return;
            }
            self.sendRespByChannel(p.channel, 'onSettle', {
                winner_uid: winnerPlayer.uid,
                winner_balance: winnerPlayer.balance,
                winner_bonus: self._currentTotalStake,
                players: p.ready ? p.revealPokers : [],
                delay: self.configSettleWaitMS,
            })
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
        })
    }

    _bet(room, uid, index) {
        const p = this.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready || p.lost) {
            console.log(`bet but not ready ${uid} ${index}`);
            return;
        }

        if (p.betted) {
          console.log(`bet but betted ${uid} ${index}`);
          return;
        }

        if (!this.lockUser(uid)) {
          console.log(`bet but can not get lock ${uid} ${index}`);
          return;
        }

        this._betAction(room, uid, index);

        this.unlockUser(uid)
    }

    _betAction(room, uid, index) {
        const player = this.gameRoom.getPlayerByUID(uid);

        // 假如未看牌，压第一组注码，已看牌压第二组注码
        const stakes = player.peeked ? this.stakes[1] : this.stakes[0];
        if (index < this._currentMinStakeIndex) {
            index = this._currentMinStakeIndex;
        } else if (index >= stakes.length) {
            index = stakes.length - 1;
        }
        const stake = stakes[index];

        if (index > this._currentMinStakeIndex) {
            this._currentMinStakeIndex = index;
        }
        player.betted = true;
        this._playerToStake(room, player, stake);

        this._waitNextPlayer(room);
    }

    _canPeek() {
        return this._currentTotalStake >= this.peekStake;
    }

    _showPeek(player) {
        return this._canPeek() && !player.peeked && !player.lost;
    }

    _peek(room, uid) {
        if (!this._canPeek()) {
            console.log("peek but current total stake no enough");
            return;
        }

        const p = this.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready || !p.result || !this._showPeek(p)) {
            return;
        }
        if (!this._isPlayerTurn(uid)) {
            return;
        }
        if (!this.lockUser(uid)) {
            return;
        }

        p.peeked = true;
        p.faceUpPokers = p.faceDownPokers;
        this.sendRespByChannel(p.channel, 'onPeek', {
            pokers: p.faceUpPokers,
            result: p.result.type,
            show_vs: this._canVS(),
        });
        this.sendResp('onPlayerPeek', {
            uid: p.uid,
        });

        this.unlockUser(uid);
    }

    _canVS() {
        return this._currentTotalStake >= this.vsStake;
    }

    _showVS(player) {
        return this._canVS() && player.peeked && !player.lost;
    }

    _vs(room, fromUid, toUid) {
        if (!this._canVS()) {
            console.log("vs but current total stake no enough");
            return;
        }
        const fromPlayer = this.gameRoom.getPlayerByUID(fromUid);
        if (!fromPlayer || !fromPlayer.ready || !fromPlayer.result || !this._showVS(fromPlayer)) {
            return;
        }
        const toPlayer = this.gameRoom.getPlayerByUID(toUid);
        if (!toPlayer || !toPlayer.ready || !toPlayer.result) {
            return;
        }
        if (!this._isPlayerTurn(fromUid)) {
            return;
        }
        if (!this.lockUser(fromUid)) {
            return;
        }

        // 对比结果
        let winnerPlayer;
        let lostPlayer;
        if (ZhaJinHuaGame.compareResult(fromPlayer.result, toPlayer.result) < 0) {
            winnerPlayer = fromPlayer;
            lostPlayer = toPlayer;
        } else {
            winnerPlayer = toPlayer;
            lostPlayer = fromPlayer;
        }

        // 放入可看牌中
        this._pushRevealPokers(winnerPlayer, lostPlayer);
        this._pushRevealPokers(lostPlayer, winnerPlayer);

        // 推送结果
        lostPlayer.isLost = true;
        const payload = {
            from_uid: fromPlayer.uid,
            to_uid: toPlayer.uid,
            winner_uid: winnerPlayer.uid,
            delay: this.configUserVSMS,
        }

        this.sendResp('onVS', payload);

        const self = this;
        setTimeout(() => {
            self.unlockUser(fromUid);
            self._waitNextPlayer(room);
        }, this.configUserVSMS);
    }

    _giveUp(room, uid) {
        const p = this.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return;
        }

        if (!this._isPlayerTurn(uid)) {
            return;
        }

        if (!this.lockUser(uid)) {
            return;
        }

        this._giveUpAction(room, uid);

        this.unlockUser(uid);
    }

    _giveUpAction(room, uid) {
        const p = this.gameRoom.getPlayerByUID(uid);
        p.isGiveUp = true;
        this.sendResp('onGiveUp', {
            uid: uid,
        })
        this._waitNextPlayer(room);
    }

    _end(room, isClean) {
        this.gameRoom.end(room, isClean, this.configEndWaitMS);
    }

    _pushRevealPokers(player, targetPlayer) {
        player.revealPokers.push({
            uid: targetPlayer.uid,
            pokers: targetPlayer.faceDownPokers,
            result: targetPlayer.result.type,
        })
    }

    _getReadyPlayers() {
        return this.gameRoom.getReadyPlayers();
    }

    _getSurvivalPlayers() {
        const players = this._getReadyPlayers();
        return players.filter((p) => {
            return this._canContinue(p);
        });
    }

    _getSurvivalPlayer() {
        return this._getSurvivalPlayers().length;
    }

    _canReady(room) {
        return room.status === ROOM_STATUS.WAITING || room.status === ROOM_STATUS.READY
    }

    _canStart (room, user) {
        if (room.status !== ROOM_STATUS.WAITING && room.status !== ROOM_STATUS.READY) {
            return false;
        }

        const readyPlayers = this._getReadyPlayers()
        if (readyPlayers.length < 2) {
            return false;
        }

        return true;
    }

    _canSettle() {
        // last player
        if (this._getSurvivalPlayer() === 1) {
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

    _playerToStake(room, player, stake) {
        player.stake += stake;
        this.gameRoom.changeBalance(room, player, -1 * stake);
        this._currentTotalStake += stake;

        this.sendResp('onBet', {
            uid: player.uid,
            current_stake: stake,
            player_stake: player.stake,
            balance: player.balance,
            min_stake: this._currentMinStakeIndex,
            total_stake: this._currentTotalStake,
        })
    }

    _fetchGameConfigs(room) {
        const self = this

        room.fetchGameConfigs((err, results) => {
            results.forEach((row) => {
                switch (row.name) {
                    case 'READY_WAIT_MS':
                        self.configReadyWaitMS = parseInt(row.value);
                        break;
                    case 'START_WAIT_MS':
                        self.configStartWaitMS = parseInt(row.value);
                        break;
                    case 'USER_WAIT_MS':
                        self.configUserWaitMS = parseInt(row.value);
                        break;
                    case 'USER_VS_MS':
                        self.configUserVSMS = parseInt(row.value);
                        break;
                    case 'SETTLE_WAIT_MS':
                        self.configSettleWaitMS = parseInt(row.value);
                        break;
                    case 'END_WAIT_MS':
                        self.configEndWaitMS = parseInt(row.value);
                        break;
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
                const p = this.gameRoom.getPlayerByUID(uid);
                if (!p) {
                    return;
                }
                p.luck = parseInt(row.luck);
                p.isPerspective = parseInt(row.is_perspective);
                if (p.isPerspective > 0) {
                    self.sendRespByChannel(p.channel, 'onPerspective', {
                        pokers: faceDownPokers,
                    });
                }
            })
        })
    }
}

module.exports = ZhaJinHua;