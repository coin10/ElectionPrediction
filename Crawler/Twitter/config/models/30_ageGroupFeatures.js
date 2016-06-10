
module.exports = function (Config) {
    Config.db.models.AgeGroupFeatures = Config.db.connection.define('AgeGroupFeatures', {
        ageGroupId: { type: 'integer', key: true },
        featureId: { type: 'integer', key: true },
        value: { type: 'number' }
    });
};