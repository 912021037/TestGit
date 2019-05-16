const GAME_STATUS = require('../constants').GAME_STATUS;
const Utils = require('./utils');
const ResultType = require('../../../../../shared/game/poker/NiuNiu').ResultType;

class NiuNiuShangZhuang {
    constructor(niuniu) {
        this.game = niuniu;
        this._currentBankerUID = 0;
        this._currentBankerMultiple = 0;
    }

    onUserRequest(room, user, request) {
        // do nothings
    }

    onSync(payload) {
        payload.current_banker_uid = this._currentBankerUID;
        payload.current_banker_multiple = this._currentBankerMultiple;
    }

    /**庄家准备了才返回true */
    canStart(readyPlayers) {
        //如果是第一局，还没有决定过庄家，直接return true
        if (this._currentBankerUID == 0) {
            return true;
        }

        //如果上述为假，则已经有庄家，庄家准备了才能开始
        for (let i = 0; i < readyPlayers.length; i++) {
            if (readyPlayers[i].uid === this._currentBankerUID) {
                return true;
            }
        }

        //庄家没有准备
        return false;
    }

    onInitNewRoundPlayer(player) {
        // do nothings
    }

    onStartNewRound(room) {
        // do nothings
    }

    /**发牌后直接发庄家id，没有抢庄环节 */
    onFinishDealPokers(room) {
        this._startBankerMultiple(room);
    }

    getCurrentBankerUID() {
        return this._currentBankerUID;
    }

    /**根据结果计算输赢
     * 这里要判断第一位赢家是否为牛牛，改变庄家 */
    buildSettlePlayerData(room) {
        const self = this;
        const niuniu = this.game;

        // do settle job
        const bankerIndex = Utils.getBankerResultIndex(niuniu._currentResults, self._currentBankerUID);
        const bankerResult = niuniu._currentResults[bankerIndex];
        
        const playersData = [];
        const bankerPlayer = niuniu.gameRoom.getPlayerByUID(self._currentBankerUID);
        let bankerBonus = 0;
        niuniu._currentResults.forEach((res, index) => {
            if (res.index === self._currentBankerUID) {
                return;
            }
            const p = niuniu.gameRoom.getPlayerByUID(res.index);
            
            // 计算赔率
            let bonusRuleMultiple;
            if (index < bankerIndex) {
                // win
                bonusRuleMultiple = niuniu.bonusRule[res.type];
            } else {
                // lose
                bonusRuleMultiple = niuniu.bonusRule[bankerResult.type];
            }
            if (bonusRuleMultiple === undefined) {
                bonusRuleMultiple = 1;
            }
            const bonus = p.playerMultiple * niuniu.basePoint * bonusRuleMultiple;
            
            let pushBonus;
            if (index < bankerIndex) {
                // win
                p.balance += bonus;
                pushBonus = bonus;
                bankerPlayer.balance -= bonus;
                bankerBonus -= bonus;
            } else {
                // lose
                p.balance -= bonus;
                pushBonus = 0 - bonus;
                bankerPlayer.balance += bonus;
                bankerBonus += bonus;
            }
            
            playersData.push({
                uid: res.index,
                bonus: pushBonus,
                balance: p.balance,
            });
        });
        playersData.push({
            uid: self._currentBankerUID,
            bonus: bankerBonus,
            balance: bankerPlayer.balance
        });

        const winnerResult = niuniu._currentResults[0];
        if (winnerResult.type >= ResultType.NIU_10) {
            self._currentBankerUID = winnerResult.index;
        }
        
        return playersData;
    }

    buildSettleRoundData() {
        return {
            banker_uid: this._currentBankerUID,
            banker_multiple: this._currentBankerMultiple,
        };
    }

    onFinishSettle(room) {
        // do nothings
    }

    /**开始抢庄环节倒计时，更改game status，倒计时结束后运行_finishcompeteBanker(room) */
    _startBankerMultiple(room) {
        const self = this;
        const niuniu = this.game;
    
        niuniu._currentGameStatus = GAME_STATUS.COMPLETING_BANKER;

        if (self._currentBankerUID === 0) {
            //如果没有bankeruid说明在第一局，没有抢庄阶段，随机一位仁兄坐庄
            self._finishcompeteBanker(room);
        } else {
            //否则直接决定banker，因为已经在settle中根据点数决定了下一局的庄家
            self._decideBanker(room, self._currentBankerUID);
        }
    }

    /**去除通过倍数筛选的步骤，直接全部1倍然后随机选庄 */
    _finishcompeteBanker(room) {
        const self = this;
        const niuniu = this.game;

        if (niuniu._currentGameStatus !== GAME_STATUS.COMPLETING_BANKER) {
            return;
        }
        
        // auto compete banker
        const players = niuniu._getReadyPlayers();
        
        // decide banker
        const userIds = [];
        for(let i = 0; i < players.length; i++) {
            const p = players[i];
            userIds.push(p.uid);
        }
        
        let index = niuniu.randomNum(0, userIds.length - 1);
        self._decideBanker(room, userIds[index]);
    }
    
    _decideBanker(room, uid) {
        const self = this;
        const niuniu = this.game;
        
        const player = niuniu.gameRoom.getPlayerByUID(uid);
        self._currentBankerUID = player.uid;

        niuniu.sendResp('onBanker', {
            uid: player.uid,
            delay: niuniu.configOnBankerWaitMS,
            multiple: self._currentBankerMultiple
        });
        
        setTimeout(() => {
            niuniu._currentGameStatus = GAME_STATUS.BET;
            niuniu._startWaitBet(room);
        }, niuniu.configOnBankerWaitMS);
    }
}

module.exports = NiuNiuShangZhuang;