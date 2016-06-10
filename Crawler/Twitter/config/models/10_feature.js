
module.exports = function (Config) {
    Config.db.models.Features = Config.db.connection.define('Features', {
        id: { type: 'text', unique: true, size: 18 },
        screenName: { type: 'text', key: true },
        followersCount: { type: 'integer', required: false },
        state: { type: 'enum', values: ['inProgress', 'complete'], required: false },
        currentCursor: { type: 'text', size: 24 }
    });
};