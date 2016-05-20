
module.exports = {
    mysqlConnection: {
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'COIN_ElectionPrediction',
        protocol: 'mysql',
        port: '3306'
    },
    dataPath: './data',
    rateLimit: {
        requests: 170,
        window: 15 * 60 * 1000
    }
};