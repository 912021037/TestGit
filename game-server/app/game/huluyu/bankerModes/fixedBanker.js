const GAME_PHASE = require('../constants').GAME_PHASE;

class FixedBanker {
    constructor(huluyu) {
        this.game = huluyu;
        this._currentBankerUID = 0;
    }

    onUserRequest(room, user, request) {
        switch (request.action) {
            case 'competeBanker':
                this._competeBanker(room, user.uid, parseInt(request.status));
                break
        }
    }

    onSync(payload) {
        payload.current_banker_uid = this._currentBankerUID;
    }

    onInitNewRoundPlayer(player) {
        player.competedBanker = false;
        player.competedBankerStatus = 0;
    }

    onStartNewRound(room) {
        if (!this._currentBankerUID) {
            this._currentBankerUID = 0;
            this._startCompeteBanker(room);
        } else {
            this.game._startWaitRockDice(room);
        }
    }

    getCurrentBankerUID() {
        return this._currentBankerUID;
    }

    buildSettleRoundData() {
        return {
            banker_uid: this._currentBankerUID,
        }
    }

    _startCompeteBanker(room) {
        const self = this;
        const huluyu = this.game;

        huluyu._currentGamePhase = GAME_PHASE.COMPLETING_BANKER;

        self.competeBankerCountDownTimer = huluyu.newCountdownTimer(huluyu.configs.USER_COMPETE_BANKER_WAIT_MS, 'onCompeteBankerCountdown', () => {
            self._finishCompeteBanker(room);
        })
    }

    _finishCompeteBanker(room) {
        const self = this
        const huluyu = this.game

        if (huluyu._currentGamePhase !== GAME_PHASE.COMPLETING_BANKER) {
            return
        }
        huluyu._currentGamePhase = GAME_PHASE.ROCKING;

        if (self.competeBankerCountDownTimer !== undefined) {
            clearInterval(self.competeBankerCountDownTimer);
            self.competeBankerCountDownTimer = undefined;
        }

        // decide banker
        const players = huluyu._getReadyPlayers();
        const userIds = [];
        for(let i = 0; i < players.length; i++) {
            const p = players[i];
            if (p.competedBanker && p.competedBankerStatus > 0) {
                userIds.push(p.uid);
            }
        }

        if (userIds.length === 0) {
            for(let i = 0; i < players.length; i++) {
                const p = players[i];
                userIds.push(p.uid);
            }
        }

        if (userIds.length === 1) {
            self._decideBanker(room, userIds[0]);
            return;
        }

        let index = huluyu.randomNum(0, userIds.length - 1);
        self._decideBanker(room, userIds[index]);
    }

    _decideBanker(room, uid) {
        const self = this
        const huluyu = this.game

        const player = huluyu.gameRoom.getPlayerByUID(uid);

        self._currentBankerUID = player.uid;

        huluyu.sendResp('onBanker', {
            uid: player.uid,
            delay: huluyu.configs.ON_BANKER_WAIT_MS,
        });

        setTimeout(() => {
            huluyu._startWaitRockDice(room);
        }, huluyu.configs.ON_BANKER_WAIT_MS);
    }

    _competeBanker(room, uid, status) {
        const self = this;
        const huluyu = this.game;

        const p = huluyu.gameRoom.getPlayerByUID(uid);
        if (!p || !p.ready) {
            return;
        }

        if (p.competedBanker) {
            return;
        }

        if (!huluyu.lockUser(uid)) {
            return;
        }

        self._competeBankerAction(room, uid, status);

        huluyu.unlockUser(uid);
        
        if (self._isEveryBodycompeteBanker()) {
            self._finishCompeteBanker(room);
            return;
        }
    }

    _competeBankerAction(room, uid, status) {
        const self = this;
        const huluyu = this.game;

        const p = huluyu.gameRoom.getPlayerByUID(uid);
        p.competedBanker = true;
        p.competedBankerStatus = status;

        self.game.sendResp('onCompeteBanker', {
            uid: p.uid,
            status: status,
        });
    }

    _isEveryBodycompeteBanker() {
        return this.game._checkEveryBodyAttr('competedBanker', true)
    }
}

module.exports = FixedBanker;