var config = require('../config/config'),
    async = require('async'),
    url = require('url'),
    uri = url.parse(config.geocodingApi),
    request = require('request');

function getLocation(user, done) {
    uri.query = { text: user.location };
    request(uri.format(), function (err, res, body) {
        if (err) return done (err);
        
        var g = JSON.parse(body);
    });
}

function getUsers (offset) {
    if (!offset) offset = 0;
    config.db.models.User.find({
        country: null,
        not: [{ location: null }]
    }, { limit: 5, offset: offset }, function (err, users) {
        if (err) return console.error(err);

        async.forEach(users, function (user, done) {
            getLocation(user, done);
        }, function (err) {
            if (err) return console.error(err);
            if (users.length === 5) return getUsers(offset + 5);

            console.log('Parsed all users');
            process.exit(0);
        });
    });
}
/*
config.requireORM(function (e) {
    if (e) return console.error(e);

    getUsers();
});
*/

