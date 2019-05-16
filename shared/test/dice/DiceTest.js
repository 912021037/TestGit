const Dice = require('../../game/dice/Dice');

(function () {
    let dice = new Dice.Dice({
        1: 0.2,
        2: 0.2,
        3: 0.6,
    });
    console.log(dice.rock());
})();

(function(){
    let normalDice = new Dice.NormalDice();
    console.log(normalDice.rock());
})();

(function(){
    const sizes = 6;
    const nums = 5;
    const ds = [];
    for (let i = 0; i < nums; i++) {
        const dice = new Dice.NormalDice(sizes);
        ds.push(dice);
    }
    const dices = new Dice.Dices(ds);
    const result = dices.rock();
    console.log(result);

    for(let i = 1; i <= sizes; i++) {
        console.log(`key ${i}, has: ${result.hasKey(i)}, nums: ${result.getKeyNums(i)}`);
    }

    console.log(`get all same: `, result.getAllSame());
    console.log(`get two same: `, result.getTwoSame());
    console.log(`get three same: `, result.getThreeSame());
    console.log(`get four same: `, result.getFourSame());
})();