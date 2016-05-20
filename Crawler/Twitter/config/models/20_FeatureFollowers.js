
module.exports = function (Config) {
    Config.db.models.FeatureFollowers = Config.db.connection.define('FeatureFollowers', {
        featureId: { type: 'text', key: true, size: 18 },
        followerId: { type: 'text', key: true, size: 18 }
    });
};