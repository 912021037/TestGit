const Poker = require('../../../game/poker/Poker').Poker
const ShowHand = require('../../../game/poker/ShowHand').ShowHand
const ShowHandResult = require('../../../game/poker/ShowHand').Result
const ShowHandResultType = require('../../../game/poker/ShowHand').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertSortedIndexs) {
    let results = ShowHand.calculateResult(pokers)

    ShowHand.sortResult(results)

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

// 2组牌, 不同牌型
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
    ],
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['J']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    ],
], [1, 0])

// 2组牌, 同牌型, 不同点数
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
    ],
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['J']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    ],
], [1, 0])

// 2组牌, 同牌型, 同点数, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    ],
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['J']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    ],
], [1, 0])

// 3组牌, 不同牌型
testResult([
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    ],
], [2, 0, 1])

// 不同单只
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    ],
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    ],
], [1, 0])

// 一对, 不同大小
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['3']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
    ],
], [1, 0])

// 一对, 同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
    ],
], [1, 0])

// 两对, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    ],
], [1, 0])

// 两对, 一对同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    ],
], [1, 0])

// 三条, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['J']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['J']),
    ],
], [1, 0])

// 顺子, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['8']),
    ],
], [1, 0])

// 顺子, 同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['7']),
    ],
], [1, 0])

// 同花, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['9']),
    ],
], [1, 0])

// 同花, 同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['8']),
    ],
], [1, 0])

// 葫芦, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['10']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
    ],
], [1, 0])

// 四条, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['7']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['7']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['10']),
    ],
], [1, 0])

// 同花顺, 不同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['8']),
    ],
], [1, 0])

// 同花顺, 同大小, 不同花色
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['7']),
    ],
], [1, 0])

// 总顺序: 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 单张(单张时比底牌)
testResult([
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['8']),
    ],
    [
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['9']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['7']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['8']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
        new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
        new Poker(Poker.TYPE.SPADE, Poker.VALUE['3']),
        new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
    ],
    [
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['4']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
        new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
    ],
], [9, 8, 7, 6, 5, 4, 3, 2, 1, 0])