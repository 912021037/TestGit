const GAME_STATUS = require('../constants').GAME_STATUS

class MingPaiChengChuan {
    constructor(sanGong) {
        this.game = sanGong
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
        const game = this.game
        game._currentGameStatus = GAME_STATUS.BET
        game._startWaitBet(room)
    }

    getCurrentBankerUID() {
        return 0
    }

    buildSettlePlayerData(room) {
        const game = this.game

        // do settle job
        let totalStake = 0
        for(let i = 0; i < game._currentResults.length; i++) {
            const res = game._currentResults[i]
            const player = game.gameRoom.getPlayerByUID(res.index)

            const stake = player.playerMultiple
            game.gameRoom.changeBalance(room, player, -1 * stake);

            totalStake += stake
        }

        let i = 0
        let bonusMap = {}
        while(totalStake > 0 && i < game._currentResults.length) {
            const res = game._currentResults[i]
            const player = game.gameRoom.getPlayerByUID(res.index)

            // let bonusRuleMultiple = game.bonusRule[res.type]
            // if (bonusRuleMultiple === undefined) {
            //     bonusRuleMultiple = 1
            // }
            const bonus = player.playerMultiple * 2
            let realBonus
            if (totalStake >= bonus) {
                realBonus = bonus
                totalStake -= bonus
            } else {
                realBonus = totalStake
                totalStake = 0
            }
            game.gameRoom.changeBalance(room, player, realBonus);

            const pushBonus = realBonus - player.playerMultiple
            bonusMap[player.uid] = pushBonus
            i++
        }

        const playersData = []
        game._currentResults.forEach((res) => {
            const p = game.gameRoom.getPlayerByUID(res.index);
            let pushBonus = bonusMap[p.uid]
            playersData.push({
                uid: p.uid,
                bonus: pushBonus === undefined ? -1 * p.playerMultiple : pushBonus,
                balance: p.balance,
                multiple: p.playerMultiple
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

    checkBetMutiple(multiple) {
        const game = this.game
        return multiple >= 1 && multiple <= game.basePoint;
    }
}

module.exports = MingPaiChengChuan