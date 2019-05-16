const Poker = require('../../../game/poker/Poker').Poker
const ShowHandResult = require('../../../game/poker/ShowHand').Result
const ShowHandResultType = require('../../../game/poker/ShowHand').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertResultType) {
    result = new ShowHandResult(0, pokers)
    if (result.type !== assertResultType) {
        console.error('Error! Expect %s but get %s', assertResultType, result.type)
        console.error(result)
    } else {
        successCount++
        console.log('Success! Total %s', successCount)
    }
}

// 同花顺
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
], ShowHandResultType.STRAIGHT_FLUSH)

// 4条
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
], ShowHandResultType.FOUR_OF_A_KIND)

// 葫芦
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
], ShowHandResultType.FULL_HOUSE)

// 同花
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
], ShowHandResultType.FLUSH)

// 顺子
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['4']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['5']),
], ShowHandResultType.STRAIGHT)
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['5']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.STRAIGHT)
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['4']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
], ShowHandResultType.HIGH_CARD)

// 三条
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.THREE_OF_A_KIND)

// Two pairs
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['2']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.TWO_PAIRS)

// one pair
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.ONE_PAIRS)

// 单张
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.HIGH_CARD)

// 不足5张的情况
// 同花顺
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
], ShowHandResultType.HIGH_CARD)

// 4条
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['A']),
], ShowHandResultType.FOUR_OF_A_KIND)

// 葫芦
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
], ShowHandResultType.THREE_OF_A_KIND)

// 同花
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['J']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
], ShowHandResultType.HIGH_CARD)

// 顺子
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['4']),
], ShowHandResultType.HIGH_CARD)
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['5']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
], ShowHandResultType.HIGH_CARD)

// 三条
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.THREE_OF_A_KIND)

// Two pairs
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['2']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
], ShowHandResultType.TWO_PAIRS)

// one pair
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['2']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.ONE_PAIRS)

// 单张
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
], ShowHandResultType.HIGH_CARD)

// 三条
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
], ShowHandResultType.THREE_OF_A_KIND)

// one pairs
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
], ShowHandResultType.ONE_PAIRS)
