const GAME_STATUS = require('../constants').GAME_STATUS
const Utils = require('./utils')

class MingPaiQiangZhuang {
    constructor(niuniu) {
        this.game = niuniu
        this._currentBankerUID = 0
        this._currentBankerMultiple = 1
    }

    onUserRequest(room, user, request) {
        switch (request.action) {
            case 'competeBanker':
                this._competeBanker(room, user.uid, parseInt(request.multiple))
                break
        }
    }

    onSync(payload) {
        payload.current_banker_uid = this._currentBankerUID
        payload.current_banker_multiple = this._currentBankerMultiple
    }

    canStart(readyPlayers) {
        return true
    }

    onInitNewRoundPlayer(player) {
        player.competedBanker = false
        player.bankerMultiple = 1
    }

    onStartNewRound(room) {
        this._currentBankerUID = 0
        this._currentBankerMultiple = 1
    }

    onFinishDealPokers(room) {
        this._startcompeteBanker(room)
    }

    getCurrentBankerUID() {
        return this._currentBankerUID
    }

    buildSettlePlayerData(room) {
        const self = this
        const niuniu = this.game

        // do settle job
        const bankerIndex = Utils.getBankerResultIndex(niuniu._currentResults, self._currentBankerUID)
        const bankerResult = niuniu._currentResults[bankerIndex]

        const playersData = []
        const bankerPlayer = niuniu.gameRoom.getPlayerByUID(self._currentBankerUID);
        let bankerBonus = 0
        niuniu._currentResults.forEach((res, index) => {
            if (res.index === self._currentBankerUID) {
                return
            }
            const p = niuniu.gameRoom.getPlayerByUID(res.index);

            // 计算赔率
            let bonusRuleMultiple
            if (index < bankerIndex) {
                // win
                bonusRuleMultiple = niuniu.bonusRule[res.type]
            } else {
                // lose
                bonusRuleMultiple = niuniu.bonusRule[bankerResult.type]
            }
            if (bonusRuleMultiple === undefined) {
              bonusRuleMultiple = 1
            }
            const bonus = self._currentBankerMultiple * p.playerMultiple * niuniu.basePoint * bonusRuleMultiple

            let pushBonus
            if (index < bankerIndex) {
                // win
                niuniu.gameRoom.changeBalance(room, p, bonus);
                pushBonus = bonus
                niuniu.gameRoom.changeBalance(room, bankerPlayer, -1 * bonus);
                bankerBonus -= bonus
            } else {
                // lose
                niuniu.gameRoom.changeBalance(room, p, -1 * bonus);
                pushBonus = 0 - bonus
                niuniu.gameRoom.changeBalance(room, bankerPlayer, bonus);
                bankerBonus += bonus
            }

            playersData.push({
              uid: res.index,
              bonus: pushBonus,
              balance: p.balance,
            })
        })
        playersData.push({
          uid: self._currentBankerUID,
          bonus: bankerBonus,
          balance: bankerPlayer.balance
        })

        return playersData
    }

    buildSettleRoundData() {
        return {
            banker_uid: this._currentBankerUID,
            banker_multiple: this._currentBankerMultiple,
        }
    }

    onFinishSettle(room) {
        // do nothing
    }

    _startcompeteBanker(room) {
      const self = this
      const niuniu = this.game
    
      niuniu._currentGameStatus = GAME_STATUS.COMPLETING_BANKER

      self.competeBankerCountDownTimer = niuniu.newCountdownTimer(niuniu.configUserCompeteBankerWaitMS, 'onCompeteBankerCountdown', () => {
          self._finishcompeteBanker(room)
      })
    }

    _finishcompeteBanker(room) {
      const self = this
      const niuniu = this.game

      if (niuniu._currentGameStatus !== GAME_STATUS.COMPLETING_BANKER) {
          return
      }
      niuniu._currentGameStatus = GAME_STATUS.BET

      if (self.competeBankerCountDownTimer !== undefined) {
        clearInterval(self.competeBankerCountDownTimer)
        self.competeBankerCountDownTimer = undefined
      }

      // auto compete banker
      const players = niuniu._getReadyPlayers()
      players.forEach((p) => {
        if (!p.competedBanker) {
          self._competeBankerAction(room, p.uid, 0)
        }
      })

      // decide banker
      players.sort((a, b) => {
        return b.bankerMultiple - a.bankerMultiple
      })
      let firstMultiple = players[0].bankerMultiple
      const userIds = []
      for(let i = 0; i < players.length; i++) {
        const p = players[i]
        if (p.bankerMultiple === firstMultiple) {
          userIds.push(p.uid)
        } else {
          break
        }
      }

      if (userIds.length === 1) {
        self._decideBanker(room, userIds[0])
        return
      }

      let index = niuniu.randomNum(0, userIds.length - 1)
      self._decideBanker(room, userIds[index])
    }

    _decideBanker(room, uid) {
      const self = this
      const niuniu = this.game

      const player = niuniu.gameRoom.getPlayerByUID(uid);

      self._currentBankerUID = player.uid
      if (player.bankerMultiple > 1) {
        self._currentBankerMultiple = player.bankerMultiple
      } else {
        self._currentBankerMultiple = 1
        player.bankerMultiple = 1
      }

      niuniu.sendResp('onBanker', {
        uid: player.uid,
        delay: niuniu.configOnBankerWaitMS,
        multiple: self._currentBankerMultiple,
      })

      setTimeout(() => {
        niuniu._startWaitBet(room)
      }, niuniu.configOnBankerWaitMS)
    }

    _competeBanker(room, uid, multiple) {
        const self = this
        const niuniu = this.game

        const p = niuniu.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
        }

        if (p.competedBanker) {
          return
        }

        if (!niuniu.lockUser(uid)) {
          return
        }

        self._competeBankerAction(room, uid, multiple)

        niuniu.unlockUser(uid)
        
        if (self._isEveryBodycompeteBanker()) {
            self._finishcompeteBanker(room)
            return
        }
    }

    _competeBankerAction(room, uid, multiple) {
        const self = this
        const niuniu = this.game

        const p = niuniu.gameRoom.getPlayerByUID(uid);
        p.competedBanker = true
        p.bankerMultiple = multiple

        self.game.sendResp('onCompeteBanker', {
            uid: p.uid,
            multiple: multiple,
        })
    }

    _isEveryBodycompeteBanker() {
        return this.game._checkEveryBodyAttr('competedBanker', true)
    }
}

module.exports = MingPaiQiangZhuang