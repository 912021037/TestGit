const fs = require('fs')
const jwt = require('jsonwebtoken')

module.exports = function(options) {
    return new JwtUtil(options)
}

var JwtUtil = function(options) {
    this.publicKey = fs.readFileSync(options.public)
}

var j = JwtUtil.prototype

j.getUID = function(token) {
    try {
        decoded = jwt.verify(token, this.publicKey, { algorithms: ['RS256'] })
        if (!decoded || !decoded.uid) {
            return undefined
        }
        return decoded.uid
    } catch (err) {
        console.error(err)
        return undefined
    }
}

j.isLogin = function(token) {
    const uid = j.getUID(token)
    return uid !== undefined
}