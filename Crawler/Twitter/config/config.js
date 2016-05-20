
var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    glob = require('glob');

function Config () {
    this.initGlobalConfig();
}

Config.prototype.validateEnvironmentVariable = function () {
    var environmentFiles = glob.sync(path.resolve('./config/env/' + process.env.NODE_ENV + '.js'));
    //console.log();
    if (!environmentFiles.length) {
        if (process.env.NODE_ENV) {
    //        console.error('+ Error: No configuration file found for "' + process.env.NODE_ENV + '" environment using development instead');
        } else {
    //        console.error('+ Error: NODE_ENV is not defined! Using default development environment');
        }
        process.env.NODE_ENV = 'development';
    }
    // Reset console color
    //console.log();
};

Config.prototype.getGlobbedPaths = function(globPatterns, excludes) {
    var self = this;

    // URL paths regex
    var urlRegex = new RegExp('^(?:[a-z]+:)?\/\/', 'i');

    // The output array
    var output = [];

    // If glob pattern is array then we use each pattern in a recursive way, otherwise we use glob
    if (_.isArray(globPatterns)) {
        globPatterns.forEach(function (globPattern) {
            output = _.union(output, self.getGlobbedPaths(globPattern, excludes));
        });
    } else if (_.isString(globPatterns)) {
        if (urlRegex.test(globPatterns)) {
            output.push(globPatterns);
        } else {
            var files = glob.sync(globPatterns);
            if (excludes) {
                files = files.map(function (file) {
                    if (_.isArray(excludes)) {
                        for (var i in excludes) {
                            file = file.replace(excludes[i], '');
                        }
                    } else {
                        file = file.replace(excludes, '');
                    }
                    return file;
                });
            }
            output = _.union(output, files);
        }
    }

    return output;
};

/**
 * Initialize global configuration
 */
Config.prototype.initGlobalConfig = function () {
    var self = this;

    // Validate NODE_ENV existence
    this.validateEnvironmentVariable();

    // Get the default config
    var defaultConfig = require(path.join(process.cwd(), 'config/env/default'));

    // Get the current config
    var environmentConfig = require(path.join(process.cwd(), 'config/env/', process.env.NODE_ENV)) || {};

    // Merge config files
    var config = _.merge(defaultConfig, environmentConfig)

    for (var key in config) { self[key] = config[key]; }

    // read package.json for MEAN.JS project information
    var pkg = require(path.resolve('./package.json'));
    this.package = pkg;

    // We only extend the config object with the local.js custom/local environment if we are on
    // production or development environment. If test environment is used we don't merge it with local.js
    // to avoid running test suites on a prod/dev environment (which delete records and make modifications)
    if (process.env.NODE_ENV !== 'test') {
        config = _.merge(config, (fs.existsSync(path.join(process.cwd(), 'config/env/local.js')) && require(path.join(process.cwd(), 'config/env/local.js'))) || {});

        for (var key in config) { self[key] = config[key]; }
    }

    var credentialsConfig = self.getGlobbedPaths(path.join(process.cwd(), 'config/credentials/*.js'));
    self.credentials = [];
    credentialsConfig.forEach(function (credential) {
        self.credentials.push(require(credential));
    });

};

Config.prototype.requireORM = function (done) {
    var self    = this,
        db      = {},
        orm     = require('orm');

    orm.connect(this.mysqlConnection, function (err, db) {
        if (err && !done) return console.error('Could not connect to database: \n\t' + err);
        else if (err && done) return done(err);

        self.db.connection = db;

        var models = glob.sync(path.resolve('./config/models/*.js'));
        if (!models && !done) return console.error('Could not load models');
        else if (!models && done) return done('Could not load models');

        self.db.models = {};
        models.forEach(function (model) {
            require(model)(self);
        });

        self.db.connection.sync(function (err) {
            if (done) return done(err);
            if (err) return console.error('Could not sync database');
        });

    });
};

module.exports = new Config();