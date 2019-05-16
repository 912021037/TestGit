const Redis = require('redis')
const ConnectionOptions = {
    host: '192.168.1.10',
    port: 6379,
}

var RedisClient = function () {
}

var p = RedisClient.prototype

p.newConnection = function() {
    let conn = Redis.createClient(ConnectionOptions)
    return conn
}

module.exports = function() {
    return new RedisClient()
}