const GAME_PHASE = require('../constants').GAME_PHASE;

class RoomOwner {
    constructor(huluyu, room) {
        this.game = huluyu;
        this._currentBankerUID = room.user_id;
    }

    onUserRequest(room, user, request) {
        // do no things
    }

    onSync(payload) {
        payload.current_banker_uid = this._currentBankerUID;
    }

    onInitNewRoundPlayer(player) {
        // do no things
    }

    onStartNewRound(room) {
        this.game._startWaitRockDice(room);
    }

    getCurrentBankerUID() {
        return this._currentBankerUID;
    }

    buildSettleRoundData() {
        return {
            banker_uid: this._currentBankerUID,
        }
    }
}

module.exports = RoomOwner;