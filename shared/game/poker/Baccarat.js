const Poker = require('./Poker')

class BaccaratPokers extends Poker.Pokers {
    constructor(deckQuantity) {
        const pokers = []
        for(let i = 0; i < deckQuantity; i++) {
            Object.keys(Poker.Poker.TYPE).forEach(typeKey => {
                if (Poker.Poker.TYPE.JOKER === Poker.Poker.TYPE[typeKey]) {
                    return
                }
                Object.keys(Poker.Poker.VALUE).forEach(valueKey => {
                    if (Poker.Poker.VALUE.BLACK_JOKER === Poker.Poker.VALUE[valueKey] || Poker.Poker.VALUE.RED_JOKER === Poker.Poker.VALUE[valueKey]) {
                        return
                    }
                    pokers.push(new Poker.Poker(Poker.Poker.TYPE[typeKey], Poker.Poker.VALUE[valueKey]))
                })
            })
        }
        super(pokers)
    }
}

class Baccarat {
    constructor () {
        this.currentPokers = null
        this.resetStatistics()
    }

    start(deckQuantity) {
        if (!deckQuantity) {
            deckQuantity = 8
        }

        const pokers = new BaccaratPokers(deckQuantity)
        pokers.shuffle()
        this.currentPokers = pokers

        this.resetStatistics();
    }

    getPokerQuantity() {
        return this.currentPokers.getPokerQuantity()
    }

    canDeal() {
        return this.currentPokers.getPokerQuantity() > 6
    }

    deal() {
        let playerPokers = []
        let bankerPokers = []
        playerPokers.push(this.currentPokers.dealOne())
        bankerPokers.push(this.currentPokers.dealOne())
        playerPokers.push(this.currentPokers.dealOne())
        bankerPokers.push(this.currentPokers.dealOne())

        let playerPoint = Baccarat.calculatePoint(playerPokers)
        let bankerPoint = Baccarat.calculatePoint(bankerPokers)

        if (playerPoint >= 8 || bankerPoint >= 8) {
            return this._buildResult(bankerPokers, playerPokers)
        }

        if (playerPoint <= 5) {
            playerPokers.push(this.currentPokers.dealOne())

            if (Baccarat.isBankerDeal(bankerPoint, playerPokers[2])) {
            bankerPokers.push(this.currentPokers.dealOne())
            }
        } else {
            if (bankerPoint <= 5) {
            bankerPokers.push(this.currentPokers.dealOne())
            }
        }

        return this._buildResult(bankerPokers, playerPokers)
    }

    getBankerWinCount() {
        return this.bankerWinCount
    }

    getPlayerWinCount() {
        return this.playerWinCount
    }

    getTieCount() {
        return this.tieCount
    }

    resetStatistics() {
        this.bankerWinCount = 0
        this.playerWinCount = 0
        this.tieCount = 0
    }

    _buildResult(bankerPokers, playerPokers) {
        const result = new Result(bankerPokers, playerPokers)

        if (result.isBankerWin()) {
            this.bankerWinCount++;
        } else if (result.isPlayerWin()) {
            this.playerWinCount++;
        } else {
            this.tieCount++;
        }

        return result
    }

    static isBankerDeal(bankerPoint, playerThirdPoker) {
        let thirdNum = Baccarat.getNumByPoker(playerThirdPoker)
        if (bankerPoint <= 2) {
            return true
        }
        if (bankerPoint === 3 && Baccarat.isBelongNums(thirdNum, NumsFor3)) {
            return true
        }
        if (bankerPoint === 4 && Baccarat.isBelongNums(thirdNum, NumsFor4)) {
            return true
        }
        if (bankerPoint === 5 && Baccarat.isBelongNums(thirdNum, NumsFor5)) {
            return true
        }
        if (bankerPoint === 6 && Baccarat.isBelongNums(thirdNum, NumsFor6)) {
            return true
        }
        return false
    }

    static isBelongNums(num, nums) {
        for(let i = 0; i < nums.length; i++) {
            if (num === nums[i]) {
            return true
            }
        }
        return false
    }

    static calculatePoint(pokers) {
        let point = 0

        pokers.forEach((p) => {
            point += Baccarat.getNumByPoker(p)
        })

        return point % 10
    }

    static isPair(pokers) {
        if (!pokers || pokers.length < 2) {
            return false
        }

        return pokers[0].value === pokers[1].value
    }

    static getNumByPoker(poker) {
        let num = PokerValueNumMap[poker.value]
        if (num === undefined) {
            return parseInt(poker.value)
        } else {
            return num
        }
    }
}
module.exports.Baccarat = Baccarat

class Result {
    constructor(bankerPokers, playerPokers) {
        this.bankerPokers = bankerPokers
        this.playerPokers = playerPokers

        this.bankerPoint = Baccarat.calculatePoint(bankerPokers)
        this.playerPoint = Baccarat.calculatePoint(playerPokers)

        this.bankerPair = Baccarat.isPair(bankerPokers)
        this.playerPair = Baccarat.isPair(playerPokers)

        if (this.bankerPoint > this.playerPoint) {
            this.type = RESULT_TYPE.BANKER_WIN
        } else if (this.bankerPoint < this.playerPoint) {
            this.type = RESULT_TYPE.PLAYER_WIN
        } else {
            this.type = RESULT_TYPE.TIE
        }
    }

    getBankerPokers() {
        return this.bankerPokers
    }

    getPlayerPokers() {
        return this.playerPokers
    }

    getBankerPoint() {
        return this.bankerPoint
    }

    getPlayerPoint() {
        return this.playerPoint
    }

    isBankerPair() {
        return this.bankerPair
    }

    isPlayerPair() {
        return this.playerPair
    }

    isBankerWin() {
        return this.bankerPoint > this.playerPoint
    }

    isPlayerWin() {
        return this.bankerPoint < this.playerPoint
    }

    isTie() {
        return this.bankerPoint === this.playerPoint
    }
}
module.exports.Result = Result

const RESULT_TYPE = {
    BANKER_WIN: 1,
    PLAYER_WIN: 2,
    TIE: 3,
}
module.exports.RESULT_TYPE = RESULT_TYPE

const PokerValueNumMap = {
    [Poker.Poker.VALUE.A]: 1,
    [Poker.Poker.VALUE.J]: 0,
    [Poker.Poker.VALUE.Q]: 0,
    [Poker.Poker.VALUE.K]: 0,
}

const NumsFor3 = [8]
const NumsFor4 = [2,3,4,5,6,7]
const NumsFor5 = [4,5,6,7]
const NumsFor6 = [6,7]