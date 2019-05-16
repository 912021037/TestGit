const Poker = require('../../../game/poker/Poker').Poker
const Result = require('../../../game/poker/Baccarat').Result
const RESULT_TYPE = require('../../../game/poker/Baccarat').RESULT_TYPE

// Test result
let successCount = 0
function testResult(bankerPokers, playerPokers, assertResult) {
  let result = new Result(bankerPokers, playerPokers)
  if (result.type !== assertResult) {
    console.error('Error! Expect %s but get %s', assertResult, result.type)
    console.error(result)
  } else {
    successCount++
    console.log('Success! Total %s', successCount)
  }
}

testResult(
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['K']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
  ],
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
  ],
  RESULT_TYPE.BANKER_WIN
)

testResult(
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['A']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
  ],
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
  ],
  RESULT_TYPE.PLAYER_WIN
)

testResult(
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['7']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['9']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['6']),
  ],
  [
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['10']),
    new Poker(Poker.TYPE.DIAMOND, Poker.VALUE['2']),
  ],
  RESULT_TYPE.TIE
)