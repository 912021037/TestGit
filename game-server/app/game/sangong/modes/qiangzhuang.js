const GAME_STATUS = require('../constants').GAME_STATUS
const Utils = require('./utils')

class QiangZhuang {
    constructor(sanGong) {
        this.game = sanGong
        this._currentBankerUID = 0
        this._currentBankerMultiple = 1
    }

    getCurrentBankerUID() {
        return this._currentBankerUID
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

    buildSettlePlayerData(room) {
        const self = this
        const game = this.game

        // do settle job
        const bankerIndex = Utils.getBankerResultIndex(game._currentResults, self._currentBankerUID)
        const bankerResult = game._currentResults[bankerIndex]

        const playersData = []
        const bankerPlayer = game.gameRoom.getPlayerByUID(self._currentBankerUID);
        let bankerBonus = 0
        game._currentResults.forEach((res, index) => {
            if (res.index === self._currentBankerUID) {
                return
            }
            const p = game.gameRoom.getPlayerByUID(res.index);

            // 计算赔率
            let bonusRuleMultiple
            if (index < bankerIndex) {
                // win
                bonusRuleMultiple = game.bonusRule[res.type]
            } else {
                // lose
                bonusRuleMultiple = game.bonusRule[bankerResult.type]
            }
            if (bonusRuleMultiple === undefined) {
              bonusRuleMultiple = 1
            }
            const bonus = self._currentBankerMultiple * p.playerMultiple * game.basePoint * bonusRuleMultiple

            let pushBonus
            if (index < bankerIndex) {
                // win
                game.gameRoom.changeBalance(room, p, bonus);
                pushBonus = bonus
                game.gameRoom.changeBalance(room, bankerPlayer, -1 * bonus);
                bankerBonus -= bonus
            } else {
                // lose
                game.gameRoom.changeBalance(room, p, -1 * bonus);
                pushBonus = 0 - bonus
                game.gameRoom.changeBalance(room, bankerPlayer, bonus);
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

    checkBetMutiple(multiple) {
        const game = this.game
        return multiple >= 1;
    }

    _startcompeteBanker(room) {
      const self = this
      const game = this.game
    
      game._currentGameStatus = GAME_STATUS.COMPLETING_BANKER

      self.competeBankerCountDownTimer = game.newCountdownTimer(game.configUserCompeteBankerWaitMS, 'onCompeteBankerCountdown', () => {
          self._finishcompeteBanker(room)
      })
    }

    _finishcompeteBanker(room) {
      const self = this
      const game = this.game

      if (game._currentGameStatus !== GAME_STATUS.COMPLETING_BANKER) {
          return
      }
      game._currentGameStatus = GAME_STATUS.BET

      if (self.competeBankerCountDownTimer !== undefined) {
        clearInterval(self.competeBankerCountDownTimer)
        self.competeBankerCountDownTimer = undefined
      }

      // auto compete banker
      const players = game._getReadyPlayers()
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

      let index = game.randomNum(0, userIds.length - 1)
      self._decideBanker(room, userIds[index])
    }

    _decideBanker(room, uid) {
      const self = this
      const game = this.game

      const player = game.gameRoom.getPlayerByUID(uid);

      self._currentBankerUID = player.uid
      if (player.bankerMultiple > 1) {
        self._currentBankerMultiple = player.bankerMultiple
      } else {
        self._currentBankerMultiple = 1
        player.bankerMultiple = 1
      }

      game.sendResp('onBanker', {
        uid: player.uid,
        delay: game.configOnBankerWaitMS,
        multiple: self._currentBankerMultiple,
      })

      setTimeout(() => {
        game._startWaitBet(room)
      }, game.configOnBankerWaitMS)
    }

    _competeBanker(room, uid, multiple) {
        const self = this
        const game = this.game

        const p = game.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return
        }

        if (p.competedBanker) {
          return
        }

        if (!game.lockUser(uid)) {
          return
        }

        self._competeBankerAction(room, uid, multiple)

        game.unlockUser(uid)
        
        if (self._isEveryBodycompeteBanker()) {
            self._finishcompeteBanker(room)
            return
        }
    }

    _competeBankerAction(room, uid, multiple) {
        const self = this

        const p = this.game.gameRoom.getPlayerByUID(uid);
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

module.exports = QiangZhuang