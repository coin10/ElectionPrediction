var Config = require('./config/config'),
    cluster = require('cluster'),
    async = require('async'),
    Twitter = require('twitter');

if (cluster.isMaster) {
    for (var i = 0; i < Config.credentials.length; i++) {
        setTimeout(function () {
            cluster.fork();
        }, i * 1000);
    }
    var workers = [];

    cluster.on('online', function(worker) {
        var j;
        for (var i = 0; i < Config.credentials.length; i++) {
            if (workers.filter(function (w) { return w.i === i; }).length === 0) {
                workers.push({i: i, worker: worker.id});
                j = i;
                break;
            }
        }

        console.log('Send process key: ' + j);
        worker.send({ key: j });

        worker.on('message', function (message) {
            if (message.restart) {
                cluster.workers.forEach(function (worker) {
                    worker.send({ restart: true });
                });
            }
        });
    });
    cluster.on('exit', function (worker, code, signal) {
        console.log('Restart');
        var w = workers.filter(function (aw) {
            return aw.worker === worker.id;
        });

        workers.splice(workers.indexOf(w[0]), 1);
        cluster.fork();
    });
} else {
    process.on('message', function (message) {
        if (message.key !== undefined) {
            console.log('Init process: ' + message.key);

            Config.requireORM(function (err) {
                if (err) return console.error(err);

                new UserTimelineParser(Config.credentials[message.key].credentials);
            });
        }
        if (message.shutdown) {
            process.exit(0);
        }
    });
}

function UserTimelineParser (credentials) {
    this.credentials = credentials;

    this.requests = 0;
    this.start = Date.now();

    this.startParsing();
    this.currentUserId = null;
}

UserTimelineParser.prototype.startParsing = function () {
    var self = this;
    this.nextUserId(function (err, user) {
        if (err) {
            console.error(err);
            return;
        }
        if (!user) {
            console.log('No user found. Shutdown....');
            process.exit(0);
        }

        self.currentUser = user;
        self.getTweets(function (err) {
            if (err) {
                console.error(err);

                process.exit(0);
                return;
            }
            self.currentUser.parseState = 2;
            self.currentUser.save(function (err) {
                if (err) return console.error(err);

                console.log('Processed user ' + self.currentUser.id + ' (' + self.currentUser.statuses_count + ')');
                self.startParsing();
            });
        });
    });
};

UserTimelineParser.prototype.nextUserId = function (done) {
    var User = Config.db.models.User;

    User.find({
        parseState: 0
    }, 1, function (err, users) {
        if (err) return done(err);
        if (users.length === 0) return done(null);
        if (users.length !== 1) return console.error('Wrong user count');

        var user = users[0];
        user.parseState = 1;
        user.save(function (err) {
            if (err) return done(err);

            done(null, user);
        });
    });
};

UserTimelineParser.prototype.getTweets = function (done, maxId) {
    var self = this;

    if ((self.start + Config.rateLimit.window) < Date.now()) {
        self.start = Date.now();
        self.requests = 0;
    }

    if (++this.requests === Config.rateLimit.requests) {
        console.log('Wait till next window');
        setTimeout(function () {
            console.log('Next window...');
            self.getTweets(done, maxId);
        }, self.start + Config.rateLimit.window - Date.now());
        return;
    }

    var self = this;
    new Twitter(this.credentials).get('statuses/user_timeline', {
        user_id: self.currentUser.id,
        count: 200,
        exclude_replies: true,
        max_id: maxId
    }, function(err, tweets, response) {
        if (err) return done(err);

        console.log('Found ' + tweets.length + ' tweets');
        async.eachLimit(tweets, 10, function (data, saved) {
            Config.db.models.UserUser.create({
                id: data.user.id,
                name: data.user.name,
                screen_name: data.user.screen_name,
                location: data.user.location,
                url: data.user.url,
                description: data.user.description,
                protected: data.user.protected,
                verified: data.user.verified,
                followers_count: data.user.followers_count,
                friends_count: data.user.friends_count,
                listed_count: data.user.listed_count,
                favourites_count: data.user.favourites_count,
                statuses_count: data.user.statuses_count,
                created_at: data.user.created_at,
                utc_offset: data.user.utc_offset,
                time_zone: data.user.time_zone,
                geo_enabled: data.user.geo_enabled,
                lang: data.user.lang,
                contributors_enabled: data.user.contributors_enabled,
                is_translator: data.user.is_translator,
                following: data.user.following,
                follow_request_sent: data.user.follow_request_sent,
                notifications: data.user.notifications
            }, function (err) {
                if (err && err.errno !== 1062) return done(err);
                Config.db.models.UserTweet.create({
                    id: data.id,
                    text: data.text,
                    source: data.source,
                    truncated: data.truncated,
                    in_reply_to_status_id: data.in_reply_to_status_id,
                    in_reply_to_user_id: data.in_reply_to_user_id,
                    in_reply_to_screen_name: data.in_reply_to_screen_name,
                    geo: data.geo,
                    coordinates: data.coordinates,
                    place: data.place,
                    contributors: data.contributors,
                    retweet_count: data.retweet_count,
                    favorite_count: data.favorite_count,
                    possibly_sensitive: data.possibly_sensitive,
                    filter_level: data.filter_level,
                    lang: data.lang,
                    timestamp_ms: data.timestamp_ms,
                    user_id: data.user.id
                }, function (err) {
                    if (err && err.errno !== 1062) return done(err);

                    if (data.is_quote_status && data.quoted_status && false) {
                        Config.db.models.UserUser.create({
                            id: data.quoted_status.user.id,
                            name: data.quoted_status.user.name,
                            screen_name: data.quoted_status.user.screen_name,
                            location: data.quoted_status.user.location,
                            url: data.quoted_status.user.url,
                            description: data.quoted_status.user.description,
                            protected: data.quoted_status.user.protected,
                            verified: data.quoted_status.user.verified,
                            followers_count: data.quoted_status.user.followers_count,
                            friends_count: data.quoted_status.user.friends_count,
                            listed_count: data.quoted_status.user.listed_count,
                            favourites_count: data.quoted_status.user.favourites_count,
                            statuses_count: data.quoted_status.user.statuses_count,
                            created_at: data.quoted_status.user.created_at,
                            utc_offset: data.quoted_status.user.utc_offset,
                            time_zone: data.quoted_status.user.time_zone,
                            geo_enabled: data.quoted_status.user.geo_enabled,
                            lang: data.quoted_status.user.lang,
                            contributors_enabled: data.quoted_status.user.contributors_enabled,
                            is_translator: data.quoted_status.user.is_translator,
                            following: data.quoted_status.user.following,
                            follow_request_sent: data.quoted_status.user.follow_request_sent,
                            notifications: data.quoted_status.user.notifications
                        }, function (err) {
                            if (err && err.errno !== 1062) return done(err);

                            Config.db.models.UserTweet.create({
                                id: data.quoted_status.id,
                                text: data.quoted_status.text,
                                source: data.quoted_status.source,
                                truncated: data.quoted_status.truncated,
                                in_reply_to_status_id: data.quoted_status.in_reply_to_status_id,
                                in_reply_to_user_id: data.quoted_status.in_reply_to_user_id,
                                in_reply_to_screen_name: data.quoted_status.in_reply_to_screen_name,
                                geo: data.quoted_status.geo,
                                coordinates: data.quoted_status.coordinates,
                                place: data.quoted_status.place,
                                contributors: data.quoted_status.contributors,
                                retweet_count: data.quoted_status.retweet_count,
                                favorite_count: data.quoted_status.favorite_count,
                                possibly_sensitive: data.quoted_status.possibly_sensitive,
                                filter_level: data.quoted_status.filter_level,
                                lang: data.quoted_status.lang,
                                timestamp_ms: new Date(data.quoted_status.created_at).getTime(),
                                user_id: data.quoted_status.user.id
                            }, function (err) {
                                if (err && err.errno !== 1062) return done(err);

                                saved();
                            });
                        });
                    } else {
                        saved();
                    }
                });
            });
        }, function (err) {
            if (err) return done(err);

            if (tweets.length === 200) {
                self.getTweets(done, tweets[tweets.length - 1].id);
            } else done();
        });
    });
};
