let mid = 0

class BaseGame {
    constructor(channel) {
        this.channel = channel
        this.usersLock = {}
    }

    lockUser(uid) {
        if (this.usersLock[uid] !== undefined) {
            return false
        }
        this.usersLock[uid] = true
        return true
    }

    unlockUser(uid) {
        this.usersLock[uid] = undefined
    }

    newCountdownTimer(totalMS, timerEvent, cb) {
      const self = this

      let interval = 1000
      let now = Math.ceil(totalMS / interval)

      self.sendResp(`${timerEvent}Start`)

      self.sendResp(timerEvent, {
          timer: now,
      })

      const timer = setInterval(() => {
          now--
          self.sendResp(timerEvent, {
              timer: now,
          })
          if (now <= 0) {
            clearInterval(timer);
            cb();
          }
      }, interval)

      return timer;
    }

    onInit (room) {
        console.log('base game on init stun')
    }

    onUserJoinRoom (room, user) {
        console.log('base game on user join room stun')
    }

    onUserLeaveRoom (room, user) {
        console.log('base game on user leave room stun')
    }

    onDismissRoom (room) {
        console.log('base game on dismiss room stun')
    }

    onUserRequest (room, user, request) {
        console.log('base game on user request stun')
    }

    sendResp(type, payload) {
        this.sendRespByChannel(this.channel, type, payload)
    }

    sendRespByChannel(channel, type, payload) {
        mid++

        if (!payload) {
            payload = {
                type: type,
            }
        } else {
            payload.type = type
        }

        channel.pushMessage({
            route: 'onRoomResp',
            mid: mid,
            resp: payload,
        })
    }

    randomNum(minNum, maxNum){ 
        switch(arguments.length){ 
            case 1: 
                return parseInt(Math.random() * minNum + 1, 10);
            case 2: 
                return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10); 
            default: 
                return 0; 
        } 
    } 

    drawLottery(quantity, totalQuantity) {
        let rate = quantity / totalQuantity
        let res = Math.random()
        console.log('draw lottery, rate: %s, res: %s', rate, res)
        if (res <= rate) {
            return true
        } else {
            return false
        }
    }

    useLuck(players, luckName, uidName) {
        if (!luckName) {
            luckName = 'luck'
        }

        if (!uidName) {
            uidName = 'uid'
        }

        let firstPlayerLuck = undefined
        let maxPlayerLuckUID = undefined
        let maxPlayerLuck = undefined
        let luckIsSame = true
        let totalLuck = 0

        for(let i = 0; i < players.length; i++) {
            const p = players[i]
            let luck = p[luckName]
            if (luck === undefined) {
                return undefined
            }

            if (firstPlayerLuck === undefined) {
                firstPlayerLuck = luck
                maxPlayerLuckUID = p[uidName]
                maxPlayerLuck = luck
            }

            if (luck > maxPlayerLuck) {
                maxPlayerLuckUID = p[uidName]
                maxPlayerLuck = luck
                luckIsSame = false
            } else if (luck < maxPlayerLuck) {
                luckIsSame = false
            }

            totalLuck += luck
        }

        return luckIsSame === false ? [maxPlayerLuckUID, maxPlayerLuck, totalLuck] : undefined
    }
}

module.exports = BaseGame