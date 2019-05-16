class Dice {
    constructor(probabilityMap) {
        this.keys = [];
        this.probabilities = [];

        let probability = 0;
        for(let key in probabilityMap) {
            const p = probabilityMap[key];
            probability += p;
            this.keys.push(key);
            this.probabilities.push(probability);
        }
        if (probability > 1) {
            console.error(`dice probability bigger than 1`);
        }
    }

    rock() {
        const rand = Math.random();
        console.log(rand, this.probabilities);
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            const p = this.probabilities[i];
            if (rand < p) {
                return key;
            }
        }
        return this.keys[this.keys.length - 1];
    }
}
module.exports.Dice = Dice;

class NormalDice extends Dice {
    constructor(sizes) {
        if (!sizes) {
            sizes = 6;
        }
        const probability = 1 / sizes;
        const probabilityMap = {};
        for (let i = 1; i <= 6; i++) {
            probabilityMap[i] = probability;
        }
        super(probabilityMap);
    }
}
module.exports.NormalDice = NormalDice;

class Dices {
    constructor(dices) {
        this.dices = dices;
    }

    rock() {
        const keys = [];

        this.dices.forEach((d) => {
            keys.push(d.rock());
        });

        return new Result(keys);
    }
}
module.exports.Dices = Dices;

class Result {
    constructor(keys) {
        this.keys = keys;
        this.keyNumsMap = {};
        this.keys.forEach((k) => {
            if (this.keyNumsMap[k] === undefined) {
                this.keyNumsMap[k] = 0;
            }
            this.keyNumsMap[k]++;
        })
    }

    hasKey(key) {
        return this.getKeyNums(key) > 0;
    }

    getKeyNums(key) {
        const nums = this.keyNumsMap[key];

        return nums ? nums : 0;
    }

    getAllSame() {
        return this.getSame(-1);
    }

    getTwoSame() {
        return this.getSame(2);
    }

    getThreeSame() {
        return this.getSame(3);
    }

    getFourSame() {
        return this.getSame(4);
    }

    getSame(nums) {
        if (nums <= 0) {
            nums = this.keys.length;
        }

        const ret = [];
        for(let key in this.keyNumsMap) {
            const n = this.keyNumsMap[key];
            if (n === nums) {
                ret.push(key);
            }
        }

        return ret;
    }
}
module.exports.Result = Result;
