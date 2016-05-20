var Config = require(__dirname + '/../config/config'),
    FollowingCrawler = require(__dirname + '/following'),
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
            Config.db.models.Features.find({
                id: message.resetState
            }, 1, function (err, features) {
                if (err) {
                    console.error(err);
                    //process.exit();
                } else if (!features || features.length === 0) {
                    console.error('Feature not found');
                    //process.exit();
                } else {
                    features[0].state = null;
                    features[0].save(function (err) {
                        if (err) console.error(err);
                        process.exit();
                    });
                }
            });
        }
    });

    var crawler = new FollowingCrawler(Config.credentials[process.env.credentialKey].credentials, true);

    setTimeout(function () {
        crawler.start();
    }, 1000 * process.env.credentialKey);
}