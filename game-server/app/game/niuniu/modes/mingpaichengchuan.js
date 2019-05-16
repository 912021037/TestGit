const GAME_STATUS = require('../constants').GAME_STATUS

class MingPaiChengChuan {
    constructor(niuniu) {
        this.game = niuniu
    }

    onUserRequest(room, user, request) {
        // do nothings
    }

    onSync(payload) {
        // do nothings
    }

    canStart(readyPlayers) {
        return true
    }

    onInitNewRoundPlayer(player) {
        // do nothings
    }

    onStartNewRound(room) {
        // do nothings
    }

    onFinishDealPokers(room) {
        const niuniu = this.game
        niuniu._currentGameStatus = GAME_STATUS.BET
        niuniu._startWaitBet(room)
    }

    getCurrentBankerUID() {
        return 0
    }

    buildSettlePlayerData(room) {
        const niuniu = this.game

        // do settle job
        let totalStake = 0
        for(let i = 0; i < niuniu._currentResults.length; i++) {
            const res = niuniu._currentResults[i]
            const player = niuniu.gameRoom.getPlayerByUID(res.index)

            const stake = player.playerMultiple * niuniu.basePoint
            niuniu.gameRoom.changeBalance(room, player, -1 * stake);

            totalStake += stake
        }

        let i = 0
        let bonusMap = {}
        while(totalStake > 0 && i < niuniu._currentResults.length) {
            const res = niuniu._currentResults[i]
            const player = niuniu.gameRoom.getPlayerByUID(res.index)

            let bonusRuleMultiple = niuniu.bonusRule[res.type]
            if (bonusRuleMultiple === undefined) {
                bonusRuleMultiple = 1
            }
            const bonus = player.playerMultiple * niuniu.basePoint * (bonusRuleMultiple + 1)
            let realBonus
            if (totalStake >= bonus) {
                realBonus = bonus
                totalStake -= bonus
            } else {
                realBonus = totalStake
                totalStake = 0
            }
            niuniu.gameRoom.changeBalance(room, player, realBonus);

            const pushBonus = realBonus - (player.playerMultiple * niuniu.basePoint)
            bonusMap[player.uid] = pushBonus
            i++
        }

        const playersData = []
        niuniu._currentResults.forEach((res) => {
            const p = niuniu.gameRoom.getPlayerByUID(res.index);
            let pushBonus = bonusMap[p.uid]
            playersData.push({
                uid: p.uid,
                bonus: pushBonus === undefined ? (-1 * p.playerMultiple * niuniu.basePoint) : pushBonus,
                balance: p.balance
            })
        })

        return playersData
    }

    buildSettleRoundData() {
        return {}
    }

    onFinishSettle(room) {
        // do nothing
    }
}

module.exports = MingPaiChengChuan