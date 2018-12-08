const async = require('async');
const Src20Transfer = require('../models/Src20Transfer');

function Src20TransferRepository () {}


/**
 *
 * @param {String} contractAddress
 * @param {Object} options
 * @return {{contract_address: *}}
 * @private
 */
Src20TransferRepository.prototype._getTransfersConditions = function (contractAddress, options) {

    var where = {contract_address: contractAddress};

    if (options && options.addresses && options.addresses.length) {
        where.$or = [{from : {$in: options.addresses}}, {to : {$in: options.addresses}}];
    }

    if (options && (options.from_block || options.to_block)) {
        where['block_height'] = {};
    }

    if (options && options.from_block) {
        where['block_height']['$gte'] = options.from_block;
    }

    if (options && options.to_block) {
        where['block_height']['$lte'] = options.to_block;
    }

    if (options && (options.from_date_time || options.to_date_time)) {
        where['block_date_time'] = {};
    }

    if (options && options.from_date_time) {
        where['block_date_time']['$gte'] = options.from_date_time;
    }

    if (options && options.to_date_time) {
        where['block_date_time']['$lte'] = options.to_date_time;
    }

    return where;
};

/**
 *
 * @param {Object} options
 * @return {{contract_address: *}}
 * @private
 */
Src20TransferRepository.prototype._getTransfersConditionsByAddress = function (options) {

    var where = {};
    if (options && options.contractAddress) {
        where = {contract_address:options.contractAddress};
    }
    if (options && options.addresses && options.addresses.length) {
        where.$or = [{from : {$in: options.addresses}}, {to : {$in: options.addresses}}];
    }

    if (options && (options.from_block || options.to_block)) {
        where['block_height'] = {};
    }

    if (options && options.from_block) {
        where['block_height']['$gte'] = options.from_block;
    }

    if (options && options.to_block) {
        where['block_height']['$lte'] = options.to_block;
    }

    if (options && (options.from_date_time || options.to_date_time)) {
        where['block_date_time'] = {};
    }

    if (options && options.from_date_time) {
        where['block_date_time']['$gte'] = options.from_date_time;
    }

    if (options && options.to_date_time) {
        where['block_date_time']['$lte'] = options.to_date_time;
    }

    if (options && options.tx_hash) {
        where['tx_hash'] = options.tx_hash;
    }
    console.log('where:'+JSON.stringify(where));
    return where;
};
/**
 *
 * @param {String} contractAddress
 * @param {Object} options
 * @param {Array?} options.addresses
 * @param {Function} next
 * @return {*}
 */
Src20TransferRepository.prototype.getCountTransfers = function (contractAddress, options, next) {
    return Src20Transfer.count(this._getTransfersConditions(contractAddress, options), function(err, count) {
        return next(err, count);
    });

};

/**
 *
 * @param {String} Address
 * @param {Object} options
 * @param {Array?} options.addresses
 * @param {Function} next
 * @return {*}
 */
Src20TransferRepository.prototype.getCountTransfersByAddress = function (options, next) {
    return Src20Transfer.count(this._getTransfersConditionsByAddress(options), function(err, count) {
        return next(err, count);
    });

};
/**
 *
 * @param {String} txHash
 * @param {Function} next
 * @return {*}
 */
Src20TransferRepository.prototype.isTransfersExistsByTxHash = function (txHash, next) {
    return Src20Transfer.findOne({tx_hash: txHash}, function(err, transfer) {
        return next(err, !!transfer);
    });
};

/**
 *
 * @param {String} contractAddress
 * @param {Object} options
 * @param {Number} options.limit
 * @param {Number} options.offset
 * @param {Array?} options.addresses
 * @param {Function} next
 */
Src20TransferRepository.prototype.fetchTransfers = function (contractAddress, options, next) {

    return Src20Transfer.find(this._getTransfersConditions(contractAddress, options), {}, {sort: {block_height: -1,tx_time:-1}, limit: options.limit, skip: options.offset}, function(err, transfers) {
        return next(err, transfers);
    });

};

/**
 *
 * @param {Object} options
 * @param {Number} options.limit
 * @param {Number} options.offset
 * @param {Array?} options.addresses
 * @param {Function} next
 */
Src20TransferRepository.prototype.fetchTransfersByAddress = function (options, next) {

    return Src20Transfer.find(this._getTransfersConditionsByAddress(options), {}, {sort: {block_height: -1,tx_time:-1}, limit: options.limit, skip: options.offset}, function(err, transfers) {
        return next(err, transfers);
    });

};
/**
 *
 * @param {Object} data
 * @param {Function} next
 */
Src20TransferRepository.prototype.createOrUpdateTx = function (data, next) {

    return Src20Transfer.findOneAndUpdate({tx_hash: data.tx_hash, log_idx: data.log_idx, contract_address: data.contract_address}, data, {upsert: true, new: true}, function(err, row) {
        return next(err, row);
    });

};

module.exports = Src20TransferRepository;