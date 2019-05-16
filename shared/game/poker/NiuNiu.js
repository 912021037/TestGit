const Poker = require('./Poker')

const NiuNiuPokersType = {
    NORMAL: 1,      // 正常52张牌
    STAR: 2,        // 比正常加入13张星牌
    GONG: 3,        // 比正常加入8张公牌
}
module.exports.NiuNiuPokersType = NiuNiuPokersType

const NiuNiuPokerType = {
    DIAMOND: 1, // 方块
    CLUB: 2,       // 梅花
    HEART: 3,     // 红桃
    SPADE: 4,     // 黑桃
    STAR: 6,    // 星牌 13人用
    GONG: 7,    // 公牌 12人用
}
module.exports.NiuNiuPokerType = NiuNiuPokerType

class PokersWithStar extends Poker.PokersWithoutJoker {
    constructor() {
        super()
        Object.keys(Poker.Poker.VALUE).forEach(valueKey => {
            const pokerValue = Poker.Poker.VALUE[valueKey]
            if (Poker.Poker.VALUE.BLACK_JOKER === pokerValue || Poker.Poker.VALUE.RED_JOKER === pokerValue) {
                return
            }
            this.pokers.push(new Poker.Poker(NiuNiuPokerType.STAR, pokerValue))
        })
    }
}

class PokersWithGONG extends Poker.PokersWithoutJoker {
    constructor() {
        super()
        for(let i = 0; i < 8; i++) {
            this.pokers.push(new Poker.Poker(NiuNiuPokerType.GONG, i + 1));
        }
    }
}

class NiuNiu {
    constructor (pokerType) {
        this.pokerType = pokerType
        this.currentPokers = null
    }

    start(playerQuantity) {
        let pokers

        if (this.pokerType === NiuNiuPokersType.STAR) {
            pokers = new PokersWithStar();
        } else if (this.pokerType === NiuNiuPokersType.GONG) {
            pokers = new PokersWithGONG();
        } else {
            pokers = new Poker.PokersWithoutJoker();
        }
        pokers.shuffle();
        this.currentPokers = pokers;

        const gamePokers = this.currentPokers.deal(playerQuantity, 5);

        return gamePokers;
    }

    deal() {
        return this.currentPokers.dealOne();
    }

    hasMore() {
        return this.currentPokers.hasMore();
    }

    static calculateResult(playersPokers, allowPokerResults) {
        const results = [];

        playersPokers.forEach((pokers, index) => {
            results.push(new Result(index, pokers, allowPokerResults))
        })

        return results
    }

    static sortResult(results) {
        results.sort(NiuNiu.compareResult)
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
module.exports.NiuNiu = NiuNiu

class Result {
    constructor(index, pokers, allowPokerResults) {
        this.index = index
        this.pokers = pokers
        this.allowPokerResults = allowPokerResults;

        this.maxPokerValuePoint = 0      // 当前牌型的最大牌point
        this.maxPokerTypePoint = 0       // 当前牌型的最大花色point
        this.slicePokers = [[0, 1, 2], [3, 4]] // 组合成牛的牌
        this.type = this.calculateType() // 计算牌型, 同时会赋值上面两个值
    }

    calculateType() {
        const self = this

        // 初始化牌型统计数组
        // 0 => A牌数目, 1 => 2牌数目, ..., 12 => K牌数目
        const pokerArr = new Array(13);
        for(let i = 0; i < pokerArr.length; i++) {
            pokerArr[i] = 0;
        }

        let totalNum = 0;
        const pokerNums = new Array(this.pokers.length);
        // 牌组特征
        let isAllGong = true; // 是否全部是公
        let hasGong = false; // 是否有公牌
        let isFlush = true;  // 是否顺子
        let firstType = this.pokers[0].type;
        this.pokers.forEach((poker, index) => {
            // 统计点数
            let valueNum = self._getValueNum(poker)
            totalNum += valueNum;
            pokerNums[index] = valueNum;

            // 检查是否有公
            let isGong = self._isGong(poker);
            if (isGong) {
                hasGong = true;
            }

            // 统计每种牌数目
            let valuePoint = self._getValuePoint(poker);
            let typePoint = self._getTypePoint(poker.type);
            if (!isGong) {
                let arrIndex = valuePoint - 1;
                pokerArr[arrIndex]++;
            }

            // 检查是否是JQK
            if (!poker.isJQK() && !isGong) {
                isAllGong = false;
            }

            // 记录是否同花
            if (isGong || (isFlush === true && firstType !== poker.type)) {
                isFlush = false;
            }

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
        let isStraight = self._isStraight(this.pokers, pokerArr, this)

        // 统计牌数目种类
        let numberTypes = {
            5: 0,
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
        if (totalNum <= 10 && this._allowResult(this.allowPokerResults, ResultType.WU_XIAO_NIU)) {
            this._calculateSlicePokersByPokerValues(this);
            return ResultType.WU_XIAO_NIU;
        } else if ((numberTypes[4] === 1 || numberTypes[5] === 1) && this._allowResult(this.allowPokerResults, ResultType.ZHA_DAN_NIU)) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 4, this);
            this._calculateSlicePokersByQuantity(pokerArr, 4, this);
            return ResultType.ZHA_DAN_NIU;
        } else if ((numberTypes[2] === 1 && numberTypes[3] === 1) && this._allowResult(this.allowPokerResults, ResultType.HU_LU_NIU)) {
            this._calculatePokerValuePointAndTypePoint(pokerArr, 3, this);
            this._calculateSlicePokersByQuantity(pokerArr, 3, this);
            return ResultType.HU_LU_NIU;
        } else if (isFlush && this._allowResult(this.allowPokerResults, ResultType.TONG_HUA_NIU)) {
            this._calculateSlicePokersByPokerValues(this);
            return ResultType.TONG_HUA_NIU;
        } else if (isStraight && this._allowResult(this.allowPokerResults, ResultType.SHUN_ZI_NIU)) {
            this._calculateSlicePokersByPokerValues(this);
            return ResultType.SHUN_ZI_NIU;
        } else if (isAllGong && this._allowResult(this.allowPokerResults, ResultType.WU_HUA_NIU)) {
            this._calculateSlicePokersByPokerValues(this);
            return ResultType.WU_HUA_NIU;
        } else {
            let niu = this._calculateNiu(pokerNums, this);
            return ResultType[`NIU_${niu}`];
        }
    }

    _calculateSlicePokersByPokerValues(target) {
        const indexs = [0, 1, 2, 3, 4];
        const ps = target.pokers;
        for (let i = 0; i < indexs.length; i++) {
            for (let j = i + 1; j < indexs.length; j++) {
                const pLeft = ps[indexs[i]];
                const pRight = ps[indexs[j]];
                if (pLeft.value > pRight.value) {
                    const t = indexs[i];
                    indexs[i] = indexs[j];
                    indexs[j] = t;
                }
            }
        }
        target.slicePokers = [[indexs[0], indexs[1], indexs[2]], [indexs[3], indexs[4]]];
    }

    _calculateSlicePokersByQuantity(pokerArr, quantity, target) {
        // 0是A
        let pokerValue = 0;
        for(let i = 0; i < pokerArr.length; i++) {
            let pQty = pokerArr[i]
            if (pQty === quantity) {
                pokerValue = i + 1;
                break;
            }
        }
        const firstIndex = [];
        const secondIndex = [];
        target.pokers.forEach((p, index) => {
            if (p.value === pokerValue && firstIndex.length < 3) {
                firstIndex.push(index);
            } else {
                secondIndex.push(index);
            }
        })
        target.slicePokers = [firstIndex, secondIndex];
    }

    _calculateNiu(pokerNums, target) {
        for(let i = 0; i < pokerNums.length - 2; i++) {
            for(let j = i + 1; j < pokerNums.length - 1; j++) {
                for(let k = j + 1; k < pokerNums.length; k++) {
                    let num = pokerNums[i] + pokerNums[j] + pokerNums[k]
                    if (num % 10 !== 0) {
                        continue 
                    }

                    let pointIndex = []
                    let niu = 0
                    for(let index = 0; index < pokerNums.length; index++) {
                        if (index !== i && index !== j && index !== k) {
                            pointIndex.push(index)
                            niu += pokerNums[index]
                        }
                    }
                    target.slicePokers = [[i, j, k], pointIndex]
                    niu = niu % 10
                    return niu === 0 ? 10 : niu
                }
            }
        }

        return 0
    }

    _calculatePokerValuePointAndTypePoint(pokerArr, quantity, target) {
        // 0是A
        let maxPokerValuePoint = 0
        for(let i = 0; i < pokerArr.length; i++) {
            let pQty = pokerArr[i]
            if (pQty !== quantity) {
                continue
            }
            maxPokerValuePoint = i + 1
        }

        let maxPokerTypePoint = 0
        for (let j = 0; j < target.pokers.length; j++) {
            let p = target.pokers[j]
            if (this._getValuePoint(p) !== maxPokerValuePoint) {
                continue;
            }
            let typePoint = this._getTypePoint(p.type);
            if (typePoint > maxPokerTypePoint) {
                maxPokerTypePoint = typePoint;
            }
        }
        target.maxPokerValuePoint = maxPokerValuePoint
        target.maxPokerTypePoint = maxPokerTypePoint
    }

    _isStraight(pokers, pokerArr) {
        if (pokers.length < 5) {
            return false
        }

        let continueCount = 0
        for(let i = 1; i < pokerArr.length; i++) {
            if (pokerArr[i - 1] == 1 && pokerArr[i] == 1) {
                continueCount++
            }
        }
        // 处理10JQKA的情况
        let is10JQKA = pokerArr[0] == 1 
        && pokerArr[pokerArr.length - 1] == 1 
        && pokerArr[pokerArr.length - 2] == 1 
        && pokerArr[pokerArr.length - 3] == 1
        && pokerArr[pokerArr.length - 4] == 1
        if (is10JQKA) {
            continueCount++
        }

        return continueCount === 4
    }

    _getValueNum(poker) {
        if (this._isGong(poker)) {
            return 10;
        }

        let point = PokerValueNumMap[poker.value];
        if (point === undefined) {
            return parseInt(poker.value);
        } else {
            return point;
        }
    }

    _getValuePoint(poker) {
        if (this._isGong(poker)) {
            return poker.value * -1;
        }

        let point = PokerValuePointMap[poker.value]
        if (point === undefined) {
            return parseInt(poker.value)
        } else {
            return point
        }
    }

    _getTypePoint(type) {
        return PokerTypePointMap[type];
    }

    _isGong(poker) {
        return poker.type === NiuNiuPokerType.GONG;
    }

    _allowResult(results, result) {
        return results && results[result] !== undefined;
    }
}
module.exports.Result = Result

const PokerValueNumMap = {
    [Poker.Poker.VALUE.A]: 1,
    [Poker.Poker.VALUE.J]: 10,
    [Poker.Poker.VALUE.Q]: 10,
    [Poker.Poker.VALUE.K]: 10,
}

const PokerValuePointMap = {
    [Poker.Poker.VALUE.A]: 1,
    [Poker.Poker.VALUE.J]: 11,
    [Poker.Poker.VALUE.Q]: 12,
    [Poker.Poker.VALUE.K]: 13,
}

const PokerTypePointMap = {
    [NiuNiuPokerType.GONG]: 0,
    [NiuNiuPokerType.STAR]: 1,
    [NiuNiuPokerType.DIAMOND]: 2,
    [NiuNiuPokerType.CLUB]: 3,
    [NiuNiuPokerType.HEART]: 4,
    [NiuNiuPokerType.SPADE]: 5,
}

const ResultType = {
    NIU_0: 0,              // 没牛
    NIU_1: 1,              // 普通有牛
    NIU_2: 2,              // 普通有牛
    NIU_3: 3,              // 普通有牛
    NIU_4: 4,              // 普通有牛
    NIU_5: 5,              // 普通有牛
    NIU_6: 6,              // 普通有牛
    NIU_7: 7,              // 普通有牛
    NIU_8: 8,              // 普通有牛
    NIU_9: 9,              // 普通有牛
    NIU_10: 10,            // 牛牛
    WU_HUA_NIU: 11,        // 五花牛
    SHUN_ZI_NIU: 12,       // 顺子牛
    TONG_HUA_NIU: 13,      // 同花牛
    HU_LU_NIU: 14,         // 葫芦牛
    ZHA_DAN_NIU: 15,       // 炸弹牛
    WU_XIAO_NIU: 16,       // 五小牛
}
module.exports.ResultType = ResultType