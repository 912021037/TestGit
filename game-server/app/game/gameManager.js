const Fake = require('./fake');
const NiuNiu = require('./niuniu');
const SanGong = require('./sangong');
const ShowHand = require('./showhand');
const ZhaJinHua = require('./zhajinhua');
const HuLuYu = require('./huluyu');
const BaccaratHall = require('./baccarat');

const gameMap = {
    'NIU_NIU': NiuNiu,
    'SAN_GONG': SanGong,
    'SHOW_HAND': ShowHand,
    'ZHA_JIN_HUA': ZhaJinHua,
    'HU_LU_YU': HuLuYu,
    'BACCARAT_HALL': BaccaratHall,
}

module.exports = {
    buildGame: (identity, channel) => {
        let game = gameMap[identity];
        if (!game) {
            return Fake(channel);
        }

        return new game(channel);
    }
}
