const Poker = require('./Poker')

const SanGongPokersType = {
    NORMAL: 1,      // 正常52张牌
    JOKER: 2,       // 54张牌
}
module.exports.SanGongPokersType = SanGongPokersType

class SanGong {
    constructor (pokerType) {
        this.pokerType = pokerType
        this.currentPokers = null
    }

    start(playerQuantity) {
        let pokers;

        if (this.pokerType === SanGongPokersType.NORMAL) {
            pokers = new Poker.PokersWithoutJoker()
        } else {
            pokers = new Poker.PokersWithJoker()
        }

        pokers.shuffle()

        this.currentPokers = pokers

        const gamePokers = this.currentPokers.deal(playerQuantity, 3)

        return gamePokers;
    }

    deal() {
        return this.currentPokers.dealOne()
    }

    hasMore() {
        return this.currentPokers.hasMore()
    }

    static calculateResult(playersPokers, allowPokerResults) {
        const results = []

        playersPokers.forEach((pokers, index) => {
            results.push(new Result(index, pokers, allowPokerResults))
        })

        return results
    }

    static sortResult(results) {
        results.sort(SanGong.compareResult);
    }

    static compareResult(a, b) {
        if (a.type > b.type) {
            return -1
        } else if (a.type < b.type) {
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
module.exports.SanGong = SanGong

class Result {
    constructor(index, pokers, allowPokerResults) {
        this.index = index
        this.pokers = pokers
        this.allowPokerResults = allowPokerResults;

        this.maxPokerValuePoint = 0      // 当前牌型的最大牌point
        this.maxPokerTypePoint = 0       // 当前牌型的最大花色point
        this.type = this.calculateType() // 计算牌型, 同时会赋值上面两个值
    }

    calculateType() {
        const self = this

        // 初始化牌型统计数组
        // 0 => A牌数目, 1 => 2牌数目, ..., 12 => K牌数目
        const pokerArr = new Array(13)
        for(let i = 0; i < pokerArr.length; i++) {
            pokerArr[i] = 0
        }

        // 牌组特征
        let totalNums = 0;
        let hasRedJoker = false;
        let hasBlackJoker = false;
        let isAllJQK = true;
        this.pokers.forEach((poker, index) => {
            // 统计点数
            totalNums += self._getValueNum(poker.value);

            // 统计每种牌数目
            let valuePoint = self._getValuePoint(poker.value)
            let typePoint = self._getTypePoint(poker.type)
            let arrIndex = valuePoint - 1
            pokerArr[arrIndex]++

            // 检查是否是JQK
            if (!poker.isJQK()) {
                isAllJQK = false
            }

            // 记录单只最大扑克
            if (valuePoint > this.maxPokerValuePoint) {
                this.maxPokerValuePoint = valuePoint
                this.maxPokerTypePoint = typePoint
            } else if (valuePoint === this.maxPokerValuePoint) {
                if (typePoint > this.maxPokerTypePoint) {
                    this.maxPokerTypePoint = typePoint
                }
            }

            if (poker.type === Poker.Poker.TYPE.JOKER) {
                if (poker.value === Poker.Poker.VALUE.RED_JOKER) {
                    hasRedJoker = true;
                } else if (poker.value === Poker.Poker.VALUE.BLACK_JOKER) {
                    hasBlackJoker = true;
                }
            }
        });

        // 统计牌数目种类
        let numberTypes = {
            4: 0,
            3: 0,
            2: 0,
            1: 0,
        }
        for(let i = 0; i < pokerArr.length; i++) {
            let count = pokerArr[i];
            if (count <= 0) {
                continue;
            }
            numberTypes[count]++;
        }

        // 根据上述统计得出结果
        if ((hasRedJoker && hasBlackJoker) && this._allowResult(this.allowPokerResults, ResultType.TIAN_GONG)) {
            return ResultType.TIAN_GONG;
        } else if ((pokerArr[2] === 3) && this._allowResult(this.allowPokerResults, ResultType.BAO_JIU)) {
            return ResultType.BAO_JIU;
        } else if ((numberTypes[3] === 1 && (pokerArr[10] === 3 || pokerArr[11] === 3 || pokerArr[12] === 3)) && this._allowResult(this.allowPokerResults, ResultType.DA_SAN_GONG)) {
            return ResultType.DA_SAN_GONG;
        } else if ((numberTypes[3] === 1) && this._allowResult(this.allowPokerResults, ResultType.XIAO_SAN_GONG)) {
            return ResultType.XIAO_SAN_GONG;
        } else if (hasRedJoker) {
            return ResultType.LEI_GONG;
        } else if (isAllJQK) {
            return ResultType.SAN_GONG;
        } else if (hasBlackJoker) {
            return ResultType.DI_GONG;
        } else {
            const point = totalNums % 10;
            return ResultType[`POINT_${point}`]
        }
    }

    _getValueNum(value) {
        let point = PokerValueNumMap[value]
        if (point === undefined) {
            return parseInt(value)
        } else {
            return point
        }
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

    _allowResult(results, result) {
        return results && results[result] !== undefined;
    }
}
module.exports.Result = Result

const PokerValueNumMap = {
    [Poker.Poker.VALUE.A]: 1,
    [Poker.Poker.VALUE.J]: 0,
    [Poker.Poker.VALUE.Q]: 0,
    [Poker.Poker.VALUE.K]: 0,
}

const PokerValuePointMap = {
    [Poker.Poker.VALUE.A]: 1,
    [Poker.Poker.VALUE.J]: 11,
    [Poker.Poker.VALUE.Q]: 12,
    [Poker.Poker.VALUE.K]: 13,
}

const PokerTypePointMap = {
    [Poker.Poker.TYPE.DIAMOND]: 1,
    [Poker.Poker.TYPE.CLUB]: 2,
    [Poker.Poker.TYPE.HEART]: 3,
    [Poker.Poker.TYPE.SPADE]: 4,
    [Poker.Poker.TYPE.JOKER]: 5,
}

const ResultType = {
    POINT_0: 0,         // 没点
    POINT_1: 1,         // 一点
    POINT_2: 2,         // 两点
    POINT_3: 3,         // 三点
    POINT_4: 4,         // 四点
    POINT_5: 5,         // 五点
    POINT_6: 6,         // 六点
    POINT_7: 7,         // 七点
    POINT_8: 8,         // 八点
    POINT_9: 9,         // 九点
    DI_GONG: 10,        // 地公 带一个小王
    LEI_GONG: 11,       // 雷公 带一个大王
    SAN_GONG: 12,       // 三公
    XIAO_SAN_GONG: 13,  // 小三公 JJJ,QQQ,KKK
    DA_SAN_GONG: 14,    // 大三公 任意三张10以下的相同牌型
    BAO_JIU: 15,        // 暴玖 任意三张3
    TIAN_GONG: 16,      // 天公 带大小王
};
module.exports.ResultType = ResultType
