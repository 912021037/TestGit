const Poker = require('../../../game/poker/Poker').Poker
const ZhaJinHuaGame = require('../../../game/poker/ZhaJinHua');
const { ZhaJinHua, Result, ResultType } = ZhaJinHuaGame;

// Test result
let successCount = 0
function testResult(pokers, assertResultType) {
    result = new Result(0, pokers)
    if (result.type !== assertResultType) {
        console.error('Error! Expect %s but get %s', assertResultType, result.type);
        console.error(result);
        return
    }

    successCount++;
    console.log('Success! Total %s', successCount);
}

// 豹子
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['A']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
], ResultType.BAO_ZI);
testResult([
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['K']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
], ResultType.BAO_ZI);

// 同花顺
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
], ResultType.STRAIGHT_FLUSH);
testResult([
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['4']),
], ResultType.STRAIGHT_FLUSH);
testResult([
    new Poker(Poker.TYPE.HEART, Poker.VALUE['10']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['J']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['Q']),
], ResultType.STRAIGHT_FLUSH);
testResult([
    new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['J']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['Q']),
], ResultType.STRAIGHT_FLUSH);
testResult([
    new Poker(Poker.TYPE.HEART, Poker.VALUE['Q']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
], ResultType.STRAIGHT_FLUSH);

// 同花
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
], ResultType.FLUSH);
testResult([
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['3']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['6']),
    new Poker(Poker.TYPE.SPADE, Poker.VALUE['8']),
], ResultType.FLUSH);

// 顺子
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['Q']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
], ResultType.STRAIGHT);
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['2']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['3']),
], ResultType.STRAIGHT);

// 对子
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
], ResultType.PAIR);
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['K']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['A']),
], ResultType.PAIR);
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['6']),
], ResultType.PAIR);

// 散牌
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['6']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['5']),
], ResultType.HIGH_CARD);
testResult([
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['3']),
    new Poker(Poker.TYPE.CLUB, Poker.VALUE['8']),
    new Poker(Poker.TYPE.HEART, Poker.VALUE['9']),
], ResultType.HIGH_CARD);