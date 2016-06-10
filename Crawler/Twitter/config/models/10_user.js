
module.exports = function (Config) {
    Config.db.models.User = Config.db.connection.define('User', {
        id: Number,
        name: String,
        screen_name: String,
        location: String,
        url: String,
        description: String,
        protected: Boolean,
        verified: Boolean,
        followers_count: Number,
        friends_count: Number,
        listed_count: Number,
        favourites_count: Number,
        statuses_count: Number,
        created_at: String,
        utc_offset: String,
        time_zone: String,
        geo_enabled: Boolean,
        lang: String,
        contributors_enabled: Boolean,
        is_translator: Boolean,
        following: String,
        follow_request_sent: String,
        notifications: String,
        country: String,
        ageGroupId: Number
    });
};