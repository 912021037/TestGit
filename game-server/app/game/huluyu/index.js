const ROOM_STATUS = require('../../constants/model').ROOM_STATUS;
const BaseGame = require('../baseGame');
const GameRoom = require('../gameRoom');
const HuLuYuGame = require('../../../../shared/game/dice/HuLuYu').HuLuYu;
const GAME_PHASE = require('./constants').GAME_PHASE;
const BANKER_MODE = require('./constants').BANKER_MODE;
const GAME_RULE = require('./constants').GAME_RULE;
const GAME_PLAY = require('./constants').GAME_PLAY;
const GAME_PLAY_MAP = require('./constants').GAME_PLAY_MAP;
const REVEAL_TYPE = require('./constants').REVEAL_TYPE;
const BankerModeFreeBanker = require('./bankerModes/freeBanker');
const BankerModeFixedBanker = require('./bankerModes/fixedBanker');
const BankerModeRoomOwner = require('./bankerModes/roomOwner');

class HuLuYu extends BaseGame {
    constructor(channel) {
        super(channel)
        this.gameRoom = null

        // 房间配置
        this.mode = 0;                      // 模式
        this.dicesQuantity = 0;             // 骰子数目
        this.bankerMode = 0;                // 庄家模式
        this.playerCount = 0;               // 最大玩家人数限制
        this.maxPoint = 0;                  // 最大分数
        this.stakes = [10,20,30,50,100];    // 筹码类型
        this.rule = '';                     // 规则
        this.gameplays = [];                // 玩法
        this.totalRound = 0;                // 共几局

        // 系统配置
        this.configs = {
            TWO_DICE_PROBABILITY: [[]],         // 二骰概率
            TWO_DICE_ONE_ODDS: 1,               // 二骰中1赔率
            TWO_DICE_TWO_ODDS: 4,               // 二骰中2赔率
            THREE_DICE_PROBABILITY: [[]],       // 三骰概率
            THREE_DICE_ONE_ODDS: 1,             // 三骰中1赔率
            THREE_DICE_TWO_ODDS: 2,             // 三骰中2赔率
            THREE_DICE_THREE_ODDS: 3,           // 三骰中3赔率
            ER_ZHONG_ER_TWO_ODDS: 5,            // 二中二中2赔率
            ER_ZHONG_ER_THREE_ODDS: 8,          // 二中二中3赔率
            BAO_ZI_ODDS: 100,                   // 豹子赔率
            READY_WAIT_MS: 3000,                // 准备后倒数毫秒数
            START_WAIT_MS: 100,                 // 开始游戏后延迟毫秒数
            USER_COMPETE_BANKER_WAIT_MS: 9000,  // 等待玩家抢庄毫秒数
            ON_BANKER_WAIT_MS: 3500,            // 等待玩家查看选庄结果毫秒数
            ROCK_DICE_WAIT_MS: 6000,            // 等待摇骰毫秒数
            USER_BET_WAIT_MS: 12000,            // 等待玩家投注毫秒数
            REVEAL_WAIT_MS: 3000,               // 等待开骰毫秒数
            SETTLE_WAIT_MS: 4000,               // 等待玩家查看结果毫秒数
            END_WAIT_MS: 3000,                  // 最后一盘结束延迟毫秒数
        };

        // 房间局部变量
        this._currentGame = null;
        this._currentLogs = [];
        this._currentResult = null;
        this._currentGamePhase = null;
        this._currentTotalStake = 0;
    }

    onInit (room) {
        const o = room.options;
        this.mode = room.mode;
        this.dicesQuantity = parseInt(o.dices);
        this.bankerMode = o.banker;
        this.playerCount = parseInt(o.player);
        this.maxPoint = parseInt(o.max_point);
        this.rule = o.rule;
        for (let k in o.game_play) {
            this.gameplays.push(o.game_play[k]);
        }
        this.totalRound = o.round_price[0];
        this.gameRoom = GameRoom(this, this.playerCount);

        this.bankerModeRunner = null;
        switch(this.bankerMode) {
            case BANKER_MODE.FREE_BANKER:
                this.bankerModeRunner = new BankerModeFreeBanker(this);
                break
            case BANKER_MODE.FIXED_BANKER:
                this.bankerModeRunner = new BankerModeFixedBanker(this);
                break
            case BANKER_MODE.ROOM_OWNER:
                this.bankerModeRunner = new BankerModeRoomOwner(this, room);
                break
        }
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
            return;
        }

        switch (request.action) {
            case 'sync':
                this._sync(room, user);
                break;
            case 'ready':
                this._ready(room, user);
                break;
            case 'rock':
                this._rockDices(room, user.uid);
                break;
            case 'finishRock':
                this._finishWaitRockDice(room);
                break;
            case 'bet':
                this._bet(room, user.uid, parseInt(request.gameplay), request.face, parseInt(request.stake));
                break;
            case 'finishBet':
                this._finishBet(room, user.uid);
                break;
            case 'reveal':
                this._reveal(room, user.uid, parseInt(request.reveal));
                break;
            case 'queryBet':
                this._queryBet(room, user.uid, parseInt(request.uid));
                break;
            case 'queryLogs':
                this._queryLogs(room, user.uid);
                break;
            case 'magicRock':
                this._magicRockDices(room, user.uid);
                break;
        }

        this.bankerModeRunner.onUserRequest(room, user, request);
    }

    _sync (room, user) {
        const self = this;

        let payload = {
            room_sn: room.sn,
            room_owner: room.user_id,
            room_game_id: self.gameRoom.getRoomGameId(),
            room_status: room.status,
            rounds: self.gameRoom.getCurrentRounds(),
            viewers: null,
            // 游戏数据开始
            players: null,
            result: null,
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
                });
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
                total: p.totalStakes,
                stakes: p.stakes,
            }
            players.push(data);
        }
        payload.players = players;

        self.bankerModeRunner.onSync(payload);

        self.sendRespByChannel(user.channel, 'onSync', payload);
    }

    _ready (room, user) {
        if (!this._canReady(room)) {
            console.log('ready but status not allow, status: %s', room.status)
            return;
        }

        this.gameRoom.ready(room, user, this._canStart.bind(this), this._start.bind(this), this.configs.READY_WAIT_MS);
    }

    _start (room, user) {
        const self = this;

        if (self.isGameStarted) {
            return;
        }
        self.isGameStarted = true;

        room.changeStatus(ROOM_STATUS.GAMING, () => {
            self._begin(room);
        });
    }

    _begin (room) {
        const self = this;

        this.sendResp('onStart');

        setTimeout(() => {
            self._startNewRound(room);
        }, self.configs.START_WAIT_MS);
    }

    _startNewRound (room) {
        this._currentGame = null;
        this._currentResult = null;
        this._currentTotalStake = 0;
        this.gameRoom.increaseCurrentRounds();

        const players = this.gameRoom.getPlayers();
        for(let uid in players) {
            let player = players[uid];
            player.totalStakes = 0;
            player.stakes = {
                dan: {},
                erZhongEr: [],
                baoZi: {},
            }
            player.betted = false;
            this.bankerModeRunner.onInitNewRoundPlayer(player);
        }

        this.sendResp('onNewRound', {
            rounds: this.gameRoom.getCurrentRounds(),
        });

        this.bankerModeRunner.onStartNewRound(room);

        this._fetchUserConfigs();
    }

    _startWaitRockDice(room) {
        const self = this;

        self._currentGamePhase = GAME_PHASE.ROCKING;
        self.rockDiceCountDownTimer = self.newCountdownTimer(self.configs.ROCK_DICE_WAIT_MS, 'onRockDiceCountdown', () => {
            self._finishWaitRockDice(room);
        });
    }

    _finishWaitRockDice(room) {
        const self = this;

        if (self._currentGamePhase !== GAME_PHASE.ROCKING) {
            return;
        }

        if (self.rockDiceCountDownTimer !== undefined) {
            clearInterval(self.rockDiceCountDownTimer);
            self.rockDiceCountDownTimer = undefined;
        }

        if (self._currentResult === null) {
            self._rockDices(room, this.bankerModeRunner.getCurrentBankerUID(), true);
        }

        self._currentGamePhase = GAME_PHASE.BET;

        self._startWaitBet(room);
    }

    _rockDices(room, uid, isAutoRock) {
        // 检查是否允许摇骰
        if (uid !== this.bankerModeRunner.getCurrentBankerUID()) {
            console.error('not banker but rock dice, banker: %s, uid: %s', this.bankerModeRunner.getCurrentBankerUID(), uid);
            return;
        }
        if (this._currentGamePhase !== GAME_PHASE.ROCKING) {
            console.error('game phase not allow rock, phase: %s', this._currentGamePhase);
            return;
        }
        //2骰允许多摇
        const allowManyTimes = this.dicesQuantity === 2 || this.rule === GAME_RULE.ROCK_ANY;
        if (this._currentResult !== null && !allowManyTimes) {
            console.error('not rock any but rock any, %s, %s', uid, this.rule);
            return;
        }

        this.sendResp('onRock', {
            uid: uid,
        });

        this._rockDicesAction();

        if (!allowManyTimes && !isAutoRock) {
            this._finishWaitRockDice(room);
        }
    }

    _magicRockDices(room, uid) {
        // 检查是否允许摇骰
        const p = this.gameRoom.getPlayerByUID(uid);
        if (!p.isPerspective) {
            console.error('not perspective but magic rock uid: %s', uid);
            return;
        }
        if (this._currentGamePhase !== GAME_PHASE.ROCKING && this._currentGamePhase !== GAME_PHASE.BET) {
            console.error('game phase not allow magic rock, phase: %s', this._currentGamePhase);
            return;
        }

        this._rockDicesAction();
    }

    _rockDicesAction() {
        // 摇骰
        if (this.dicesQuantity === 2) {
            this._currentGame = new HuLuYuGame(this.configs.TWO_DICE_PROBABILITY);
        } else if (this.dicesQuantity === 3){
            this._currentGame = new HuLuYuGame(this.configs.THREE_DICE_PROBABILITY);
        } else {
            const faces = 6;
            const probabilities = [];
            const p = 1 / faces;
            for (let i = 0; i < this.dicesQuantity; i++) {
                const ps = [];
                for (let j = 0; j < faces; j++) {
                    ps.push(p);
                }
                probabilities.push(ps);
            }
            this._currentGame = new HuLuYuGame(probabilities);
        }
        const result = this._currentGame.start();
        this._currentResult = result;

        // 公布结果
        const players = this._getReadyPlayers();
        players.forEach((p) => {
            if (!p.isPerspective) {
                return;
            }
            this.sendRespByChannel(p.channel, 'onPerspective', {
                result: this._buildResult(result),
            });
        });
    }

    _startWaitBet(room) {
        const self = this;

        self._currentGamePhase = GAME_PHASE.BET;
        self.betCountDownTimer = self.newCountdownTimer(self.configs.USER_BET_WAIT_MS, 'onBetCountdown', () => {
            self._finishWaitBet(room);
        });
    }

    _finishWaitBet(room) {
        const self = this;

        if (self._currentGamePhase !== GAME_PHASE.BET) {
            return;
        }
        self._currentGamePhase = GAME_PHASE.REVEAL;

        if (self.betCountDownTimer !== undefined) {
            clearInterval(self.betCountDownTimer);
            self.betCountDownTimer = undefined;
        }

        self._startWaitReveal(room);
    }

    _startWaitReveal(room) {
        const self = this;
        self._currentGamePhase = GAME_PHASE.REVEAL;
        self.revealCountDownTimer = self.newCountdownTimer(self.configs.REVEAL_WAIT_MS, 'onRevealCountdown', () => {
            self._reveal(room, self.bankerModeRunner.getCurrentBankerUID(), REVEAL_TYPE.QUICK);
        });
    }

    _reveal(room, uid, reveal) {
        if (uid !== this.bankerModeRunner.getCurrentBankerUID()) {
            console.error('no banker but reveal %s', uid);
            return;
        }
        if (this._currentGamePhase !== GAME_PHASE.REVEAL) {
            console.error('reveal but phase not allow %s', this._currentGamePhase);
            return;
        }
        this._currentGamePhase = GAME_PHASE.SETTLE;

        if (this.revealCountDownTimer !== undefined) {
            clearInterval(this.revealCountDownTimer);
            this.revealCountDownTimer = undefined;
        }

        this._settle(room, reveal);
    }

    _settle(room, revealType) {
        const configs = this.configs;
        const result = this._currentResult;

        // 玩家赔付
        let bankerBonus = 0;
        const responsePlayers = [];
        const players = this._getReadyPlayers();
        players.forEach((p) => {
            if (p.totalStakes <= 0) {
                return;
            }

            let bonus = 0;

            // 处理单押
            const dan = p.stakes.dan;
            if (Object.keys(dan).length > 0) {
                for (let face in dan) {
                    const num = result.getFaceNum(parseInt(face));

                    let odds = 0;
                    if (this.dicesQuantity === 2) {
                        if (num === 1) {
                            odds = configs.TWO_DICE_ONE_ODDS;
                        } else if (num === 2) {
                            odds = configs.TWO_DICE_TWO_ODDS;
                        }
                    } else {
                        if (num === 1) {
                            odds = configs.THREE_DICE_ONE_ODDS;
                        } else if (num === 2) {
                            odds = configs.THREE_DICE_TWO_ODDS;
                        } else if (num === 3) {
                            odds = configs.THREE_DICE_THREE_ODDS;
                        }
                    }
                    const stake = dan[face];
                    if (odds > 0) {
                        bonus += stake * odds;
                    } else {
                        bonus -= stake;
                    }
                }
            }

            // 处理二中二
            const erZhongEr = p.stakes.erZhongEr;
            if (erZhongEr.length > 0) {
                erZhongEr.forEach((data) => {
                    const stake = data[2];
                    let win = true;
                    let moreThanTwo = false;
                    for (let i = 0; i < 2; i++) {
                        const face = data[i];
                        const num = result.getFaceNum(parseInt(face));
                        if (num <= 0) {
                            win = false;
                        }
                        if (num >= 2) {
                            moreThanTwo = true;
                        }
                    }

                    let odds = 0;
                    if (win) {
                        if (moreThanTwo) {
                            odds = configs.ER_ZHONG_ER_THREE_ODDS;
                        } else {
                            odds = configs.ER_ZHONG_ER_TWO_ODDS;
                        }
                    }

                    if (odds > 0) {
                        bonus += stake * odds;
                    } else {
                        bonus -= stake;
                    }
                });
            }

            // 处理豹子
            const baoZi = p.stakes.baoZi;
            if (Object.keys(baoZi).length > 0) {
                for (let face in baoZi) {
                    const stake = baoZi[face];
                    const num = result.getFaceNum(parseInt(face));
                    let odds = 0;
                    if (num >= this.dicesQuantity) {
                        odds = configs.BAO_ZI_ODDS;
                    }
                    if (odds > 0) {
                        bonus += stake * odds;
                    } else {
                        bonus -= stake;
                    }
                }
            }

            this.gameRoom.changeBalance(room, p, bonus);
            responsePlayers.push({
                uid: p.uid,
                bonus: bonus,
                balance: p.balance,
            });

            bankerBonus -= bonus;
        });

        // 庄家赔付
        const banker = this.gameRoom.getPlayerByUID(this.bankerModeRunner.getCurrentBankerUID());
        this.gameRoom.changeBalance(room, banker, bankerBonus);
        responsePlayers.push({
            uid: banker.uid,
            bonus: bankerBonus,
            balance: banker.balance,
        });

        let roundData = this.bankerModeRunner.buildSettleRoundData(room);

        this._finishSettle(room, responsePlayers, roundData, revealType);
    }

    _finishSettle(room, responsePlayers, roundData, revealType) {
        const self = this;

        // save to db
        const resOutput = self._buildResult(self._currentResult);
        roundData['result'] = resOutput;
        self.gameRoom.getGameLogger().createRoomGameRound(room.id, self.gameRoom.getRoomGameId(), roundData, (roundId) => {
            responsePlayers.forEach((data) => {
                const p = self.gameRoom.getPlayerByUID(data.uid);
                self.gameRoom.getGameLogger().createRoomGameRoundUser(roundId, room.id, self.gameRoom.getRoomGameId(), p.uid, p.balance, {
                    position: p.seatPosition,
                    bonus: data.bonus,
                    stakes: p.stakes,
                }, () => {
                    room.updateUserBalance(p.uid, p.currentBalance, () => {
                    })
                })
            })
        })

        this._currentLogs.push(resOutput);
        this.sendResp('onSettle', {
            reveal_type: revealType,
            reveal_delay: self.configs.REVEAL_WAIT_MS,
            result: resOutput,
            players: responsePlayers,
            settle_delay: self.configs.SETTLE_WAIT_MS,
        });

        // const players = self.gameRoom.getPlayers();
        // for(let uid in players) {
        //     const p = players[uid];
        //     if (p.ready === false) {
        //         continue;
        //     }
        //     p.ready = false;
        //     self.gameRoom.unReady(p.uid);
        // }

        room.changeStatus(ROOM_STATUS.WAITING, () => {
            self.isGameStarted = false;

            if (self._canEnd()) {
                console.log('current rounds equal total rounds, end game');
                self._end(room);
                return;
            }
        });
    }

    _bet(room, uid, gamePlay, face, stake) {
        const self = this;

        if (self._currentGamePhase !== GAME_PHASE.BET) {
            console.log('no bet phase, current: %s', self._currentGamePhase);
            return;
        }

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return;
        }

        if (p.totalStakes + stake > self.maxPoint) {
            console.log('max point limit, current: %s, stake: %s, limit: %s', p.totalStakes, stake, self.maxPoint);
            return;
        }

        if (p.uid === self.bankerModeRunner.getCurrentBankerUID()) {
            console.log('banker but bet, %s', p.uid);
            return;
        }

        if (!self.lockUser(uid)) {
            return;
        }

        self._betAction(room, uid, gamePlay, face, stake);

        self.unlockUser(uid);
    }

    _betAction(room, uid, gameplay, face, stake) {
        const self = this
        const p = self.gameRoom.getPlayerByUID(uid);
        p.logged = true;
        p.totalStakes += stake;
        self._currentTotalStake += stake;

        if (gameplay === GAME_PLAY_MAP.DAN) {
            const stakes = p.stakes.dan;
            if (stakes[face] === undefined) {
                stakes[face] = 0;
            }
            stakes[face] += stake;
        } else if (gameplay === GAME_PLAY_MAP.ER_ZHONG_ER) {
            if (this.gameplays.indexOf(GAME_PLAY.ER_ZHONG_ER) < 0) {
                console.error('not allow gameplay %s, %s', GAME_PLAY.ER_ZHONG_ER, this.gameplays);
                return;
            }
            if (!(face instanceof Array) || face.length < 2) {
                console.error('bet er zhong er but face not array %s', face);
                return;
            }
            p.stakes.erZhongEr.push([
                face[0],
                face[1],
                stake,
            ]);
        } else if (gameplay === GAME_PLAY_MAP.BAO_ZI) {
            if (this.gameplays.indexOf(GAME_PLAY.BAO_ZI) < 0) {
                console.error('now allow gameplay %s, %s', GAME_PLAY.BAO_ZI, this.gameplays);
                return;
            }
            const stakes = p.stakes.baoZi;
            if (stakes[face] === undefined) {
                stakes[face] = 0;
            }
            stakes[face] += stake;
        } else {
            console.error('invalid gameplay %s', gameplay);
            return;
        }

        self.sendResp('onBet', {
            uid: p.uid,
            gameplay: gameplay,
            face: face,
            stake: stake,
            total: p.totalStakes,
            stakes: p.stakes,
            b_total: self._currentTotalStake,
        });
    }

    _finishBet(room, uid) {
        const self = this;

        if (self._currentGamePhase !== GAME_PHASE.BET) {
            console.log('no finish bet phase, current: %s', self._currentGamePhase);
            return;
        }

        const p = self.gameRoom.getPlayerByUID(uid);
        if (!p || p.betted) {
            console.log('player betted, current: %s', uid);
            return;
        }
        p.betted = true;
        this.sendResp('onFinishBet', {
            uid: uid,
        })

        let isEveryBodyBetted = true;
        const players = this.gameRoom.getPlayers()
        for (let uid in players) {
            const p = players[uid]
            if (p.seatPosition !== undefined 
                && p.seatPosition >= 0 
                && p.ready 
                && p.uid !== this.bankerModeRunner.getCurrentBankerUID() 
                && p.betted !== true) {
                    isEveryBodyBetted = false;
                    break;
            }
        }
        if (isEveryBodyBetted) {
            self._finishWaitBet(room);
        }
    }

    _queryBet(room, fromUID, queryUID) {
        const player = this.gameRoom.getPlayerByUID(fromUID);
        if (!player) {
            console.error('can not get player but request %s', fromUID);
            return;
        }

        const queryPlayer = this.gameRoom.getPlayerByUID(queryUID);
        if (!queryPlayer) {
            console.error('query bet but player not exist %s', queryUID);
            return;
        }
        if (queryUID !== this.bankerModeRunner.getCurrentBankerUID()) {
            this.sendRespByChannel(player.channel, 'onQueryBet', {
                uid: queryPlayer.uid,
                nickname: queryPlayer.nickname,
                total: queryPlayer.totalStakes,
                stakes: queryPlayer.stakes,
            });
            return
        }

        const players = this.gameRoom.getReadyPlayers();
        const stakes = {
            dan: {},
            erZhongEr: [],
            baoZi: {},
        };
        players.forEach((p) => {
            const s = p.stakes;
            for (let k in s.dan) {
                if (!stakes.dan[k]) {
                    stakes.dan[k] = s.dan[k];
                } else {
                    stakes.dan[k] += s.dan[k];
                }
            }
            s.erZhongEr.forEach((data) => {
                stakes.erZhongEr.push(data);
            });
            for (let k in s.baoZi) {
                if (!stakes.baoZi[k]) {
                    stakes.baoZi[k] = s.baoZi[k];
                } else {
                    stakes.baoZi[k] += s.baoZi[k];
                }
            }
        });

        this.sendRespByChannel(player.channel, 'onQueryBet', {
            uid: queryPlayer.uid,
            nickname: queryPlayer.nickname,
            total: this._currentTotalStake,
            stakes: stakes,
        });
    }

    _queryLogs(room, uid) {
        const player = this.gameRoom.getPlayerByUID(uid);
        if (!player) {
            console.error('can not get player but request %s', uid);
            return;
        }
        this.sendRespByChannel(player.channel, 'onQueryLogs', {
            logs: this._currentLogs,
        });
    }

    _end (room, isClean) {
        this.gameRoom.end(room, isClean, this.configs.END_WAIT_MS);
    }

    _buildResult(result) {
        return result.getDices();
    }

    _getReadyPlayers () {
        return this.gameRoom.getReadyPlayers();
    }

    _canReady(room) {
        return room.status === ROOM_STATUS.WAITING || room.status === ROOM_STATUS.READY;
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
            return false;
        }

        const readyPlayers = this._getReadyPlayers();
        if (readyPlayers.length < 2) {
            return false;
        }

        return true;
    }

    _canEnd() {
        if (this.gameRoom.getCurrentRounds() < this.totalRound) {
            return false;
        }

        return true;
    }

    _fetchGameConfigs(room) {
        const self = this

        const c = self.configs;
        room.fetchGameConfigs((err, results) => {
            results.forEach((row) => {
                switch (row.name) {
                    case 'TWO_DICE_PROBABILITY':
                        c.TWO_DICE_PROBABILITY = JSON.parse(row.value);
                        break
                    case 'TWO_DICE_ONE_ODDS':
                        c.TWO_DICE_ONE_ODDS = JSON.parse(row.value);
                        break
                    case 'TWO_DICE_TWO_ODDS':
                        c.TWO_DICE_TWO_ODDS = JSON.parse(row.value);
                        break
                    case 'THREE_DICE_PROBABILITY':
                        c.THREE_DICE_PROBABILITY = JSON.parse(row.value)
                        break
                    case 'THREE_DICE_ONE_ODDS':
                        c.THREE_DICE_ONE_ODDS = JSON.parse(row.value)
                        break
                    case 'THREE_DICE_TWO_ODDS':
                        c.THREE_DICE_TWO_ODDS = JSON.parse(row.value)
                        break
                    case 'THREE_DICE_THREE_ODDS':
                        c.THREE_DICE_THREE_ODDS = JSON.parse(row.value)
                        break
                    case 'ER_ZHONG_ER_TWO_ODDS':
                        c.ER_ZHONG_ER_TWO_ODDS = JSON.parse(row.value)
                        break
                    case 'ER_ZHONG_ER_THREE_ODDS':
                        c.ER_ZHONG_ER_THREE_ODDS = JSON.parse(row.value)
                        break
                    case 'BAO_ZI_ODDS':
                        c.BAO_ZI_ODDS = JSON.parse(row.value)
                        break
                    case 'READY_WAIT_MS':
                        c.READY_WAIT_MS = parseInt(row.value)
                        break
                    case 'START_WAIT_MS':
                        c.START_WAIT_MS = parseInt(row.value);
                        break;
                    case 'USER_COMPETE_BANKER_WAIT_MS':
                        c.USER_COMPETE_BANKER_WAIT_MS = parseInt(row.value)
                        break
                    case 'ON_BANKER_WAIT_MS':
                        c.ON_BANKER_WAIT_MS = parseInt(row.value)
                        break
                    case 'ROCK_DICE_WAIT_MS':
                        c.ROCK_DICE_WAIT_MS = parseInt(row.value)
                        break
                    case 'USER_BET_WAIT_MS':
                        c.USER_BET_WAIT_MS = parseInt(row.value)
                        break
                    case 'REVEAL_WAIT_MS':
                        c.REVEAL_WAIT_MS = parseInt(row.value)
                        break
                    case 'SETTLE_WAIT_MS':
                        c.SETTLE_WAIT_MS = parseInt(row.value)
                        break
                    case 'END_WAIT_MS':
                        c.END_WAIT_MS = parseInt(row.value)
                        break
                }
            })
        })
    }

    _fetchUserConfigs() {
        const self = this;

        // 用于用户配置功能
        const userIds = [];

        let players = self._getReadyPlayers();
        players.forEach((player) => {
            userIds.push(player.uid);
        });

        // 获取用户配置
        self.gameRoom.fetchUserConfigs(userIds, () => {
            // do nothings;
        });
    }
}

module.exports = HuLuYu;