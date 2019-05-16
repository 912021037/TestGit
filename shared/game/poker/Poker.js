const util = require('../Util')

class Poker {
    constructor(type, value) {
        this.type = type
        this.value = value
    }

    isJQK() {
        return this.value === Poker.VALUE.J ||
        this.value === Poker.VALUE.Q ||
        this.value === Poker.VALUE.K
    }
}

Poker.TYPE = {
    DIAMOND: 1, // 方块
    CLUB: 2,       // 梅花
    HEART: 3,     // 红桃
    SPADE: 4,     // 黑桃
    JOKER: 5,
}

Poker.VALUE = {
    A: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    9: 9,
    10: 10,
    J: 11,
    Q: 12,
    K: 13,
    BLACK_JOKER: 14,
    RED_JOKER: 15,
}
module.exports.Poker = Poker

class Pokers {
    constructor(pokers) {
      this.pokers = pokers
      this.isNew = false
      this.position = 0
    }

    shuffle() {
      this.pokers = util.shuffle(this.pokers)
      this.isNew = true
      this.position = 0
    }

    hasMore() {
      if (this.position < this.pokers.length) {
        return true
      } else {
        return false
      }
    }

    getPokerQuantity() {
      return this.pokers.length - this.position
    }

    dealOne() {
        const poker = this.pokers[this.position]
        this.position += 1
        return poker
    }

    deal(playerQuantity, pokerQuantity) {
        const ret = []

        for(let i = 0; i < playerQuantity; i++) {
            ret.push([])
        }
        for(let i = 0; i < pokerQuantity; i++) {
            for(let j = 0; j < playerQuantity; j++) {
                ret[j].push(this.dealOne())
            } 
        }

        return ret
    }
}
module.exports.Pokers = Pokers

class PokersWithoutJoker extends Pokers {
    constructor() {
        const pokers = []
        Object.keys(Poker.TYPE).forEach(typeKey => {
            if (Poker.TYPE.JOKER === Poker.TYPE[typeKey]) {
                return
            }
            Object.keys(Poker.VALUE).forEach(valueKey => {
                if (Poker.VALUE.BLACK_JOKER === Poker.VALUE[valueKey] || Poker.VALUE.RED_JOKER === Poker.VALUE[valueKey]) {
                    return
                }
                pokers.push(new Poker(Poker.TYPE[typeKey], Poker.VALUE[valueKey]))
            })
        })
        super(pokers)
    }
}
module.exports.PokersWithoutJoker = PokersWithoutJoker

class PokersWithJoker extends PokersWithoutJoker {
    constructor() {
        super()
        this.pokers.push(new Poker(Poker.TYPE.JOKER, Poker.VALUE.BLACK_JOKER))
        this.pokers.push(new Poker(Poker.TYPE.JOKER, Poker.VALUE.RED_JOKER))
    }
}
module.exports.PokersWithJoker = PokersWithJoker