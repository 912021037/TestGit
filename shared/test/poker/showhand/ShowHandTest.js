const ShowHand = require('../../../game/poker/ShowHand').ShowHand

const game = new ShowHand()
const pokers = game.start(2)
console.log(pokers)