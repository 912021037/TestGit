const Poker = require('./Poker')

class ZhaJinHua {
    constructor () {
        this.currentPokers = null;
    }

    start(playerQuantity) {
        let pokers = new Poker.PokersWithoutJoker();
        pokers.shuffle();
        this.currentPokers = pokers;
        const gamePokers = this.currentPokers.deal(playerQuantity, 3);
        return gamePokers;
    }

    static calculateResult(playersPokers) {
        const results = [];

        playersPokers.forEach((pokers, index) => {
            results.push(new Result(index, pokers));
        })

        return results;
    }

    static sortResult(results) {
        results.sort(ZhaJinHua.compareResult);
    }

    static compareResult(a, b) {
        if (a.type > b.type) {
            return -1;
        } else if (a.type < b.type) {
            return 1;
        }

        if (a.maxPokerValuePoint > b.maxPokerValuePoint) {
            return -1;
        } else if (a.maxPokerValuePoint < b.maxPokerValuePoint) {
            return 1;
        }

        if (a.maxPokerTypePoint > b.maxPokerTypePoint) {
            return -1;
        } else if (a.maxPokerTypePoint < b.maxPokerTypePoint){
            return 1;
        }

        return 0;
    }
}
module.exports.ZhaJinHua = ZhaJinHua;

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
        this.index = index;
        this.pokers = pokers;

        this.maxPokerValuePoint = 0;
        this.maxPokerTypePoint = 0;
        this.type = this.calculateType(); // 计算牌型, 同时会赋值上面两个值
    }

    calculateType() {
        const self = this;

        // 初始化牌型统计数组
        // 0 => 2牌数目, 1 => 3牌数目, ..., 12 => A牌数目
        const pokerArr = new Array(13);
        for(let i = 0; i < pokerArr.length; i++) {
            pokerArr[i] = 0;
        }

        // 是否同花
        let isFlush = true;
        let firstType = this.pokers[0].type;
        this.pokers.forEach((poker) => {
            // 记录是否同花
            if (isFlush === true && firstType !== poker.type) {
                isFlush = false;
            }

            // 统计每种牌数目
            let valuePoint = self._getValuePoint(poker.value);
            let typePoint = self._getTypePoint(poker.type);
            let index = valuePoint - 2;
            pokerArr[index]++;

            // 记录单只最大扑克
            if (valuePoint > this.maxPokerValuePoint) {
                this.maxPokerValuePoint = valuePoint;
                this.maxPokerTypePoint = typePoint;
            } else if (valuePoint === this.maxPokerValuePoint) {
                if (typePoint > this.maxPokerTypePoint) {
                    this.maxPokerTypePoint = typePoint;
                }
            }
        })

        // 是否顺子
        let isStraight = self._isStraight(pokerArr);

        // 统计牌数目种类
        let numberTypes = {
            3: 0,
            2: 0,
            1: 0,
        }
        for(let i = 0; i < pokerArr.length; i++) {
            let count = pokerArr[i]
            if (count <= 0) {
                continue
            }
            numberTypes[count]++;
        }

        // 根据上述统计得出结果
        if (numberTypes[3] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 3, this);
            return ResultType.BAO_ZI;
        } else if (isFlush && isStraight) {
            return ResultType.STRAIGHT_FLUSH;
        } else if (isFlush){
            return ResultType.FLUSH;
        } else if (isStraight) {
            return ResultType.STRAIGHT;
        } else if (numberTypes[2] === 1) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 2, this)
            return ResultType.PAIR;
        } else {
            return ResultType.HIGH_CARD;
        }
    }

    _calculatePokerValuePointAndTypePoint(pokerArr, quantity, target) {
        // pokerArr 索引0是2
        let maxPokerValuePoint = 0;
        for(let i = 0; i < pokerArr.length; i++) {
            let pQty = pokerArr[i];
            if (pQty !== quantity) {
                continue;
            }
            maxPokerValuePoint = i + 2;
        }

        let maxPokerTypePoint = 0;
        for (let j = 0; j < target.pokers.length; j++) {
            let p = target.pokers[j];
            if (this._getValuePoint(p.value) !== maxPokerValuePoint) {
                continue;
            }
            let typePoint = this._getTypePoint(p.type);
            if (typePoint > maxPokerTypePoint) {
                maxPokerTypePoint = typePoint;
            }
        }
        target.maxPokerValuePoint = maxPokerValuePoint;
        target.maxPokerTypePoint = maxPokerTypePoint;
    }

    _getValuePoint(value) {
        let point = PokerValuePointMap[value];
        if (point === undefined) {
            return parseInt(value);
        } else {
            return point;
        }
    }

    _getTypePoint(type) {
        return PokerTypePointMap[type];
    }

    _isStraight(pokerArr) {
        let continueCount = 0;
        for(let i = 1; i < pokerArr.length; i++) {
            if (pokerArr[i - 1] == 1 && pokerArr[i] == 1) {
                continueCount++;
            }
        }
        // 处理A23的情况
        let isA23 = pokerArr[0] == 1 && 
                        pokerArr[pokerArr.length - 1] == 1 && 
                        pokerArr[pokerArr.length - 2] != 1
        if (isA23) {
            continueCount++;
        }

        return continueCount === 2;
    }
}
module.exports.Result = Result;

const ResultType = {
    HIGH_CARD: 1,           // 散牌
    PAIR: 2,                // 对子
    STRAIGHT: 3,            // 顺子
    FLUSH: 4,               // 同花
    STRAIGHT_FLUSH: 5,      // 同花顺
    BAO_ZI: 6,              // 豹子
}
module.exports.ResultType = ResultType;