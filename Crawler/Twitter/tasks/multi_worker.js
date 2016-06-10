var argv = require('minimist')(process.argv.slice(2))
    Config = require(__dirname + '/../config/config'),
    Crawler = require(__dirname + '/' + argv._[0].toLowerCase()),
    cluster = require('cluster');

if (cluster.isMaster) {
    var cIDs = {},
        currentFeature = {};
    for (var i = 0; i < Config.credentials.length; i++) {
        var w = cluster.fork({
            credentialKey: i
        });
        cIDs[w.id] = i;
    }

    cluster.on('message', function (worker, message) {
        if (message.error) {
            console.error(message.error);
            worker.send({ shutdown: true, resetState: currentFeature[worker.id] });
        } else if (message.info === 'Next feature') {
            currentFeature[worker.id] = message.userInfo.featureId;
            console.log('Worker ' + worker.id + ' now processing ' + message.userInfo.screenName);
        } else console.log('Worker ' + worker.id + ': ' + message.info);
    });

    cluster.on('exit', function (worker) {
        var cID = cIDs[worker.id];
        var w = cluster.fork({
            credentialKey: cID
        });
        cIDs[w.id] = cID;
        delete cIDs[worker.id];
    });
} else {
    process.on('message', function (message) {
        if (message.shutdown) {
            Crawler.restart(message.resetState);
        }
    });

    var crawler = new Crawler(Config.credentials[process.env.credentialKey].credentials, true);

    setTimeout(function () {
        crawler.start();
    }, 1000 * process.env.credentialKey);
}