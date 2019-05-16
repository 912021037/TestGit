const CODE = require('../../../constants/request').CODE
const path = require('path')
const JwtUtil = require('../../../utils/jwtUtil')
const keyPath = path.resolve(__dirname, '..', '..', '..', '..', 'cert', 'cert.pem')
const jwtUtil = new JwtUtil({
    public: keyPath
})
const User = require('../../../models/user')

module.exports = function(app) {
	return new Handler(app)
};

var Handler = function(app) {
  this.app = app
  this.channelService = app.get('channelService')
  this.users = {}
  this.userCount = 0
};

var h = Handler.prototype

/**
 * New client entry.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next step callback
 * @return {Void}
 */
h.entry = function(msg, session, next) {
	const self = this
	const token = msg.token
	const uid = jwtUtil.getUID(token)

	const sessionService = self.app.get('sessionService')

	// duplicate log in
	if (sessionService.getByUid(uid)) {
		next(null, {
			code: CODE.FAILURE
		})
		return
	}

	// bind uid into session
	session.bind(uid)
	let user = User(uid, token)
	user.fetchInfo((res) => {
        if (res === false) {
            next(null, {
                code: CODE.UNAUTHORIZED,
            })
            return;
        }

		session.set('nickname', user.nickname)
		session.set('avatar', user.avatar)
		session.pushAll((err) => {
			if (err) {
				console.error('set user for sesson service failed! error is %j', err.stack)
				next(null, {
					code: CODE.FAILURE
				})
				return
			}

			// push user into user map
			self.users[user.uid] = user
			self.userCount++

			// put user into connector channel
			const sid = self.app.get('serverId')
			let channel = self.channelService.getChannel(sid, true)
			channel.pushMessage({
				route: 'onConnect',
				uid: user.uid,
				nickname: user.nickname,
				users: self.userCount,
			})
			channel.add(user.uid, sid)

			next(null, {
				code: CODE.SUCCESS
			})
		})

		session.on('closed', onUserDisconnect.bind(self, self.app))
	})
}

var onUserDisconnect = function(app, session) {
	if (!session || !session.uid) {
		return
	}

	const self = this
	const uid = session.uid
	const sid = self.app.get('serverId')

	const user = self.users[uid]
	if (!user) {
		return
	}

	self.users[uid] = false
	self.userCount--

	let channel = self.channelService.getChannel(sid, true)
	channel.leave(uid, sid)
	channel.pushMessage({
	  route: 'onDisconnect',
		uid: uid,
		users: self.userCount,
	})

	// kick user from room channel
	const rid = session.get('rid')
	if (rid) {
		app.rpc.game.roomRemote.leave(session, sid, rid, uid, () => {
			// do nothing for framework
		})
	}
}