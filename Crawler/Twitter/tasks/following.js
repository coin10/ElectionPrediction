var Config = require('../config/config'),
    async = require('async'),
    Twitter = require('twitter');

function FollowersCrawler (credentials, logToMessages) {
    this.credentials = credentials;
    this.requests = 0;
    this.windowStart = Date.now();
    this.logToMessages = logToMessages;
}

FollowersCrawler.prototype.init = function (done) {
    Config.requireORM(function (err) {
        done(err);
    });
};

FollowersCrawler.prototype.logError = function (err, userInfo) {
    if (this.logToMessages) {
        process.send({
            error: err,
            userInfo: userInfo
        });
    } else console.error(err);
};

FollowersCrawler.prototype.logInfo = function (info, userInfo) {
    if (this.logToMessages) {
        process.send({
            info: info,
            userInfo: userInfo
        });
    } else console.log(info);
};

FollowersCrawler.prototype.start = function () {
    var self = this;
    this.init(function (err) {
        if (err) return self.logError(err);
        
        self.getUsersWithMissingUserIds(function (err, users) {
            if (err) return self.logError(err);

            if (users.length > 0) {
                self.getUserIds(users.map(function (user) {
                    return user.screenName
                }), function (err, infos) {
                    if (err) return self.logError(err);

                    async.eachLimit(users, 5, function (user, cb) {
                        infos.forEach(function (info) {
                            if (user.screenName === info.screen_name) {
                                user.id = info.id_str;
                                user.save(cb);
                            }
                        })
                    }, function (err) {
                        if (err) return self.logError(err);

                        self.startCrawling();
                    });
                });
            } else self.startCrawling();
        });
    });
};

FollowersCrawler.prototype.startCrawling = function () {
    var self = this;
    this.getNextUser(function (err, user) {
        if (err) return self.logError(err);
        if (!user) return self.logInfo('Crawled all features');


        self.logInfo('Next feature', {
            featureId: user.id,
            screenName: user.screenName
        });
        self.getUserFollowers(user, function (err) {
            if (err) return self.logError(err);

            Config.db.models.Features.find({
                id: user.id
            }, 1, function (err, users) {
                if (err) return self.logError(err);
                if (!users) return self.logError('user not found');

                users[0].state = 'complete';
                users[0].save(function (err) {
                    if (err) return self.logError(err);

                    self.logInfo('Feature complete', {
                        userId: users[0].id,
                        screenName: users[0].screenName
                    });
                    self.startCrawling();
                });

            });

        });
    });
};

FollowersCrawler.prototype.getUsersWithMissingUserIds = function (done) {
    Config.db.models.Features.find({
        id: null
    }, function (err, users) {
        if (err) return done(err);

        done (null, users);
    });
};

FollowersCrawler.prototype.getNextUser = function (done) {
    Config.db.models.Features.find({
        state: null
    }, 1, function (err, users) {
        if (err) return done(err);
        if (users.length === 0) return done(null, null);

        users[0].state = 'inProgress';
        users[0].save(function (err) {
            done (err, users[0]);
        });
    });
};

FollowersCrawler.prototype.getUserIds = function (screenNames, done) {
    new Twitter(this.credentials).get('users/lookup', {
        screen_name: screenNames.join(','),
        include_entities: false
    }, function (err, infos) {
        if (err) return done (err);

        done(null, infos);
    });
};

FollowersCrawler.prototype.getUserFollowers = function (user, done) {
    var self = this;

    var cursor = user.currentCursor === undefined ? undefined: user.currentCursor;
    console.log('Start with cursor: ' + cursor);

    self.getPage(user, function (err, ids) {
        self.loadedPage(self, user, err, ids, done);
    }, cursor);
};

FollowersCrawler.prototype.loadedPage = function (self, user, err, ids, done) {
    if (err) return done(err);

    async.eachLimit(ids.ids, 25, function (id, cb) {
        Config.db.models.FeatureFollowers.create({
            featureId: user.id,
            followerId: id
        }, function (err) {
            if (err && err.errno === 1062) {
                //console.log('1062');
                return cb();
            }
            cb(err);
        });
    }, function (err) {
        if (err) return done(err);

        if (ids.next_cursor_str !== '0') {
            self.getPage(user, function (err, ids) {
                self.loadedPage(self, user, err, ids, done);
            }, ids.next_cursor_str);
        } else {
            done(null, user);
        }
    });
};

FollowersCrawler.prototype.getPage = function (user, done, cursor) {
    var self = this;


    Config.db.models.Features.find({
        id: user.id
    }, 1, function (err, users) {
        if (err) return done(err);
        if (!users || users.length === 0) return done('User not found');

        user = users[0];

        user.currentCursor = (!cursor ? '-1': cursor);
        user.save(function (err) {
            if (err) return done(err);

            if ((self.windowStart + Config.rateLimit.window) < Date.now()) {
                self.windowStart = Date.now();
                self.requests = 0;
            }
            if (++self.requests === 15) {
                console.log('Wait till next window: ' + ((self.windowStart + Config.rateLimit.window - Date.now()) / 1000 ));
                setTimeout(function () {
                    console.log('Next window... ');
                    self.getPage(user, done, cursor);
                }, self.windowStart + Config.rateLimit.window - Date.now());
                return;
            }

            console.log('Getting followers with cursor: '+ user.currentCursor);
            new Twitter(self.credentials).get('followers/ids', {
                user_id: user.id,
                cursor: user.currentCursor,
                stringify_ids: true,
                count: 5000
            }, function (err, ids) {
                if (err) return done (err, null);

                done (null, ids);
            });
        });
    });
};

module.exports = FollowersCrawler;