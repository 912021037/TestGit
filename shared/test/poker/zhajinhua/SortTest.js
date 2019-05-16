const Poker = require('../../../game/poker/Poker').Poker
const ZhaJinHuaGame = require('../../../game/poker/ZhaJinHua');
const { ZhaJinHua, Result, ResultType } = ZhaJinHuaGame;

// Test result
let successCount = 0
function testResult(pokers, assertSortedIndexs) {
    let results = ZhaJinHua.calculateResult(pokers)

    ZhaJinHua.sortResult(results)

    let isFail = false
    for(let i = 0; i < results.length; i++) {
        let res = results[i]
        let assertIndex = assertSortedIndexs[i]
        if (res.index !== assertIndex) {
            console.error('Error! Expect %j but get %j', res.index, assertIndex)
            console.error(pokers, results, assertSortedIndexs)
            isFail = true
            break
        }
    }

    if (!isFail) {
        successCount++
        console.log('Success! Total %s', successCount)
    }
}

// 2组牌, 同牌型, 最大牌同, 花色不同
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
    ],
], [1, 0])

// 2组牌, 同牌型, 最大牌不同
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    ],
], [1, 0])

// 2组牌, 不同牌型
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    ],
], [1, 0])

// 总顺序: 豹子 > 同花顺 > 同花 > 顺子 > 对子 > 散牌
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['8']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['8']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['5']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    ],
], [6, 5, 4, 3, 2, 1, 0]);