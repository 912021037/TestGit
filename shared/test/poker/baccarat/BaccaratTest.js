const Baccarat = require('../../../game/poker/Baccarat').Baccarat

const game = new Baccarat()
game.start(8)
let count = 0
while(game.canDeal()) {
  count++
  console.log('round: %d', count)
  console.log('before pokers: %d', game.getPokerQuantity())
  console.log('before result logs: ', game.getWinResultLogs())
  console.log('before result count: banker: %d, player: %d, tie: %d', game.getBankerWinCount(), game.getPlayerWinCount(), game.getTieCount())
  let result = game.deal()
  console.log('after pokers: %d', game.getPokerQuantity())
  console.log('after result logs: ', game.getWinResultLogs())
  console.log('after result count: banker: %d, player: %d, tie: %d', game.getBankerWinCount(), game.getPlayerWinCount(), game.getTieCount())
  console.log('banker pokers: ', result.getBankerPokers())
  console.log('player pokers: ', result.getPlayerPokers())
  console.log('point: banker: %d, player: %d', result.getBankerPoint(), result.getPlayerPoint())
  console.log('result: banker: %s, player: %s, tie: %s', result.isBankerWin(), result.isPlayerWin(), result.isTie())
  console.log('pair: banker: %d, player: %d', result.isBankerPair(), result.isPlayerPair())
}