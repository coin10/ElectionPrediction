
module.exports = function (Config) {
    Config.db.models.Tweet = Config.db.connection.define('Tweet', {
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
    Config.db.models.Tweet.hasOne('user', Config.db.models.User, { required: true });
    Config.db.models.Tweet.hasOne('quoted_status', Config.db.models.Tweet, { required: false });
};