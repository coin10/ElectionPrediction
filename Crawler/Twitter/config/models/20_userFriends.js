module.exports = function (Config) {
    Config.db.models.UserFriends = Config.db.connection.define('UserFriends', {
        userId: { type: 'text', size: 24, key: true },
        friendId: { type: 'text', size: 24, key: true }
    });
};