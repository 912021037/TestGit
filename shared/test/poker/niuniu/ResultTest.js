const Poker = require('../../../game/poker/Poker').Poker
const PokerType = require('../../../game/poker/NiuNiu').NiuNiuPokerType
const NiuNiuResult = require('../../../game/poker/NiuNiu').Result
const NiuNiuResultType = require('../../../game/poker/NiuNiu').ResultType

// Test result
let successCount = 0
function testResult(pokers, assertResultType, assertSlicePokers) {
    result = new NiuNiuResult(0, pokers, {
        [NiuNiuResultType.WU_XIAO_NIU]: 1,
        [NiuNiuResultType.ZHA_DAN_NIU]: 1,
        [NiuNiuResultType.HU_LU_NIU]: 1,
        [NiuNiuResultType.TONG_HUA_NIU]: 1,
        [NiuNiuResultType.SHUN_ZI_NIU]: 1,
        [NiuNiuResultType.WU_HUA_NIU]: 1,
    })
    if (result.type !== assertResultType) {
        console.error('Error! Expect %s but get %s', assertResultType, result.type)
        console.error(result)
        return
    }

    if (assertSlicePokers !== undefined) {
        const assertFirstIndexs = assertSlicePokers[0];
        const firstIndexs = result.slicePokers[0];
        let firstIndexsRight = true;
        assertFirstIndexs.forEach((i) => {
            if (firstIndexs.indexOf(i) < 0) {
                console.error('Error! Expect %s but get %s', i, firstIndexs);
                firstIndexsRight = false;
            }
        })

        const assertSecondIndexs = assertSlicePokers[1];
        const secondsIndexs = result.slicePokers[1];
        let secondIndexsRight = true;
        assertSecondIndexs.forEach((i) => {
            if (secondsIndexs.indexOf(i) < 0) {
                console.error('Error! Expect %s but get %s', i, secondsIndexs);
                secondIndexsRight = false;
            }
        })
        if (!firstIndexsRight || !secondIndexsRight) {
            console.error('Error! Slice Pokers Error! Except %s but get %s', assertSlicePokers, result.slicePokers);
            console.error(result)
            return
        }
    }
    successCount++
    console.log('Success! Total %s', successCount)
}

// 五小牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['A']),
    new Poker(PokerType.SPADE, Poker.VALUE['A']),
], NiuNiuResultType.WU_XIAO_NIU)

testResult([
    new Poker(PokerType.DIAMOND, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['2']),
    new Poker(PokerType.SPADE, Poker.VALUE['A']),
], NiuNiuResultType.WU_XIAO_NIU, [[1, 2, 4], [0, 3]])

testResult([
    new Poker(PokerType.DIAMOND, Poker.VALUE['5']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['A']),
    new Poker(PokerType.STAR, Poker.VALUE['A']),
], NiuNiuResultType.WU_XIAO_NIU)

// 炸弹牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.SPADE, Poker.VALUE['K']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['A']),
], NiuNiuResultType.ZHA_DAN_NIU, [[0, 1, 3], [2, 4]])

// 五花牛
testResult([
    new Poker(PokerType.SPADE, Poker.VALUE['K']),
    new Poker(PokerType.STAR, Poker.VALUE['J']),
    new Poker(PokerType.CLUB, Poker.VALUE['Q']),
    new Poker(PokerType.HEART, Poker.VALUE['Q']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
], NiuNiuResultType.WU_HUA_NIU, [[1, 3, 4], [0, 2]])
testResult([
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.GONG, 2),
    new Poker(PokerType.CLUB, Poker.VALUE['Q']),
    new Poker(PokerType.HEART, Poker.VALUE['Q']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
], NiuNiuResultType.WU_HUA_NIU, [[0, 1, 4], [3, 2]])

// 葫芦牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['J']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.CLUB, Poker.VALUE['J']),
    new Poker(PokerType.HEART, Poker.VALUE['J']),
    new Poker(PokerType.SPADE, Poker.VALUE['2']),
], NiuNiuResultType.HU_LU_NIU, [[0, 2, 3], [1, 4]])

// 同花牛
testResult([
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['8']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['6']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['9']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
], NiuNiuResultType.TONG_HUA_NIU, [[0, 2, 1], [3, 4]])

// 顺子牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.CLUB, Poker.VALUE['3']),
    new Poker(PokerType.HEART, Poker.VALUE['4']),
    new Poker(PokerType.SPADE, Poker.VALUE['5']),
], NiuNiuResultType.SHUN_ZI_NIU)
testResult([
    new Poker(PokerType.HEART, Poker.VALUE['K']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
    new Poker(PokerType.STAR, Poker.VALUE['10']),
    new Poker(PokerType.SPADE, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['Q']),
], NiuNiuResultType.SHUN_ZI_NIU)
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['2']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
    new Poker(PokerType.CLUB, Poker.VALUE['Q']),
    new Poker(PokerType.HEART, Poker.VALUE['K']),
    new Poker(PokerType.SPADE, Poker.VALUE['A']),
], NiuNiuResultType.NIU_3)
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['K']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['2']),
    new Poker(PokerType.HEART, Poker.VALUE['3']),
    new Poker(PokerType.SPADE, Poker.VALUE['4']),
], NiuNiuResultType.NIU_0)

// 牛牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.CLUB, Poker.VALUE['J']),
    new Poker(PokerType.HEART, Poker.VALUE['5']),
    new Poker(PokerType.SPADE, Poker.VALUE['K']),
], NiuNiuResultType.NIU_10)
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.HEART, Poker.VALUE['5']),
    new Poker(PokerType.SPADE, Poker.VALUE['K']),
], NiuNiuResultType.NIU_10)
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['10']),
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.GONG, 2),
    new Poker(PokerType.GONG, 3),
    new Poker(PokerType.GONG, 4),
], NiuNiuResultType.NIU_10)

// 牛九
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['2']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['5']),
    new Poker(PokerType.SPADE, Poker.VALUE['8']),
], NiuNiuResultType.NIU_9);
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['6']),
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.GONG, 2),
    new Poker(PokerType.GONG, 3),
], NiuNiuResultType.NIU_9);

// 牛八
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['10']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
    new Poker(PokerType.CLUB, Poker.VALUE['8']),
    new Poker(PokerType.HEART, Poker.VALUE['2']),
    new Poker(PokerType.SPADE, Poker.VALUE['8']),
], NiuNiuResultType.NIU_8)

// 牛七
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['J']),
    new Poker(PokerType.CLUB, Poker.VALUE['7']),
    new Poker(PokerType.HEART, Poker.VALUE['2']),
    new Poker(PokerType.SPADE, Poker.VALUE['7']),
], NiuNiuResultType.NIU_7)

// 牛六
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['K']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['K']),
    new Poker(PokerType.CLUB, Poker.VALUE['6']),
    new Poker(PokerType.HEART, Poker.VALUE['10']),
    new Poker(PokerType.SPADE, Poker.VALUE['Q']),
], NiuNiuResultType.NIU_6)

// 牛五
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['2']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['K']),
    new Poker(PokerType.HEART, Poker.VALUE['5']),
    new Poker(PokerType.SPADE, Poker.VALUE['7']),
], NiuNiuResultType.NIU_5)

// 牛四
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['3']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['3']),
    new Poker(PokerType.CLUB, Poker.VALUE['K']),
    new Poker(PokerType.HEART, Poker.VALUE['4']),
    new Poker(PokerType.SPADE, Poker.VALUE['4']),
], NiuNiuResultType.NIU_4)

// 牛三
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['A']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['4']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['9']),
    new Poker(PokerType.SPADE, Poker.VALUE['8']),
], NiuNiuResultType.NIU_3)

// 牛二
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['J']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['4']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['9']),
    new Poker(PokerType.SPADE, Poker.VALUE['8']),
], NiuNiuResultType.NIU_2)

// 牛一
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['J']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['4']),
    new Poker(PokerType.CLUB, Poker.VALUE['A']),
    new Poker(PokerType.HEART, Poker.VALUE['9']),
    new Poker(PokerType.SPADE, Poker.VALUE['7']),
], NiuNiuResultType.NIU_1)

// 没牛
testResult([
    new Poker(PokerType.STAR, Poker.VALUE['10']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['3']),
    new Poker(PokerType.HEART, Poker.VALUE['2']),
    new Poker(PokerType.SPADE, Poker.VALUE['4']),
], NiuNiuResultType.NIU_0)

testResult([
    new Poker(PokerType.STAR, Poker.VALUE['6']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
    new Poker(PokerType.CLUB, Poker.VALUE['8']),
    new Poker(PokerType.HEART, Poker.VALUE['10']),
    new Poker(PokerType.SPADE, Poker.VALUE['10']),
], NiuNiuResultType.NIU_0)

testResult([
    new Poker(PokerType.STAR, Poker.VALUE['6']),
    new Poker(PokerType.DIAMOND, Poker.VALUE['7']),
    new Poker(PokerType.CLUB, Poker.VALUE['8']),
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.GONG, 2),
], NiuNiuResultType.NIU_0)

testResult([
    new Poker(PokerType.GONG, 1),
    new Poker(PokerType.DIAMOND, Poker.VALUE['A']),
    new Poker(PokerType.CLUB, Poker.VALUE['2']),
    new Poker(PokerType.HEART, Poker.VALUE['A']),
    new Poker(PokerType.SPADE, Poker.VALUE['A']),
], NiuNiuResultType.NIU_0)
