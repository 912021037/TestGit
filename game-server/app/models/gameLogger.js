
const ROOM_GAME_STATUS = require('../constants/model').ROOM_GAME_STATUS
let DB = require('./mysql')
const db = DB()
const TimeUtil = require('../utils/timeUtil')

var GameLogger = function () {
}

var p = GameLogger.prototype

p.checkRoomGameExist = function(roomId, cb) {
    db.query(
        `SELECT count(id) as c FROM casino_room_games
            WHERE casino_room_id = ${db.escape(roomId)}`,
        (err, results, fields) => {
            if (results[0].c > 0) {
                cb(true)
            } else {
                cb(false)
            }
        }
    )
}

p.getLastRoomGameId = function(roomId, cb) {
    db.query(
        `SELECT id FROM casino_room_games
            WHERE casino_room_id = ${db.escape(roomId)}
            ORDER BY id DESC LIMIT 1`,
        (err, results, fields) => {
            if (results.length > 0) {
                cb(results[0].id)
            } else {
                cb(0)
            }
        }
    )

}

p.createRoomGame = function(room, status, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_room_games
            (status, casino_room_id, casino_game_id, casino_game_mode, name, description, options, created_at, updated_at) 
            VALUES 
            (
                ${db.escape(status)},
                ${db.escape(room.id)},
                ${db.escape(room.casino_game_id)},
                ${db.escape(room.mode)},
                ${db.escape(room.name)},
                ${db.escape(room.description)},
                ${db.escape(JSON.stringify(room.options))},
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

p.setRoomGameStatus = function(roomGameId, status, cb) {
    const now = TimeUtil.getNowDateTimeString()

    db.query(
        `UPDATE casino_room_games SET
            status = ${db.escape(status)},
            updated_at = ${db.escape(now)}
            WHERE id = ${db.escape(roomGameId)}`,
        (err, results, fields) => {
            if (results.affectedRows <= 0) {
                cb(false)
            } else {
                cb(true)
            }
        }
    )
}

p.createRoomGameUser = function(room, roomGameId, userId, position, balance, nickname, avatar, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_room_game_users
            (user_id, casino_room_id, casino_room_game_id, position, balance, nickname, avatar, created_at, updated_at) 
            VALUES 
            (
                ${db.escape(userId)},
                ${db.escape(room.id)},
                ${db.escape(roomGameId)},
                ${db.escape(position)},
                ${db.escape(balance)},
                ${db.escape(nickname)},
                ${db.escape(avatar)},
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

p.getCurrentGameRounds = function(roomId, roomGameId, cb) {
    db.query(
        `SELECT count(id) as c
            FROM casino_room_game_rounds
            WHERE casino_room_id = ${db.escape(roomId)}
            AND casino_room_game_id = ${db.escape(roomGameId)}`,
        (err, results, fields) => {
            cb(results[0].c)
        }
    )
}

p.createRoomGameRound = function(roomId, roomGameId, data, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_room_game_rounds
            (casino_room_id, casino_room_game_id, data, created_at, updated_at) 
            VALUES 
            (
                ${db.escape(roomId)},
                ${db.escape(roomGameId)},
                ${db.escape(JSON.stringify(data))},
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

p.createRoomGameRoundUser = function(roundId, roomId, roomGameId, userId, point, data, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_room_game_round_users
            (user_id, casino_room_id, casino_room_game_id, casino_room_game_round_id, point, data, created_at, updated_at) 
            VALUES 
            (
                ${db.escape(userId)},
                ${db.escape(roomId)},
                ${db.escape(roomGameId)},
                ${db.escape(roundId)},
                ${db.escape(point)},
                ${db.escape(JSON.stringify(data))},
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

module.exports = function() {
	return new GameLogger()
};