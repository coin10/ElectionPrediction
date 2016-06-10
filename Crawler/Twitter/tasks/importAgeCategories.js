var Config = require('../config/config'),
    csv = require('csv-parse'),
    fs = require('fs'),
    async = require('async');

var input = fs.createReadStream('/Users/Yannick/Documents/Uni\ Köln/Master/4.\ Semester/Hauptseminar/Features\ for\ age\ categories.csv'),
    parser = csv({delimiter: ';', skip_empty_lines: true, columns: true});

parser.on('readable', function () {
    while(record = parser.read()) {
        if (record.ScreenName === '') return;

        var row = JSON.parse(JSON.stringify(record));
        Config.db.models.Features.find({
            screenName: row.ScreenName
        }, 1, function (err, features) {
            if (err) return console.error(err);
            if (features.length === 0) return console.error('Cannot find screenName: ', row);

            for (var ageGroupId in row) {
                if (ageGroupId === '' || ageGroupId === 'ScreenName') continue;

                Config.db.models.AgeGroupFeatures.create({
                    featureId: features[0].id,
                    ageGroupId: parseInt(ageGroupId),
                    value: parseFloat(row[ageGroupId].replace(',', '.'))
                }, function (err) {
                    if (err)  console.error(err);
                });

            }
        });
    }
});

Config.requireORM(function (err) {
    if (err) return console.error(err);

    input.pipe(parser);
});
