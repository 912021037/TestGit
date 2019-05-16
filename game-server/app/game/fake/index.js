module.exports = function(app) {
	return new Fake(app)
};

var Fake = function() {
    this.readme = 'i am a fake game to describe game interface'
    console.log(this.readme)
};

var f = Fake.prototype

f.onUserJoinRoom = function(room, user) {
    console.log('fake on user join room', room, user)
}

f.onUserLeaveRoom = function(room, user) {
    console.log('fake on user leave room', room, user)
}