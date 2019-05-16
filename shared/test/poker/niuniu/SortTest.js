const Poker = require('../../../game/poker/Poker').Poker
const PokerType = require('../../../game/poker/NiuNiu').NiuNiuPokerType
const NiuNiu = require('../../../game/poker/NiuNiu').NiuNiu
const NiuNiuResult = require('../../../game/poker/NiuNiu').Result
const NiuNiuResultType = require('../../../game/poker/NiuNiu').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertSortedIndexs) {
    let results = NiuNiu.calculateResult(pokers, {
        [NiuNiuResultType.WU_XIAO_NIU]: 1,
        [NiuNiuResultType.ZHA_DAN_NIU]: 1,
        [NiuNiuResultType.HU_LU_NIU]: 1,
        [NiuNiuResultType.TONG_HUA_NIU]: 1,
        [NiuNiuResultType.SHUN_ZI_NIU]: 1,
        [NiuNiuResultType.WU_HUA_NIU]: 1,
    })

    NiuNiu.sortResult(results)

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
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['7']),
        new Poker(PokerType.SPADE, Poker.VALUE['3']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['A']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
        new Poker(PokerType.CLUB, Poker.VALUE['7']),
        new Poker(PokerType.HEART, Poker.VALUE['3']),
        new Poker(PokerType.SPADE, Poker.VALUE['7']),
    ],
], [1, 0])

// 2组牌, 同牌型, 最大牌不同
testResult([
    [
        new Poker(PokerType.STAR, Poker.VALUE['3']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['3']),
        new Poker(PokerType.CLUB, Poker.VALUE['4']),
        new Poker(PokerType.HEART, Poker.VALUE['5']),
        new Poker(PokerType.SPADE, Poker.VALUE['5']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['7']),
        new Poker(PokerType.SPADE, Poker.VALUE['3']),
    ],
], [1, 0])

// 2组牌, 不同牌型
testResult([
    [
        new Poker(PokerType.STAR, Poker.VALUE['2']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['2']),
        new Poker(PokerType.SPADE, Poker.VALUE['2']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['A']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
        new Poker(PokerType.CLUB, Poker.VALUE['A']),
        new Poker(PokerType.HEART, Poker.VALUE['A']),
        new Poker(PokerType.SPADE, Poker.VALUE['3']),
    ],
], [1, 0])

// 有公牌斗大小
testResult([
    [
        new Poker(PokerType.GONG, 7),
        new Poker(PokerType.GONG, 6),
        new Poker(PokerType.SPADE, Poker.VALUE['3']),
        new Poker(PokerType.SPADE, Poker.VALUE['4']),
        new Poker(PokerType.SPADE, Poker.VALUE['5']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['6']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['5']),
        new Poker(PokerType.CLUB, Poker.VALUE['3']),
        new Poker(PokerType.HEART, Poker.VALUE['3']),
        new Poker(PokerType.SPADE, Poker.VALUE['5']),
    ],
], [1, 0])

// 总顺序: 五小牛 > 炸弹牛 > 葫芦牛 > 同花牛 > 顺子牛 > 五花牛 > 牛牛 > 牛九 > ... > 牛一 > 没牛
testResult([
    [
        new Poker(PokerType.STAR, Poker.VALUE['6']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
        new Poker(PokerType.CLUB, Poker.VALUE['8']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['10']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['5']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['6']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['6']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['6']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['6']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['8']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['10']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['9']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['8']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['9']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['K']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['J']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['J']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['K']),
        new Poker(PokerType.HEART, Poker.VALUE['Q']),
        new Poker(PokerType.SPADE, Poker.VALUE['K']),
    ],
    [
        new Poker(PokerType.DIAMOND, Poker.VALUE['5']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['9']),
        new Poker(PokerType.SPADE, Poker.VALUE['8']),
        new Poker(PokerType.SPADE, Poker.VALUE['7']),
        new Poker(PokerType.SPADE, Poker.VALUE['6']),
    ],
    [
        new Poker(PokerType.DIAMOND, Poker.VALUE['4']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['9']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['8']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['6']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['J']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
        new Poker(PokerType.CLUB, Poker.VALUE['10']),
        new Poker(PokerType.HEART, Poker.VALUE['10']),
        new Poker(PokerType.SPADE, Poker.VALUE['10']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['8']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['8']),
        new Poker(PokerType.CLUB, Poker.VALUE['8']),
        new Poker(PokerType.HEART, Poker.VALUE['8']),
        new Poker(PokerType.SPADE, Poker.VALUE['8']),
    ],
    [
        new Poker(PokerType.STAR, Poker.VALUE['2']),
        new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
        new Poker(PokerType.CLUB, Poker.VALUE['2']),
        new Poker(PokerType.HEART, Poker.VALUE['2']),
        new Poker(PokerType.SPADE, Poker.VALUE['2']),
    ],
], [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0])