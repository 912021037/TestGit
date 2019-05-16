const moment = require('moment');

var TimeUtil = {};
var p = TimeUtil;

p.now = function() {
    return moment().utc().utcOffset(480);
}

p.getNowDateTimeString = function() {
    return p.now().format('YYYY-MM-DD HH:mm:ss')
}

module.exports = TimeUtil