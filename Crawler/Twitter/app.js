var config = require('./config/config'),
    Datastore = new require('nedb'),
    Twitter = require('twitter'),
    DataPacker = require('./packDB');
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
        if (tweet.limit) return console.log('Limit - Undelivered ' + tweet.limit.track);
        databases[client.params.id].insert(tweet, function (err, doc) {
            if (err) return console.error(err);
            if (++client.i % 1000 === 0 && client.i > 0) console.info('Received ' + client.i + ' ' + client.params.track + ' tweets');
        });
    });
    stream.on('error', function (error) {
        console.error(error);
    });
}

DataPacker(databases);