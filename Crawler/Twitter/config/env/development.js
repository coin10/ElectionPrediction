
module.exports = {
    mysqlConnection: {
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'T',
        protocol: 'mysql',
        port: '3306'
    },
    dataPath: '/Volumes/External\ Drive/ElectionPrediction/data',
    rateLimit: {
        requests: 170,
        window: 15 * 60 * 1000
    },
    geocodingApi: 'http://localhost.com/v1/search'
};