var Config = require('./../config/config'),
    cluster = require('cluster'),
    async = require('async'),
    fs = require('fs'),
    glob = require('glob'),
    spawn = require('child_process').spawn,
    LineByLineReader = require('line-by-line'),
    rimraf = require('rimraf'),
    imported = JSON.parse(fs.readFileSync('./tmp/imported.json')),
    inProcess = JSON.parse(fs.readFileSync('./tmp/inProcess.json'));

if (cluster.isMaster) {
    for (var i = 0; i < require('os').cpus().length / 2; i++) {
        setTimeout(function () {
            cluster.fork();
        }, i * 1000);
    }
} else {
    Config.requireORM(function (err) {
        if (err) return console.error(err);

        var User = Config.db.models.User,
            Tweet = Config.db.models.Tweet;

        glob(Config.dataPath + '/*.tar.gz', function (err, archives) {
            if (err) {
                return console.error(err);
            }

            async.eachLimit(archives, 1, function (archive, done) {
                if (imported.indexOf(archive) > -1) return done();
                if (inProcess.indexOf(archive) > -1) return done();

                inProcess.push(archive);
                fs.writeFileSync('./tmp/inProcess.json', JSON.stringify(inProcess));

                var tmpFileName = './tmp/' + Date.now();
                fs.mkdirSync(tmpFileName);
                var tar = spawn('tar', ['-zxf', archive, '-C', tmpFileName]);

                tar.on('close', function (code) {
                    if (code !== 0) {
                        console.error('Could not extract: ' + archive);
                        return done();
                    }

                    glob(tmpFileName + '/*.db', function (err, files) {
                        if (err) {
                            console.error('Could not find file');
                            return done();
                        }
                        if (files.length === 0) {
                            inProcess.splice(1, inProcess.indexOf(archive));
                            fs.writeFileSync('./tmp/inProcess.json', JSON.stringify(inProcess));

                            imported.push(archive);
                            fs.writeFileSync('./tmp/imported.json', JSON.stringify(imported));
                            return done();
                        }
                        console.log('Start reading ' + files[0]);
                        var reader = new LineByLineReader(files[0]);

                        var u = 0, t = 0;
                        reader.on('line', function (line) {
                            reader.pause();
                            var data = JSON.parse(line);

                            var user = User.create({
                                id: data.user.id,
                                name: data.user.name,
                                screen_name: data.user.screen_name,
                                location: data.user.location,
                                url: data.user.url,
                                description: data.user.description,
                                protected: data.user.protected,
                                verified: data.user.verified,
                                followers_count: data.user.followers_count,
                                friends_count: data.user.friends_count,
                                listed_count: data.user.listed_count,
                                favourites_count: data.user.favourites_count,
                                statuses_count: data.user.statuses_count,
                                created_at: data.user.created_at,
                                utc_offset: data.user.utc_offset,
                                time_zone: data.user.time_zone,
                                geo_enabled: data.user.geo_enabled,
                                lang: data.user.lang,
                                contributors_enabled: data.user.contributors_enabled,
                                is_translator: data.user.is_translator,
                                following: data.user.following,
                                follow_request_sent: data.user.follow_request_sent,
                                notifications: data.user.notifications
                            }, function (err) {
                                if (err && err.errno !== 1062) console.error('user', err);

                                u++;
                                Tweet.create({
                                    id: data.id,
                                    text: data.text,
                                    source: data.source,
                                    truncated: data.truncated,
                                    in_reply_to_status_id: data.in_reply_to_status_id,
                                    in_reply_to_user_id: data.in_reply_to_user_id,
                                    in_reply_to_screen_name: data.in_reply_to_screen_name,
                                    geo: data.geo,
                                    coordinates: data.coordinates,
                                    place: data.place,
                                    contributors: data.contributors,
                                    retweet_count: data.retweet_count,
                                    favorite_count: data.favorite_count,
                                    possibly_sensitive: data.possibly_sensitive,
                                    filter_level: data.filter_level,
                                    lang: data.lang,
                                    timestamp_ms: data.timestamp_ms,
                                    user_id: data.user.id
                                }, function (err) {
                                    if (err && err.errno !== 1062) console.error('tweet: ', err);

                                    t++;
                                    if (data.is_quote_status && data.quoted_status && false) {
                                        User.create({
                                            id: data.quoted_status.user.id,
                                            name: data.quoted_status.user.name,
                                            screen_name: data.quoted_status.user.screen_name,
                                            location: data.quoted_status.user.location,
                                            url: data.quoted_status.user.url,
                                            description: data.quoted_status.user.description,
                                            protected: data.quoted_status.user.protected,
                                            verified: data.quoted_status.user.verified,
                                            followers_count: data.quoted_status.user.followers_count,
                                            friends_count: data.quoted_status.user.friends_count,
                                            listed_count: data.quoted_status.user.listed_count,
                                            favourites_count: data.quoted_status.user.favourites_count,
                                            statuses_count: data.quoted_status.user.statuses_count,
                                            created_at: data.quoted_status.user.created_at,
                                            utc_offset: data.quoted_status.user.utc_offset,
                                            time_zone: data.quoted_status.user.time_zone,
                                            geo_enabled: data.quoted_status.user.geo_enabled,
                                            lang: data.quoted_status.user.lang,
                                            contributors_enabled: data.quoted_status.user.contributors_enabled,
                                            is_translator: data.quoted_status.user.is_translator,
                                            following: data.quoted_status.user.following,
                                            follow_request_sent: data.quoted_status.user.follow_request_sent,
                                            notifications: data.quoted_status.user.notifications
                                        }, function (err) {
                                            if (err && err.errno !== 1062) console.error('quoted_status user', err);
                                            u++;
                                            Tweet.create({
                                                id: data.quoted_status.id,
                                                text: data.quoted_status.text,
                                                source: data.quoted_status.source,
                                                truncated: data.quoted_status.truncated,
                                                in_reply_to_status_id: data.quoted_status.in_reply_to_status_id,
                                                in_reply_to_user_id: data.quoted_status.in_reply_to_user_id,
                                                in_reply_to_screen_name: data.quoted_status.in_reply_to_screen_name,
                                                geo: data.quoted_status.geo,
                                                coordinates: data.quoted_status.coordinates,
                                                place: data.quoted_status.place,
                                                contributors: data.quoted_status.contributors,
                                                retweet_count: data.quoted_status.retweet_count,
                                                favorite_count: data.quoted_status.favorite_count,
                                                possibly_sensitive: data.quoted_status.possibly_sensitive,
                                                filter_level: data.quoted_status.filter_level,
                                                lang: data.quoted_status.lang,
                                                timestamp_ms: new Date(data.quoted_status.created_at).getTime(),
                                                user_id: data.quoted_status.user.id
                                            }, function (err) {
                                                if (err && err.errno !== 1062) console.error('quoted_status: ', err);
                                                t++;
                                                reader.resume();
                                            });
                                        });
                                    } else {
                                        reader.resume();
                                    }
                                });
                            });
                        });
                        reader.on('end', function () {
                            rimraf(tmpFileName, function (err) {
                                if (err) console.error(err);

                                console.log('Created ' + u + ' users & ' + t + ' tweets');

                                inProcess.splice(1, inProcess.indexOf(archive));
                                fs.writeFileSync('./tmp/inProcess.json', JSON.stringify(inProcess));

                                imported.push(archive);
                                fs.writeFileSync('./tmp/imported.json', JSON.stringify(imported));
                                done();
                            });
                        });
                    });
                });
            }, function (err) {
                console.log('Imported all files');
                process.exit();
            });
        });
    });
}