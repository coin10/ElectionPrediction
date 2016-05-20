
module.exports = function (Config) {
    Config.db.models.UserTweet = Config.db.connection.define('UserTweet', {
        id: { type: 'text', key: true, size: 18 },
        text: String,
        source: String,
        truncated: Boolean,
        in_reply_to_status_id: Number,
        in_reply_to_user_id: Number,
        in_reply_to_screen_name: String,
        geo: Object,
        coordinates: Object,
        place: Object,
        contributors: String,
        retweet_count: Number,
        favorite_count: Number,
        possibly_sensitive: Boolean,
        filter_level: String,
        lang: String,
        timestamp_ms: String
    });
    Config.db.models.UserTweet.hasOne('user', Config.db.models.UserUser, { required: true });
    Config.db.models.UserTweet.hasOne('quoted_status', Config.db.models.UserTweet, { required: false });
};