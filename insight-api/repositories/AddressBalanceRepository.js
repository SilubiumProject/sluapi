const async = require('async');
const mongoose = require('mongoose');
const AddressBalance = require('../models/AddressBalance');

function AddressBalanceRepository () {}

AddressBalanceRepository.prototype.createOrUpdateBalance = function (data, next) {

    return AddressBalance.findOneAndUpdate({address: data.address}, data, {upsert: true, new: true}, function(err, row) {
        return next(err, row);
    });
};

AddressBalanceRepository.prototype.removeBalanceByAddress = function (address, next) {
    return AddressBalance.remove({address: address}, function (err, res) {
        return next(err, res);
    });
};

AddressBalanceRepository.prototype.listBalanceByAddresses = function (addresses, next) {
    // db.getCollection('addressbalances').find({address:{$in:['SLScxwrnxPqL6QQ5TKKH42WSjXUc2sokUGgP','SLSQWxnqf7fZ7ZPYYYE1Q9a7DQvU8NpnMK8o']}})
    return AddressBalance.find({address: {$in:addresses}}, function (err, res) {
        return next(err, res);
    });
};

AddressBalanceRepository.prototype.getMaxBalance = function (next) {
    return AddressBalance.findOne().sort({'balance': -1}).exec( function(err, res) {
        return next(err, res);
    });
};

AddressBalanceRepository.prototype.getMaxBalances = function (options, next) {
    return AddressBalance.find().sort({'balance': -1}).limit(options.limit).exec( function(err, res) {
        return next(err, res);
    });
};

AddressBalanceRepository.prototype.getCountAddressesGreaterThan = function (min, next) {
    return AddressBalance.count({balance: {$gt: min}}, function(err, res) {
        return next(err, res);
    });
};

AddressBalanceRepository.prototype.getInfoByInterval = function (min, max, next) {
    return AddressBalance.aggregate([
        { $match: { balance: {$gt: min, $lte: max} } },
        { $group: {
            _id: null,
            sum: { $sum: "$balance" },
            count: { $sum: 1 }
        }}
    ], function (err, res) {
        return next(err, res);
    });

};

AddressBalanceRepository.prototype.getCountRicherThan = function (next) {
    return AddressBalance.findOne().sort({'balance': -1}).exec( function(err, res) {
        return next(err, res);
    });
};

module.exports = AddressBalanceRepository;