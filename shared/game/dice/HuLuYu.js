const DiceModule = require('./Dice');

class Dice extends DiceModule.Dice {
    constructor(probabilities) {
        const psMap = {};
        probabilities.forEach((p, index) => {
            psMap[index + 1] = p;
        });
        super(psMap);
    }
}

class Dices extends DiceModule.Dices {
    constructor(diceProbabilities) {
        const dices = [];
        diceProbabilities.forEach((probabilities) => {
            const dice = new Dice(probabilities);
            dices.push(dice);
        });
        super(dices);
    }
}

class HuLuYu {
    constructor(diceProbabilities) {
        this.diceProbabilities = diceProbabilities;
        this.dices = new Dices(diceProbabilities);
    }

    start() {
        return new Result(this.dices.rock());
    }
}
module.exports.HuLuYu = HuLuYu;

class Result {
    constructor(diceResult) {
        this.diceResult = diceResult;
        this.dices = diceResult.keys.map((k) => {
            return parseInt(k);
        });
    }

    getFaceNum(face) {
        return this.diceResult.getKeyNums(face);
    }

    getDices() {
        return this.dices;
    }
}
module.exports.Result = Result;

const FACES = {
    HU: 1,      // 虎
    HU_LU: 2,   // 葫芦
    JI: 3,      // 鸡
    XIE: 4,     // 蟹
    YU: 5,      // 鱼
    XIA: 6,     // 虾
};
module.exports.FACES = FACES;