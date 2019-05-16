let DB = require('./mysql')
const db = DB()
const TimeUtil = require('../utils/timeUtil');

var User = function (uid, token) {
    this.uid = uid
    this.token = token
    this.nickname = ''
    this.avatar = ''
    this.frontendServerId = ''
    this.channel = null
}

var u = User.prototype
u.fetchInfo = function(cb) {
    var self = this
    db.query(`SELECT * FROM user_profiles WHERE user_id = ${db.escape(self.uid)}`, (err, results, fields) => {
        results.forEach((r) => {
            if (r.name === 'nickname') {
                self.nickname = r.value
            } else if (r.name === 'avatar') {
                self.avatar = r.value
            }
        })
        if (results.length > 0) {
            cb(true);
        } else {
            cb(false);
        }
    })
}

u.fetchConfigs = function(userIds, cb) {
    var self = this
    db.query(
        `SELECT * FROM casino_user_config 
            WHERE user_id IN (${userIds.join(',')})`, cb)
}

const ROOM_CARD_TRANSACTION = {
    ACCOUNT_ENTITY_TYPE: 1,
    ACCOUNT_TYPE: 10,
    TARGET_TYPE: {
        DEFAULT: 2,
    },
    TRANSACTION_TYPE: {
        CONSUME: 1,
        RETURN: 2,
    },
};

u.changeRoomCardBalance = function(userId, amount, options, cb) {
    amount = parseInt(amount, 10);

    if (!amount) {
        console.error(`change room card balance error, invalid amount, uid: ${userId}, amount: ${amount}`);
        cb(false)
        return
    }

    if (typeof options === 'function') {
        cb = options
        options = {
            targetType: ROOM_CARD_TRANSACTION.TARGET_TYPE.DEFAULT,
            targetId: 0,
            type: amount > 0 ? ROOM_CARD_TRANSACTION.TRANSACTION_TYPE.RETURN : ROOM_CARD_TRANSACTION.TRANSACTION_TYPE.CONSUME,
            description: '',
        }
    } else {
        options.targetType = options.targetType || ROOM_CARD_TRANSACTION.TARGET_TYPE.DEFAULT;
        options.targetId = options.targetId || 0;
        options.type = options.type || (amount > 0 ? ROOM_CARD_TRANSACTION.TRANSACTION_TYPE.RETURN : ROOM_CARD_TRANSACTION.TRANSACTION_TYPE.CONSUME)
        options.description = options.description || ''
    }

    db.getConnection(function(err, connection) {
        if (err) {
            console.error(`change room card balance error, get connection, uid: ${userId}, amount: ${amount}`);
            cb(false)
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release()
                console.error(`change room card balance error, begin transaction, uid: ${userId}, amount: ${amount}`);
                cb(false)
                return
            }
            connection.query(
                `SELECT * FROM accounts 
                    WHERE entity_type = ${ROOM_CARD_TRANSACTION.ACCOUNT_ENTITY_TYPE}
                    AND entity_id = ${db.escape(userId)}
                    AND type = ${ROOM_CARD_TRANSACTION.ACCOUNT_TYPE}
                    FOR UPDATE`, 
                (err, results, fields) => {
                    if (err || !results || results.length <= 0) {
                        connection.rollback()
                        connection.release()
                        console.error(`change room card balance error, account not found, uid: ${userId}, amount: ${amount}`);
                        cb(false)
                        return
                    }
                    let account = results[0];

                    connection.query(`UPDATE accounts SET balance = balance + ${db.escape(amount)} WHERE id = ${account.id}`, (err, results) => {
                        if (err || !results) {
                            connection.rollback()
                            connection.release()
                            console.error(`change room card balance error, set balance, uid: ${userId}, amount: ${amount}`, err, results);
                            cb(false)
                            return
                        }

                        const now = TimeUtil.getNowDateTimeString()
                        connection.query(`INSERT INTO account_transaction 
                            (account_id, value, target_type, target_id, type, description, created_at, updated_at)
                            VALUES
                            (
                            ${db.escape(account.id)},
                            ${db.escape(amount)},
                            ${db.escape(options.targetType)},
                            ${db.escape(options.targetId)},
                            ${db.escape(options.type)},
                            ${db.escape(options.description)},
                            ${db.escape(now)},
                            ${db.escape(now)}
                            )`,
                            (err, results) => {
                                if (err || !results.insertId) {
                                    connection.rollback()
                                    connection.release()
                                    console.error(`change room card balance error, insert transaction, uid: ${userId}, amount: ${amount}`);
                                    cb(false)
                                    return
                                }
                                connection.commit((err) => {
                                    if (err) {
                                        connection.rollback()
                                        connection.release()
                                        console.error(`change room card balance error, commit, uid: ${userId}, amount: ${amount}`);
                                        cb(false)
                                        return
                                    }
                                    let newBalance = parseFloat(((account.balance + amount) / 100).toFixed(2))
                                    cb(true, newBalance, results.insertId)
                                    connection.release()
                                })
                            }
                        )
                    })
                }
            )
        })
    })
}

const CASH_TRANSACTION = {
    ACCOUNT_ENTITY_TYPE: 1,
    ACCOUNT_TYPE: 1,
    TARGET_TYPE: {
        DEFAULT: 3,
    },
    TRANSACTION_TYPE: {
        BET: 3,
        REWARD: 4,
    },
};

u.changeCashBalance = function(userId, amount, options, cb) {
    if (!amount) {
        console.error(`change cash balance error, invalid amount, uid: ${userId}, amount: ${amount}`);
        cb(false);
        return;
    }

    amount = parseInt(100 * amount);

    if (typeof options === 'function') {
        cb = options
        options = {
            targetType: CASH_TRANSACTION.TARGET_TYPE.DEFAULT,
            targetId: 0,
            type: amount > 0 ? CASH_TRANSACTION.TRANSACTION_TYPE.REWARD : CASH_TRANSACTION.TRANSACTION_TYPE.BET,
            description: '',
        }
    } else {
        options.targetType = options.targetType || CASH_TRANSACTION.TARGET_TYPE.DEFAULT;
        options.targetId = options.targetId || 0;
        options.type = options.type || (amount > 0 ? CASH_TRANSACTION.TRANSACTION_TYPE.REWARD : CASH_TRANSACTION.TRANSACTION_TYPE.BET)
        options.description = options.description || ''
    }

    db.getConnection(function(err, connection) {
        if (err) {
            console.error(`change cash balance error, get connection, uid: ${userId}, amount: ${amount}`);
            cb(false)
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release()
                console.error(`change cash balance error, begin transaction, uid: ${userId}, amount: ${amount}`);
                cb(false)
                return
            }
            connection.query(
                `SELECT * FROM accounts 
                    WHERE entity_type = ${CASH_TRANSACTION.ACCOUNT_ENTITY_TYPE}
                    AND entity_id = ${db.escape(userId)}
                    AND type = ${CASH_TRANSACTION.ACCOUNT_TYPE}
                    FOR UPDATE`, 
                (err, results, fields) => {
                    if (err || !results || results.length <= 0) {
                        connection.rollback()
                        connection.release()
                        console.error(`change cash balance error, account not found, uid: ${userId}, amount: ${amount}`);
                        cb(false)
                        return
                    }
                    let account = results[0]
                    if (amount < 0 && account.balance < Math.abs(amount)) {
                        connection.rollback()
                        connection.release()
                        console.error(`change cash balance error, balance no enough, uid: ${userId}, amount: ${amount}, balance: ${account.balance}`);
                        cb(false)
                        return
                    }

                    connection.query(`UPDATE accounts SET balance = balance + ${db.escape(amount)} WHERE id = ${account.id}`, (err, results) => {
                        if (err || !results) {
                            connection.rollback()
                            connection.release()
                            console.error(`change cash balance error, set balance, uid: ${userId}, amount: ${amount}`, err, results);
                            cb(false)
                            return
                        }

                        const now = TimeUtil.getNowDateTimeString()
                        connection.query(`INSERT INTO account_transaction 
                            (account_id, value, target_type, target_id, type, description, created_at, updated_at)
                            VALUES
                            (
                            ${db.escape(account.id)},
                            ${db.escape(amount)},
                            ${db.escape(options.targetType)},
                            ${db.escape(options.targetId)},
                            ${db.escape(options.type)},
                            ${db.escape(options.description)},
                            ${db.escape(now)},
                            ${db.escape(now)}
                            )`,
                            (err, results) => {
                                if (err || !results.insertId) {
                                    connection.rollback()
                                    connection.release()
                                    console.error(`change cash balance error, insert transaction, uid: ${userId}, amount: ${amount}`);
                                    cb(false)
                                    return
                                }
                                connection.commit((err) => {
                                    if (err) {
                                        connection.rollback()
                                        connection.release()
                                        console.error(`change cash balance error, commit, uid: ${userId}, amount: ${amount}`);
                                        cb(false)
                                        return
                                    }
                                    let newBalance = parseFloat(((account.balance + amount) / 100).toFixed(2))
                                    cb(true, newBalance, results.insertId)
                                    connection.release()
                                })
                            }
                        )
                    })
                }
            )
        })
    })
}

u.sendCommission = function(userId, roomGameId, transactionId, amount, rates, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_user_commissions
            (user_id, status, casino_room_game_id, account_transaction_id, amount, rates, created_at, updated_at) 
            VALUES 
            (
                ${db.escape(userId)},
                0,
                ${db.escape(roomGameId)},
                ${db.escape(transactionId)},
                ${db.escape(amount)},
                ${db.escape(rates)},
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (!cb) {
                return;
            }
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

const CLUB_TRANSACTION = {
    ACCOUNT_ENTITY_TYPE: 11,
    ACCOUNT_TYPE: 11,
    TARGET_TYPE: {
        DEFAULT: 3,
    },
    TRANSACTION_TYPE: {
        BET: 3,
        REWARD: 4,
    },
};

u.fetchClubMembers = function(clubId, userIds, cb) {
    db.query(
        `SELECT m.id, m.user_id, a.balance
            FROM casino_club_members as m
            LEFT JOIN accounts as a ON (
                a.entity_id = m.id
                AND a.type = ${CLUB_TRANSACTION.ACCOUNT_TYPE} 
                AND a.entity_type = ${CLUB_TRANSACTION.ACCOUNT_ENTITY_TYPE}
                )
            WHERE m.casino_club_id = ${db.escape(clubId)}
            AND m.user_id IN (${userIds.join(',')})`,
        (err, results, fields) => {
            if (err) {
                cb([]);
                return;
            }
            cb(results);
        }
    )
}

u.changeClubMemberBalance = function(memberId, amount, options, cb) {
    if (!amount) {
        console.error(`change club member balance error, invalid amount, memberId: ${memberId}, amount: ${amount}`);
        cb(false);
        return;
    }

    amount = parseInt(amount);

    if (typeof options === 'function') {
        cb = options;
        options = {
            targetType: CLUB_TRANSACTION.TARGET_TYPE.DEFAULT,
            targetId: 0,
            type: amount > 0 ? CLUB_TRANSACTION.TRANSACTION_TYPE.REWARD : CLUB_TRANSACTION.TRANSACTION_TYPE.BET,
            description: '',
        }
    } else {
        options.targetType = options.targetType || CLUB_TRANSACTION.TARGET_TYPE.DEFAULT;
        options.targetId = options.targetId || 0;
        options.type = options.type || (amount > 0 ? CLUB_TRANSACTION.TRANSACTION_TYPE.REWARD : CLUB_TRANSACTION.TRANSACTION_TYPE.BET);
        options.description = options.description || '';
    }

    db.getConnection(function(err, connection) {
        if (err) {
            console.error(`change club member balance error, get connection, memberId: ${memberId}, amount: ${amount}`);
            cb(false);
            return;
        }

        connection.beginTransaction((err) => {
            if (err) {
                connection.release();
                console.error(`change club member balance error, begin transaction, memberId: ${memberId}, amount: ${amount}`);
                cb(false);
                return;
            }
            connection.query(
                `SELECT * FROM accounts 
                    WHERE entity_type = ${CLUB_TRANSACTION.ACCOUNT_ENTITY_TYPE}
                    AND entity_id = ${db.escape(memberId)}
                    AND type = ${CLUB_TRANSACTION.ACCOUNT_TYPE}
                    FOR UPDATE`, 
                (err, results, fields) => {
                    if (err || !results || results.length <= 0) {
                        connection.rollback();
                        connection.release();
                        console.error(`change club member balance error, account not found, memberId: ${memberId}, amount: ${amount}`);
                        cb(false);
                        return;
                    }
                    let account = results[0];

                    connection.query(`UPDATE accounts SET balance = balance + ${db.escape(amount)} WHERE id = ${account.id}`, (err, results) => {
                        if (err || !results) {
                            connection.rollback();
                            connection.release();
                            console.error(`change club member balance error, set balance, memberId: ${memberId}, amount: ${amount}`, err, results);
                            cb(false);
                            return;
                        }

                        const now = TimeUtil.getNowDateTimeString()
                        connection.query(`INSERT INTO account_transaction 
                            (account_id, value, target_type, target_id, type, description, created_at, updated_at)
                            VALUES
                            (
                            ${db.escape(account.id)},
                            ${db.escape(amount)},
                            ${db.escape(options.targetType)},
                            ${db.escape(options.targetId)},
                            ${db.escape(options.type)},
                            ${db.escape(options.description)},
                            ${db.escape(now)},
                            ${db.escape(now)}
                            )`,
                            (err, results) => {
                                if (err || !results.insertId) {
                                    connection.rollback();
                                    connection.release();
                                    console.error(`change club member balance error, insert transaction, memberId: ${memberId}, amount: ${amount}`);
                                    cb(false);
                                    return
                                }
                                connection.commit((err) => {
                                    if (err) {
                                        connection.rollback();
                                        connection.release();
                                        console.error(`change club member balance error, commit, memberId: ${memberId}, amount: ${amount}`);
                                        cb(false);
                                        return
                                    }
                                    let newBalance = account.balance + amount;
                                    cb(true, newBalance, results.insertId);
                                    connection.release();
                                })
                            }
                        )
                    })
                }
            )
        })
    })
}

u.logClubCommission = function(room, userId, amount, rate, commission, roomGameId, roomGameRoundId, cb) {
    const now = TimeUtil.getNowDateTimeString()
    db.query(
        `INSERT INTO casino_club_commissions
            (
                casino_club_id, 
                user_id, 
                casino_room_id, 
                casino_room_game_id,
                casino_room_game_round_id,
                casino_room_sn,
                amount,
                rate,
                commission,
                description,
                created_at,
                updated_at
            ) 
            VALUES 
            (
                ${db.escape(room.casino_club_id)},
                ${db.escape(userId)},
                ${db.escape(room.id)},
                ${db.escape(roomGameId)},
                ${db.escape(roomGameRoundId)},
                ${db.escape(room.sn)},
                ${db.escape(amount)},
                ${db.escape(rate)},
                ${db.escape(commission)},
                '',
                ${db.escape(now)},
                ${db.escape(now)}
            )`,
        (err, results, fields) => {
            if (!cb) {
                return;
            }
            if (results.insertId) {
                cb(results.insertId)
            } else {
                cb(0)
            }
        }
    )
}

module.exports = function(uid, token) {
    return new User(uid, token)
}
