const GAME_STATUS = require('../constants').GAME_STATUS
const Utils = require('./utils')

class SuperBanker {
    constructor(niuniu) {
        this.game = niuniu
        this._currentBankerUID = 0
        this._currentBankerMaxPoint = 0
    }

    onUserRequest(room, user, request) {
        switch (request.action) {
            case 'competeSuperBanker':
                this._competeSuperBanker(room, user.uid, parseInt(request.point))
                break
        }
    }

    onSync(payload) {
        payload.current_super_banker_uid = this._currentBankerUID
        payload.current_super_banker_max_point = this._currentBankerMaxPoint
    }

    canStart(readyPlayers) {
        if (this._currentBankerMaxPoint === 0) {
            return true
        }

        let hasBankerUID = false
        for(let i = 0; i < readyPlayers.length; i++) {
            if (readyPlayers[i].uid === this._currentBankerUID) {
                hasBankerUID = true
                break
            }
        }

        return hasBankerUID
    }

    onInitNewRoundPlayer(player) {
        player.competedSuperBanker = false
        player.maxPoint = 0
    }

    onStartNewRound(room) {
        // do nothing
    }

    onFinishDealPokers(room) {
        if (this._currentBankerMaxPoint === 0) {
            this._startcompeteSuperBanker(room)
        } else {
            const niuniu = this.game
            niuniu._currentGameStatus = GAME_STATUS.BET
            niuniu._startWaitBet(room)
        }
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
            const bonus = p.playerMultiple * niuniu.basePoint * bonusRuleMultiple

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
              balance: p.balance
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
            max_point: this._currentBankerMaxPoint,
        }
    }

    onFinishSettle(room) {
        const self = this
        const niuniu = this.game
        if (self._currentBankerMaxPoint <= 0) {
            self._currentBankerUID = 0
            return
        }
        for(let uid in niuniu.gameRoom.getPlayers()) {
            const p = niuniu.gameRoom.getPlayerByUID(uid);
            if (Math.abs(p.balance) >= self._currentBankerMaxPoint) {
                console.log('current max point reach, end game')
                niuniu._end(room)
                return
            }
        }
    }

    _startcompeteSuperBanker(room) {
      const self = this
      const niuniu = this.game
    
      niuniu._currentGameStatus = GAME_STATUS.COMPLETING_BANKER

      self.competeSuperBankerCountDownTimer = niuniu.newCountdownTimer(niuniu.configUserCompeteBankerWaitMS, 'onCompeteSuperBankerCountdown', () => {
          self._finishcompeteSuperBanker(room)
      })
    }

    _finishcompeteSuperBanker(room) {
      const self = this
      const niuniu = this.game

      if (niuniu._currentGameStatus !== GAME_STATUS.COMPLETING_BANKER) {
          return
      }
      niuniu._currentGameStatus = GAME_STATUS.BET

      if (self.competeSuperBankerCountDownTimer !== undefined) {
        clearInterval(self.competeSuperBankerCountDownTimer)
        self.competeSuperBankerCountDownTimer = undefined
      }

      // auto compete banker
      const players = niuniu._getReadyPlayers()
      let isAllZero = true
      players.forEach((p) => {
        if (!p.competedSuperBanker) {
          self._competeSuperBankerAction(room, p.uid, 0)
        }
        if (p.maxPoint > 0) {
            isAllZero = false
        }
      })

      // decide banker
      if (isAllZero) {
          let index = niuniu.randomNum(0, players.length - 1)
          self._decideSuperBanker(room, players[index].uid)
          return
      }

      players.sort((a, b) => {
        return b.maxPoint - a.maxPoint
      })
      let firstMaxPoint = players[0].maxPoint
      const userIds = []
      for(let i = 0; i < players.length; i++) {
        const p = players[i]
        if (p.maxPoint === firstMaxPoint) {
          userIds.push(p.uid)
        } else {
          break
        }
      }

      if (userIds.length === 1) {
        self._decideSuperBanker(room, userIds[0])
        return
      }

      let index = niuniu.randomNum(0, userIds.length - 1)
      self._decideSuperBanker(room, userIds[index])
    }

    _decideSuperBanker(room, uid) {
      const self = this
      const niuniu = this.game

      const player = niuniu.gameRoom.getPlayerByUID(uid);

      self._currentBankerUID = player.uid
      self._currentBankerMaxPoint = player.maxPoint
      niuniu.sendResp('onSuperBanker', {
        uid: player.uid,
        delay: niuniu.configOnBankerWaitMS,
      })

      setTimeout(() => {
        niuniu._startWaitBet(room)
      }, niuniu.configOnBankerWaitMS)
    }

    _competeSuperBanker(room, uid, maxPoint) {
        const self = this
        const niuniu = this.game

        const p = niuniu.gameRoom.getPlayerByUID(uid)
        if (!p || !p.ready) {
            return
        }

        if (p.competedSuperBanker) {
          return
        }

        if (!niuniu.lockUser(uid)) {
          return
        }

        self._competeSuperBankerAction(room, uid, maxPoint)

        niuniu.unlockUser(uid)
        
        if (self._isEveryBodycompeteSuperBanker()) {
            self._finishcompeteSuperBanker(room)
            return
        }
    }

    _competeSuperBankerAction(room, uid, maxPoint) {
        const self = this
        const niuniu = this.game

        const p = niuniu.gameRoom.getPlayerByUID(uid);
        p.competedSuperBanker = true
        p.maxPoint = maxPoint

        niuniu.sendResp('onChangeMaxPoint', {
            uid: p.uid,
            max_point: maxPoint,
        })
    }

    _isEveryBodycompeteSuperBanker() {
        return this.game._checkEveryBodyAttr('competedSuperBanker', true)
    }
}

module.exports = SuperBanker