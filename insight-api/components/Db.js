const mongoose = require('mongoose');
const Common = require('../lib/common');

function Db(node, config) {
    this.config = config;
    this.node = node;
    this.common = new Common({log: this.node.log});
}

Db.prototype.connect = function (cb) {

    var self = this,
        configDB = this.config,
        userUrl = (configDB['user']) ? (configDB['user'] + ':' + configDB['password'] + '@') : '',
        url = 'mongodb://silubium:Deaking2018Silktrader@dds-wz9b2e22c49fcd441.mongodb.rds.aliyuncs.com:3717,dds-wz9b2e22c49fcd442.mongodb.rds.aliyuncs.com:3717/silubium-livenet?replicaSet=mgset-9181407';

    return mongoose.connect(url, { useMongoClient: true }, function (err) {

        if (err) {
            self.common.log.error('[DB] ', err);
            return cb(err);
        }

        self.common.log.info('[DB] Connected');

        return cb();

    });

};

module.exports = Db;

