const Poker = require('../../../game/poker/Poker').Poker
const PokerValue = require('../../../game/poker/Poker').Poker.VALUE
const PokerType = require('../../../game/poker/Poker').Poker.TYPE
const Result = require('../../../game/poker/SanGong').Result
const ResultType = require('../../../game/poker/SanGong').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertResultType, assertSlicePokers) {
    result = new Result(0, pokers, {
        [ResultType.TIAN_GONG]: 1,
        [ResultType.BAO_JIU]: 1,
        [ResultType.DA_SAN_GONG]: 1,
        [ResultType.XIAO_SAN_GONG]: 1,
    })
    if (result.type !== assertResultType) {
        console.error('Error! Expect %s but get %s', assertResultType, result.type)
        console.error(result)
        return
    }

    successCount++
    console.log('Success! Total %s', successCount)
}

// 天公
testResult([
    new Poker(PokerType.JOKER, PokerValue["RED_JOKER"]),
    new Poker(PokerType.JOKER, PokerValue["BLACK_JOKER"]),
    new Poker(PokerType.HEART, PokerValue["A"]),
], ResultType.TIAN_GONG);

// 暴玖
testResult([
    new Poker(PokerType.DIAMOND, PokerValue["3"]),
    new Poker(PokerType.CLUB, PokerValue["3"]),
    new Poker(PokerType.HEART, PokerValue["3"]),
], ResultType.BAO_JIU);

// 大三公
testResult([
    new Poker(PokerType.DIAMOND, PokerValue["J"]),
    new Poker(PokerType.CLUB, PokerValue["J"]),
    new Poker(PokerType.HEART, PokerValue["J"]),
], ResultType.DA_SAN_GONG);
testResult([
    new Poker(PokerType.DIAMOND, PokerValue["Q"]),
    new Poker(PokerType.CLUB, PokerValue["Q"]),
    new Poker(PokerType.HEART, PokerValue["Q"]),
], ResultType.DA_SAN_GONG);
testResult([
    new Poker(PokerType.DIAMOND, PokerValue["K"]),
    new Poker(PokerType.CLUB, PokerValue["K"]),
    new Poker(PokerType.HEART, PokerValue["K"]),
], ResultType.DA_SAN_GONG);

// 小三公
testResult([
    new Poker(PokerType.DIAMOND, PokerValue["A"]),
    new Poker(PokerType.CLUB, PokerValue["A"]),
    new Poker(PokerType.HEART, PokerValue["A"]),
], ResultType.XIAO_SAN_GONG);
for (let i = 2; i <= 10; i++) {
    if (i === 3) {
        continue;
    }
    testResult([
        new Poker(PokerType.DIAMOND, PokerValue[i]),
        new Poker(PokerType.CLUB, PokerValue[i]),
        new Poker(PokerType.HEART, PokerValue[i]),
    ], ResultType.XIAO_SAN_GONG);
}

// 雷公
testResult([
    new Poker(PokerType.JOKER, PokerValue["RED_JOKER"]),
    new Poker(PokerType.CLUB, PokerValue["A"]),
    new Poker(PokerType.HEART, PokerValue["A"]),
], ResultType.LEI_GONG);

// 三公
testResult([
    new Poker(PokerType.JOKER, PokerValue["J"]),
    new Poker(PokerType.CLUB, PokerValue["Q"]),
    new Poker(PokerType.HEART, PokerValue["K"]),
], ResultType.SAN_GONG);

// 地公
testResult([
    new Poker(PokerType.JOKER, PokerValue["BLACK_JOKER"]),
    new Poker(PokerType.CLUB, PokerValue["Q"]),
    new Poker(PokerType.HEART, PokerValue["K"]),
], ResultType.DI_GONG);

// 九点
testResult([
    new Poker(PokerType.JOKER, PokerValue["J"]),
    new Poker(PokerType.CLUB, PokerValue["Q"]),
    new Poker(PokerType.HEART, PokerValue["9"]),
], ResultType.POINT_9);

// 8点
testResult([
    new Poker(PokerType.JOKER, PokerValue["A"]),
    new Poker(PokerType.CLUB, PokerValue["3"]),
    new Poker(PokerType.HEART, PokerValue["4"]),
], ResultType.POINT_8);

// 7点
testResult([
    new Poker(PokerType.JOKER, PokerValue["K"]),
    new Poker(PokerType.CLUB, PokerValue["3"]),
    new Poker(PokerType.HEART, PokerValue["4"]),
], ResultType.POINT_7);

// 6点
testResult([
    new Poker(PokerType.JOKER, PokerValue["K"]),
    new Poker(PokerType.CLUB, PokerValue["J"]),
    new Poker(PokerType.HEART, PokerValue["6"]),
], ResultType.POINT_6);

// 5点
testResult([
    new Poker(PokerType.JOKER, PokerValue["7"]),
    new Poker(PokerType.CLUB, PokerValue["8"]),
    new Poker(PokerType.HEART, PokerValue["K"]),
], ResultType.POINT_5);

// 4点
testResult([
    new Poker(PokerType.JOKER, PokerValue["7"]),
    new Poker(PokerType.CLUB, PokerValue["8"]),
    new Poker(PokerType.HEART, PokerValue["9"]),
], ResultType.POINT_4);

// 3点
testResult([
    new Poker(PokerType.JOKER, PokerValue["7"]),
    new Poker(PokerType.CLUB, PokerValue["3"]),
    new Poker(PokerType.HEART, PokerValue["3"]),
], ResultType.POINT_3);

// 2点
testResult([
    new Poker(PokerType.JOKER, PokerValue["2"]),
    new Poker(PokerType.CLUB, PokerValue["9"]),
    new Poker(PokerType.HEART, PokerValue["A"]),
], ResultType.POINT_2);

// 1点
testResult([
    new Poker(PokerType.JOKER, PokerValue["3"]),
    new Poker(PokerType.CLUB, PokerValue["9"]),
    new Poker(PokerType.HEART, PokerValue["9"]),
], ResultType.POINT_1);

// 0点
testResult([
    new Poker(PokerType.JOKER, PokerValue["3"]),
    new Poker(PokerType.CLUB, PokerValue["8"]),
    new Poker(PokerType.HEART, PokerValue["9"]),
], ResultType.POINT_0);

testResult([
    new Poker(PokerType.JOKER, PokerValue["K"]),
    new Poker(PokerType.CLUB, PokerValue["K"]),
    new Poker(PokerType.HEART, PokerValue["10"]),
], ResultType.POINT_0);