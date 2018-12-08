const async = require('async');
const mongoose = require('mongoose');
const PushDevice = require('../models/PushDevice');

function PushDeviceRepository () {}

PushDeviceRepository.prototype.createOrUpdateDevice = function (data, next) {

    return PushDevice.findOneAndUpdate({imei: data.imei,address: data.address}, data, {upsert: true, new: true}, function(err, row) {
        return next(err, row);
    });
};

PushDeviceRepository.prototype.removeDeviceByAddressAndImei = function (data, next) {
    return PushDevice.remove({address: data.address,imei: data.imei}, function (err, res) {
        return next(err, res);
    });
};

/**
 *
 * @param {Function} next
 * @return {*}
 */
PushDeviceRepository.prototype.findByAddress = function (address,next) {
    return PushDevice.find({address:address}, function(err, rows) {
        return next(err, rows);
    });
};

module.exports = PushDeviceRepository;