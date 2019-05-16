let mysql = require('mysql')
const pool = mysql.createPool({
    connectionLimit: 4,
    host: '192.168.1.10',
    user: 'root',
    password: 'secret',
    database: 'casino-sanguo'
})

var DB = function () {
}

var d = DB.prototype
var QueryHandler = (cb, err, results, fields) => {
    if (err) {
        console.error(err)
    }

    cb(err, results, fields)
}

d.query = (query, cb) => {
    pool.query(query, QueryHandler.bind(null, cb))
}

d.escape = (val) => {
    return pool.escape(val)
}

d.getConnection = (cb) => {
  pool.getConnection(cb)
}

module.exports = function() {
    return new DB()
}
