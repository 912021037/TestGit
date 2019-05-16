const CODE = require('../../../constants/request').CODE
const path = require('path')
const JwtUtil = require('../../../utils/jwtUtil')
const keyPath = path.resolve(__dirname, '..', '..', '..', '..', 'cert', 'cert.pem')
const jwtUtil = new JwtUtil({
    public: keyPath
})

module.exports = function(app) {
    return new Handler(app)
}

var Handler = function(app) {
    this.app = app
}

var h = Handler.prototype

h.queryEntry = function(msg, session, next) {
    const uid = jwtUtil.getUID(msg.token)
    if (!uid) {
        next(null, {
            code: CODE.FAILURE
        })
        return
    }

    const connectors = this.app.getServersByType('connector')
    if (!connectors || connectors.length === 0) {
        next(null, {
            code: CODE.FAILURE
        })
        return
    }

    const s = connectors[0]
    next(null, {
        code: CODE.SUCCESS,
        host: s.clientHost,
        port: s.clientPort
    })
}