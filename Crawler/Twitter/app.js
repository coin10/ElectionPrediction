var config = require('./config/config'),
    async = require('async'),
    fs = require('fs'),
    zlib = require('zlib'),
    Datastore = new require('nedb'),
    Twitter = require('twitter'),
    clients = [];

    var databases = {};

console.info('\n===Twitter StreamAPI parser===\n');

config.credentials.forEach(function (client) {
    clients.push({
        client: new Twitter(client.credentials),
        params: client.params,
        i: 0
    });
    if (databases[client.params.id] === undefined) databases[client.params.id] = new Datastore({
        filename: config.db.path + '/' + client.params.id + '.db',
        autoload: true
    });
});

clients.forEach(function (client) {
    console.info('Created client for filter ' + JSON.stringify(client.params));
    client.client.stream('statuses/filter', client.params, function (stream) {
        streamCallback(stream, client);
    });
});

function streamCallback (stream, client) {
    stream.on('data', function (tweet) {
        if (tweet.limit) return console.log('Limit - Undelivered ' + tweet.track + '\n' + JSON.stringify(tweet));
        databases[client.params.id].insert(tweet, function (err, doc) {
            if (err) return console.error(err);
            if (++client.i % 1000 === 0 && client.i > 0) console.info('Received ' + client.i + ' ' + client.params.track + ' tweets');
        });
    });
    stream.on('error', function (error) {
        console.error(error);
    });
}

setInterval(function () {
    Object.keys(databases).forEach(function (key) {
        var database = databases[key];

        var filename = database.persistence.filename,
            backupDb = new Datastore({
                filename: filename + '.' + Math.floor(Date.now() / 1000) + '.db',
                autoload: true
            });

        database.find({}, function (err, docs) {
            if (err) return console.error(err);

            async.forEach(docs, function (doc, cb) {
                backupDb.insert(doc, function (err) {
                    if (err) return cb(err);
                    database.remove({ _id: doc._id }, function (err) {
                        if (err) return cb(err);
                        cb();
                    })
                });
            }, function (err) {
                if (err) console.error(err);
                database.persistence.compactDatafile();

                var backFileName = '' + backupDb.persistence.filename;
                backupDb = undefined;

                var input = fs.createReadStream(backFileName),
                    output = fs.createWriteStream(backFileName + '.gz'),
                    compress = zlib.createGzip();

                input.pipe(compress).pipe(output).on('finish', function () {
                    fs.unlinkSync(backFileName);
                });

            });
        });
    });
}, 60 * 60 * 1000);