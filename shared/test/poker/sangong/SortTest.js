const Poker = require('../../../game/poker/Poker').Poker
const PokerValue = require('../../../game/poker/Poker').Poker.VALUE
const PokerType = require('../../../game/poker/Poker').Poker.TYPE
const SanGong = require('../../../game/poker/SanGong').SanGong
const Result = require('../../../game/poker/SanGong').Result
const ResultType = require('../../../game/poker/SanGong').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertSortedIndexs) {
    let results = SanGong.calculateResult(pokers, {
        [ResultType.TIAN_GONG]: 1,
        [ResultType.BAO_JIU]: 1,
        [ResultType.DA_SAN_GONG]: 1,
        [ResultType.XIAO_SAN_GONG]: 1,
    });

    SanGong.sortResult(results);

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
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['8']),
    ],
    [
        new Poker(PokerType.CLUB, PokerValue['2']),
        new Poker(PokerType.HEART, PokerValue['7']),
        new Poker(PokerType.SPADE, PokerValue['8']),
    ],
], [1, 0])

// 2组牌, 同牌型, 最大牌不同
testResult([
    [
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['Q']),
    ],
    [
        new Poker(PokerType.CLUB, PokerValue['2']),
        new Poker(PokerType.HEART, PokerValue['7']),
        new Poker(PokerType.SPADE, PokerValue['K']),
    ],
], [1, 0])

// 2组牌, 不同牌型
testResult([
    [
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['6']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['Q']),
    ],
    [
        new Poker(PokerType.CLUB, PokerValue['2']),
        new Poker(PokerType.HEART, PokerValue['7']),
        new Poker(PokerType.SPADE, PokerValue['K']),
    ],
], [1, 0])

// 总顺序: 天公 > 暴玖 > 大三公 > 小三公 > 雷公 > 三公 > 地公 > 9点 > ... > 1点 > 0点
testResult([
    [
        new Poker(PokerType.JOKER, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["10"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["A"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["8"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["9"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["BLACK_JOKER"]),
        new Poker(PokerType.CLUB, PokerValue["2"]),
        new Poker(PokerType.HEART, PokerValue["2"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["RED_JOKER"]),
        new Poker(PokerType.CLUB, PokerValue["2"]),
        new Poker(PokerType.HEART, PokerValue["2"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["J"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["K"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["2"]),
        new Poker(PokerType.CLUB, PokerValue["2"]),
        new Poker(PokerType.HEART, PokerValue["2"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["4"]),
        new Poker(PokerType.CLUB, PokerValue["4"]),
        new Poker(PokerType.HEART, PokerValue["4"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["J"]),
        new Poker(PokerType.CLUB, PokerValue["J"]),
        new Poker(PokerType.HEART, PokerValue["J"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["Q"]),
        new Poker(PokerType.CLUB, PokerValue["Q"]),
        new Poker(PokerType.HEART, PokerValue["Q"]),
    ],
    [
        new Poker(PokerType.DIAMOND, PokerValue["3"]),
        new Poker(PokerType.CLUB, PokerValue["3"]),
        new Poker(PokerType.HEART, PokerValue["3"]),
    ],
    [
        new Poker(PokerType.JOKER, PokerValue["RED_JOKER"]),
        new Poker(PokerType.JOKER, PokerValue["BLACK_JOKER"]),
        new Poker(PokerType.HEART, PokerValue["A"]),
    ],
], [13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])