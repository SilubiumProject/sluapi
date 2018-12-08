const async = require('async');
const Src20Contracts = require('../models/Src20Contracts');

function Src20ContractsRepository () {}


/**
 *
 * @param {Function} next
 * @return {*}
 */
Src20ContractsRepository.prototype.fetchAllContracts = function (next) {
    return Src20Contracts.find({}, function(err, rows) {
        return next(err, rows);
    });
};

/**
 * 添加分页和排序
 * @param {Object} options
 * @param {Function} next
 * @return {*}
 */
Src20ContractsRepository.prototype.fetchAllContractsNew = function (options,next) {
    return Src20Contracts.find({},{}, {limit: options.limit, skip: options.offset}, function(err, rows) {
        return next(err, rows);
    });
};

/**
 *
 * @param {Array} contractAddresses
 * @param {Function} next
 * @return {*}
 */
Src20ContractsRepository.prototype.fetchContracts = function (contractAddresses, next) {
    return Src20Contracts.find({contract_address: {$in: contractAddresses}}, function(err, row) {
        return next(err, row);
    });
};

Src20ContractsRepository.prototype.fetchContractByBaseAddress = function (contractBaseAddress, next) {
    return Src20Contracts.findOne({contract_address_base: contractBaseAddress}, function(err, row) {
        return next(err, row);
    });
};
Src20ContractsRepository.prototype.fetchContract = function (contractAddress, next) {
    return Src20Contracts.findOne({contract_address: contractAddress}, function(err, row) {
        return next(err, row);
    });
};

Src20ContractsRepository.prototype.updateTotalSupply = function (contractAddress, totalSupply, next) {
    return Src20Contracts.update({contract_address: contractAddress}, {total_supply: totalSupply}, function(err, row) {
        return next(err, row);
    });
};

Src20ContractsRepository.prototype.createOrUpdateTx = function (data, next) {

    return Src20Contracts.findOneAndUpdate({tx_hash: data.tx_hash, vout_idx: data.vout_idx}, data, {upsert: true, new: true}, function(err, row) {
        return next(err, row);
    });

};

Src20ContractsRepository.prototype.findContract = function (query, options, next) {
    var where = {};

    where.$or = [{symbol : new RegExp(query, 'i')}, {name : new RegExp(query, 'i')}];

    if (query.length === 40) {
        where.$or.push({contract_address: query})
    }

    if (query.length === 34) {
        where.$or.push({contract_address_base: query})
    }

    return Src20Contracts.find(where, {}, {limit: 100}, function(err, row) {
        return next(err, row);
    });
};

module.exports = Src20ContractsRepository;