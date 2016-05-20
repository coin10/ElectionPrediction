
module.exports = function (Config) {
    Config.db.models.UserUser = Config.db.connection.define('UserUser', {
        id: { type: 'text', key: true, size: 18 },
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
        parseState: Number
    });
};