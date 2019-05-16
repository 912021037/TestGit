const CODE = require('../../../constants/request').CODE
const Room = require('../../../models/room')

module.exports = function(app) {
	return new Handler(app)
};

var Handler = function(app) {
  this.app = app
};

var h = Handler.prototype

/**
 * entry room
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.join = function(msg, session, next) {
	const self = this
    const rid = msg.rid
    const uid = session.uid
	const sid = session.frontendId

    // check can join
    const room = Room(rid)
    room.allowJoin(uid, function(res){
        if (!res) {
            next(null, {
                code: CODE.FAILURE,
                msg: "不允许加入",
            })
            return
        }
    
        session.set('rid', rid);
        session.push('rid', function(err) {
            if (err) {
                console.error('set rid for session service failed! error is : %j', err.stack)
                next(null, {
                    code: CODE.FAILURE,
                    msg: "连接后端服务器失败",
                })
                return;
            }
            // push into channel
            self.app.rpc.game.roomRemote.join(
                session, 
                sid, 
                rid, 
                uid, 
                session.get('nickname'),
                session.get('avatar'),
                (ret) => {
                    // do nothing for framework
                    if (ret) {
                        next(null, {
                            code: CODE.SUCCESS
                        })
                    } else {
                        next(null, {
                            code: CODE.FAILURE,
                            msg: "系统错误",
                        })
                    }
                }
            )
        })
    })
}

/**
 * leave room
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.leave = function(msg, session, next) {
    const self = this
    const app = self.app
	const sid = session.frontendId 
    const uid = session.uid
    const rid = session.get('rid')

    if (!rid) {
        next(null, {
            code: CODE.FAILURE
        })
    }

	// kick user from chat channel
	app.rpc.game.roomRemote.leave(session, sid, rid, uid, () => {
        session.set('rid', null);
        session.push('rid', function(err) {
            if (err) {
                console.error('set rid for session service failed! error is : %j', err.stack)
                return
            }
        })
        next(null, {
            code: CODE.SUCCESS
        })
	})
}

/**
 * change room owner
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.changeOwner = function(msg, session, next) {
    const self = this
    const rid = session.get('rid')
    const uid = session.uid
    const toUid = msg.uid

    if (!rid || !uid || !toUid) {
        next(null, {
            code: CODE.FAILURE
        })
    }

	self.app.rpc.game.roomRemote.changeOwner(session, rid, uid, toUid, (ret) => {
        if (ret) {
            next(null, {
                code: CODE.SUCCESS
            })
        } else {
            next(null, {
                code: CODE.FAILURE
            })
        }
    })
}

/**
 * dismiss room
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.dismiss = function(msg, session, next) {
    const self = this
    const rid = session.get('rid')
    const uid = session.uid

    if (!rid || !uid) {
        next(null, {
            code: CODE.FAILURE
        })
    }

	self.app.rpc.game.roomRemote.dismiss(session, rid, uid, (ret) => {
        if (ret) {
            next(null, {
                code: CODE.SUCCESS
            })
        } else {
            next(null, {
                code: CODE.FAILURE
            })
        }
    })
}

h.kickUser = function(msg, session, next) {
    const self = this
    const rid = session.get('rid')
    const uid = session.uid
    const toUid = msg.uid

    if (!rid || !uid || !toUid) {
        next(null, {
            code: CODE.FAILURE
        })
    }

	self.app.rpc.game.roomRemote.kick(session, rid, uid, toUid, (ret) => {
        if (ret) {
            next(null, {
                code: CODE.SUCCESS
            })
        } else {
            next(null, {
                code: CODE.FAILURE
            })
        }
    })
}

/**
 * room game request
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.req = function(msg, session, next) {
    const self = this
	const sid = session.frontendId 
    const rid = session.get('rid')
    const uid = session.uid
    const payload = msg.payload

    if (!rid) {
        next(null, {
            code: CODE.FAILURE
        })
    }

	// send user game req to backend
	self.app.rpc.game.roomRemote.req(session, sid, rid, uid, JSON.stringify(payload), (ret) => {
        if (ret) {
            next(null, {
                code: CODE.SUCCESS
            })
        } else {
            next(null, {
                code: CODE.FAILURE
            })
        }
    })
}
