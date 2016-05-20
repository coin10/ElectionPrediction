
module.exports = function (Config) {
    Config.db.models.FeatureFollowers = Config.db.connection.define('FeatureFollowers', {
        featureId: String,
        followerId: String
    });
};