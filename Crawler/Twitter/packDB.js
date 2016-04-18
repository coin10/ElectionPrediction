var async = require('async'),
    fs = require('fs'),
    zlib = require('zlib'),
    Datastore = new require('nedb');

module.exports = function (databases) {
    console.info('=== Run Data Packer ===');
    async.forEachOf(databases, function (database, key, done) {
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
                    database.remove({_id: doc._id}, function (err) {
                        if (err) return cb(err);
                        cb();
                    })
                });
            }, function (err) {
                if (err) return done(err);
                database.persistence.compactDatafile();

                var backFileName = '' + backupDb.persistence.filename;
                backupDb = undefined;

                var input = fs.createReadStream(backFileName),
                    output = fs.createWriteStream(backFileName + '.gz'),
                    compress = zlib.createGzip();

                input.pipe(compress).pipe(output).on('finish', function () {
                    fs.unlink(backFileName, function (err) {
                        done(err);
                    });
                });

            });
        });
    }, function (err) {
        if (err) console.error(err);

        console.info('=== Data Packer Complete===');
    });
};