const Poker = require('./Poker')

class ShowHand {
    constructor () {
        this.currentPokers = null
    }

    start(playerQuantity) {
        let pokers = new Poker.PokersWithoutJoker()
        pokers.shuffle()
        this.currentPokers = pokers

        const gamePokers = this.currentPokers.deal(playerQuantity, 2)

        return gamePokers
    }

    deal() {
        return this.currentPokers.dealOne()
    }

    hasMore() {
        return this.currentPokers.hasMore()
    }

    static calculateResult(playersPokers) {
        const results = []

        playersPokers.forEach((pokers, index) => {
            results.push(new Result(index, pokers))
        })

        return results
    }

    static sortResult(results) {
        results.sort(ShowHand.compareResult)
    }

    static compareResult(a, b) {
        if (a.type < b.type) {
            return -1
        } else if (a.type > b.type) {
            return 1
        }

        if (a.maxPokerValuePoint > b.maxPokerValuePoint) {
            return -1
        } else if (a.maxPokerValuePoint < b.maxPokerValuePoint) {
            return 1
        }

        if (a.maxPokerTypePoint > b.maxPokerTypePoint) {
            return -1
        } else if (a.maxPokerTypePoint < b.maxPokerTypePoint){
            return 1
        }

        return 0
    }
}
module.exports.ShowHand = ShowHand

const PokerValuePointMap = {
    [Poker.Poker.VALUE.A]: 14,
    [Poker.Poker.VALUE.J]: 11,
    [Poker.Poker.VALUE.Q]: 12,
    [Poker.Poker.VALUE.K]: 13,
}
const PokerTypePointMap = {
    [Poker.Poker.TYPE.DIAMOND]: 1,
    [Poker.Poker.TYPE.CLUB]: 2,
    [Poker.Poker.TYPE.HEART]: 3,
    [Poker.Poker.TYPE.SPADE]: 4,
}

class Result {
    constructor(index, pokers) {
        this.index = index
        this.pokers = pokers

        this.maxPokerValuePoint = 0
        this.maxPokerTypePoint = 0
        this.maxPoker = null;
        this.type = this.calculateType() // 计算牌型, 同时会赋值上面三个值
    }

    calculateType() {
        const self = this

        // 初始化牌型统计数组
        // 0 => 2牌数目, 1 => 3牌数目, ..., 12 => A牌数目
        const pokerArr = new Array(13)
        for(let i = 0; i < pokerArr.length; i++) {
            pokerArr[i] = 0
        }

        // 是否同花
        let isFlush = true
        let firstType = this.pokers[0].type
        this.pokers.forEach((poker) => {
            // 记录是否同花
            if (isFlush === true && firstType !== poker.type) {
                isFlush = false
            }

            // 统计每种牌数目
            let valuePoint = self._getValuePoint(poker.value)
            let typePoint = self._getTypePoint(poker.type)
            let index = valuePoint - 2
            pokerArr[index]++

            // 记录单只最大扑克
            if (valuePoint > this.maxPokerValuePoint) {
                this.maxPokerValuePoint = valuePoint;
                this.maxPokerTypePoint = typePoint;
                this.maxPoker = poker;
            } else if (valuePoint === this.maxPokerValuePoint) {
                if (typePoint > this.maxPokerTypePoint) {
                    this.maxPokerTypePoint = typePoint;
                    this.maxPoker = poker;
                }
            }
        })

        // 是否顺子
        let isStraight = self._isStraight(this.pokers, pokerArr, this)

        // 统计牌数目种类
        let numberTypes = {
            4: 0,
            3: 0,
            2: 0,
            1: 0,
        }
        for(let i = 0; i < pokerArr.length; i++) {
            let count = pokerArr[i]
            if (count <= 0) {
                continue
            }
            numberTypes[count]++
        }

        // 根据上述统计得出结果
        if (isFlush && isStraight) {
            return ResultType.STRAIGHT_FLUSH
        } else if (numberTypes[4] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 4, this)
            return ResultType.FOUR_OF_A_KIND
        } else if (numberTypes[3] === 1 && numberTypes[2] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 3, this)
            return ResultType.FULL_HOUSE
        } else if (isFlush && this.pokers.length === 5){
            return ResultType.FLUSH
        } else if (isStraight) {
            return ResultType.STRAIGHT
        } else if (numberTypes[3] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 3, this)
            return ResultType.THREE_OF_A_KIND
        } else if (numberTypes[2] === 2) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 2, this)
            return ResultType.TWO_PAIRS
        } else if (numberTypes[2] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 2, this)
            return ResultType.ONE_PAIRS
        } else {
            // 有5张牌时， 默认第一张是底牌，比第一张
            if (self.pokers.length === 5) {
                const faceDownPoker = self.pokers[0]
                self.maxPokerValuePoint = self._getValuePoint(faceDownPoker.value)
                self.maxPokerTypePoint = self._getTypePoint(faceDownPoker.type)
                self.maxPoker = faceDownPoker;
            }
            return ResultType.HIGH_CARD
        }
    }

    getMaxPoker() {
        return this.maxPoker;
    }

    _calculatePokerValuePointAndTypePoint(pokerArr, quantity, target) {
        // 0是2
        let maxPokerValuePoint = 0;
        for(let i = 0; i < pokerArr.length; i++) {
            let pQty = pokerArr[i]
            if (pQty !== quantity) {
                continue
            }
            maxPokerValuePoint = i + 2;
            
        }

        let maxPokerTypePoint = 0
        let maxPoker = null;
        for (let j = 0; j < target.pokers.length; j++) {
            let p = target.pokers[j]
            if (this._getValuePoint(p.value) !== maxPokerValuePoint) {
                continue
            }
            let typePoint = this._getTypePoint(p.type)
            if (typePoint > maxPokerTypePoint) {
                maxPokerTypePoint = typePoint
                maxPoker = p;
            }
        }
        target.maxPokerValuePoint = maxPokerValuePoint;
        target.maxPokerTypePoint = maxPokerTypePoint;
        target.maxPoker = maxPoker;
    }

    _getValuePoint(value) {
        let point = PokerValuePointMap[value]
        if (point === undefined) {
            return parseInt(value)
        } else {
            return point
        }
    }

    _getTypePoint(type) {
        return PokerTypePointMap[type]
    }

    _isStraight(pokers, pokerArr, target) {
        if (pokers.length < 5) {
            return false
        }

        let continueCount = 0
        for(let i = 1; i < pokerArr.length; i++) {
            if (pokerArr[i - 1] == 1 && pokerArr[i] == 1) {
                continueCount++
            }
        }
        // 处理A2345的情况
        let isA2345 = pokerArr[0] == 1 && pokerArr[pokerArr.length - 1] == 1 && pokerArr[pokerArr.length - 2] != 1
        if (isA2345) {
            continueCount++
        }

        return continueCount === 4
    }
}
module.exports.Result = Result

const ResultType = {
    STRAIGHT_FLUSH: 0,      // 同花顺
    FOUR_OF_A_KIND: 1,      // 四条
    FULL_HOUSE: 2,          // 葫芦
    FLUSH: 3,               // 同花
    STRAIGHT: 4,            // 顺子
    THREE_OF_A_KIND: 5,     // 三条
    TWO_PAIRS: 6,           // 两对
    ONE_PAIRS: 7,           // 一对
    HIGH_CARD: 8,           // 散牌
}
module.exports.ResultType = ResultType