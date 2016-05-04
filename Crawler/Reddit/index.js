var config = require('./config/config'),
    request = require('request'),
    token = undefined;

function generateToken (done) {
    request.post(config.auth.url, {
        headers: {
            'User-Agent': 'mac:de.uni-koeln.coin-election-prediction:v0.0.1 (by /u/coingroup10)'
        },
        auth: {
            user: config.auth.clientId,
            pass: config.auth.clientSecret
        },
        form: {
            grant_type: 'password',
            username: config.auth.user,
            password: config.auth.password
        }
    }, function (err, httpResponse, body) {
        if (!err && httpResponse.statusCode == 200) return done(null, JSON.parse(body));

        if (err) return done(err);
        if (httpResponse.statusCode != 200) return done('Bad Status Code: ' + httpResponse.statusCode);
    });
};

function loadComments (done) {
    request.get(config.commentsUrl, {
        headers: {
            'User-Agent': 'mac:de.uni-koeln.coin-election-prediction:v0.0.1 (by /u/coingroup10)'
        },
        auth: {
            bearer: token
        }
    }, function (err, httpResponse, body) {
        if (!err && httpResponse.statusCode == 200) return done(null, JSON.parse(body));

        if (err) return done(err);
        if (httpResponse.statusCode != 200) return done('Bad Status Code: ' + httpResponse.statusCode);
    });
}

function parseCommentsResponse (comments) {
    /*
        Hier kommt die Logik zum Auswerten der Comments
     */
    console.log(comments);
}

function loadCommentsPeriodically () {
    setInterval(function () {
        if (token !== undefined) loadComments(function (err, comments) {
            if (err) return console.error(err);
            parseCommentsResponse(comments);
        });
    }, config.refreshInterval);
}

generateToken(function (err, oauth) {
    if (err) return console.error(err);

    console.log('New token available: ', oauth);
    token = oauth.access_token;
});

loadCommentsPeriodically();