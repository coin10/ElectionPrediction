var config = require('./config/config'),
    async = require('async'),
    fs = require('fs'),
    spawn = require('child_process').spawn,
    Twitter = require('twitter'),
    clients = [];

    var databases = {};

console.info('\n=== Welcome to Twitter StreamAPI Parser ===\n');

config.credentials.forEach(function (client) {
    if (client.params) {
        clients.push({
            client: new Twitter(client.credentials),
            params: client.params,
            i: 0
        });
    }
    if (databases[client.params.id] === undefined) {
        databases[client.params.id] = {
            path: config.dataPath + '/',
            fileName: client.params.id + '.' + Date.now() + '.db'
        };
        databases[client.params.id].filePath = databases[client.params.id].path + databases[client.params.id].fileName;
    }

});

clients.forEach(function (client) {
    console.info('Created client for filter ' + JSON.stringify(client.params));
    client.client.stream('statuses/filter', client.params, function (stream) {
        streamCallback(stream, client);
    });
});

function streamCallback (stream, client) {
    stream.on('data', function (tweet) {
        if (tweet.limit) return trackUndelivered(client, tweet);
        fs.appendFile(databases[client.params.id].filePath, JSON.stringify(tweet) + '\n', function (err) {
            if (err) return console.error(err);
            if (++client.i % 1000 === 0 && client.i > 0) console.info('Received ' + client.i + ' ' + client.params.track + ' tweets');
        });
    });
    stream.on('error', function (error) {
        console.error(error);
    });
}

function trackUndelivered (client, message) {
    console.log('Limit - Undelivered ' + message.limit.track);

    var file = databases[client.params.id].path + client.params.id + '.undelivered.txt';
    fs.readFile(file, 'utf8', function (err, data) {
        if (err && err.code !== 'ENOENT') {
            console.error(err);
        } else {
            var undelivered = (err && err.code === 'ENOENT' ? 0 : parseInt(data)) + message.limit.track;
            fs.writeFile(file, undelivered, 'utf8', function (err) {
                console.error(err);
            });
        }
    });
}

setTimeout(function () {
    async.forEachOf(clients, function (client, key, done) {
        client.client = undefined;
        var tar = spawn('tar' , ['-cvzf', databases[client.params.id].filePath + '.tar.gz', '-C', databases[client.params.id].path, databases[client.params.id].fileName]);
        tar.on('close', function (code) {
            console.log('Created ' + databases[client.params.id] + '.tar.gz' + ': ' + code);

            fs.unlinkSync(databases[client.params.id].filePath);

            done();
        });
    }, function (err) {
        console.info('\n=== See you soon! ===\n');
        process.exit();
    });
}, 60 * 60 * 1000);
