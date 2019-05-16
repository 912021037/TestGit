module.exports.GAME_PHASE = {
    COMPLETING_BANKER: 0,
    ROCKING: 1,
    BET: 2,
    REVEAL: 3,
    SETTLE: 4,
}

module.exports.BANKER_MODE = {
    FREE_BANKER: 'free_banker',        // 明牌抢庄
    FIXED_BANKER: 'fixed_banker',      // 明牌撑船
    ROOM_OWNER: 'room_owner',          // 开房当庄
}

module.exports.GAME_RULE = {
    HU_LU_YU: 'hu_lu_yu',           // 葫芦鱼
    QUAN_HU_JI: 'quan_hu_ji',       // 全虎鸡
    ROCK_ONCE: 'rock_once',         // 一摇
    ROCK_ANY: 'rock_any',           // 乱摇
}

module.exports.GAME_PLAY = {
    DAN: 'dan',                     // 单押
    ER_ZHONG_ER: 'er_zhong_er',     // 二中二
    BAO_ZI: 'bao_zi',               // 豹子
}

module.exports.GAME_PLAY_MAP = {
    DAN: 1,             // 单押
    ER_ZHONG_ER: 2,     // 二中二
    BAO_ZI: 3,          // 豹子
}

module.exports.REVEAL_TYPE = {
    QUICK: 1,    // 快开
    SLOW: 2,     // 慢开
}
