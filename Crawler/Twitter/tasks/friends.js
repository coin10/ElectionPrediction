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

        self.startCrawling();
    });
};

FollowersCrawler.prototype.startCrawling = function () {
    var self = this;
    this.getNextUser(function (err, user) {
        if (err) return self.logError(err);
        if (!user) return self.logInfo('Crawled all Users');


        self.logInfo('Next user', {
            userId: user.id,
            screenName: user.screenName
        });
        self.getUserFriends(user, function (err) {
            if (err) return self.logError(err);

            Config.db.models.User.find({
                id: user.id
            }, 1, function (err, users) {
                if (err) return self.logError(err);
                if (!users || users.length === 0) return self.logError('User not found');

                users[0].friendsCrawled = 'complete';
                users[0].save(function (err) {
                    if (err) return self.logError(err);

                    self.logInfo('User complete', {
                        userId: users[0].id,
                        screenName: users[0].screenName
                    });
                    self.startCrawling();
                });

            });

        });
    });
};

FollowersCrawler.prototype.getNextUser = function (done) {
    Config.db.models.User.find({
        friendsCrawled: null,
        location: null
    }, 1, function (err, users) {
        if (err) return done(err);
        if (users.length === 0) return done(null, null);

        users[0].friendsCrawled = 'inProgress';
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

FollowersCrawler.prototype.getUserFriends = function (user, done) {
    var self = this;

    var cursor = (user.currentFriendCursor === undefined ? undefined: user.currentFriendCursor);
    console.log('Start with cursor: ' + cursor);

    self.getPage(user, function (err, ids) {
        self.loadedPage(self, user, err, ids, done);
    }, cursor);
};

FollowersCrawler.prototype.loadedPage = function (self, user, err, ids, done) {
    if (err) return done(err);

    async.eachLimit(ids.ids, 25, function (id, cb) {
        Config.db.models.UserFriends.create({
            userId: user.id,
            friendId: id
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

    Config.db.models.User.find({
        id: user.id
    }, 1, function (err, users) {
        if (err) return done(err);
        if (!users || users.length === 0) return done('User not found');

        user = users[0];

        user.currentFriendCursor = (!cursor ? '-1': cursor);
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
            new Twitter(self.credentials).get('friends/ids', {
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

FollowersCrawler.restart = function (id) {
    Config.db.models.User.find({
        id: id
    }, 1, function (err, users) {
        if (err) {
            console.error(err);
            //process.exit();
        } else if (!users || users.length === 0) {
            console.error('User not found');
            //process.exit();
        } else {
            users[0].state = null;
            users[0].save(function (err) {
                if (err) console.error(err);
                process.exit();
            });
        }
    });
};

module.exports = FollowersCrawler;