'use strict';

var bitcore = require('silubiumcore-lib');
var async = require('async');
var moment = require('moment');
var _ = bitcore.deps._;
var Common = require('./common');
var ResponseError = require('../components/errors/ResponseError');
var MAX_ITEMS_LIMIT = 100;

/**
 *
 * @param {Object} node
 * @param {Object} opts
 * @constructor
 */
function Src20Controller(node, opts) {
    this.node = node;
    this.common = new Common({log: this.node.log});
    this.src20ContractsRepository = opts.src20ContractsRepository;
    this.src20TransferRepository = opts.src20TransferRepository;
    this.src20BalanceRepository = opts.src20BalanceRepository;
    this.allTokensListService = opts.allTokensListService;
}

/**
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} res.params
 * @param {String} res.params.contractAddress
 * @param {Object} res.query
 * @param {String} res.query.address
 * @return {*}
 */
Src20Controller.prototype.getInfo = function (req, res) {

    var self = this,
        contractAddress = req.params.contractAddress,
        address = req.query.address,
        addresses = [],
        returnData = {
            contract: null,
            countTransfers: 0,
            countHolders: 0
        };

    if (address) {
        addresses.push(address);
    }

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContract(contractAddress, function (err, result) {

            if (err) {
                return callback(err);
            }

            if (!result) {
                return callback(new ResponseError('Not Found', 404));
            }

            returnData.contract = result;

            return callback();
        });
    }, function (callback) {
        return self.src20TransferRepository.getCountTransfers(returnData.contract.contract_address, {addresses: addresses}, function (err, count) {

            if (err) {
                return callback(err);
            }

            returnData.countTransfers = count;

            return callback();

        });
    }, function (callback) {

        return self.src20BalanceRepository.getCountBalances(returnData.contract.contract_address, {addresses: addresses}, function (err, count) {

            if (err) {
                return callback(err);
            }

            returnData.countHolders = count;

            return callback();

        });
    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            contract_address: returnData.contract.contract_address,
            total_supply: returnData.contract.total_supply,
            decimals: returnData.contract.decimals,
            name: returnData.contract.name,
            symbol: returnData.contract.symbol,
            version: returnData.contract.version,
            transfers_count: returnData.countTransfers,
            holders_count: returnData.countHolders,
            tx_hash: returnData.contract.tx_hash,
            updated_at: returnData.contract.updated_at,
            block_height: returnData.contract.block_height,
            contract_address_base: returnData.contract.contract_address_base,
            exception: returnData.contract.exception,
            created_at: returnData.contract.created_at,
            tx_date_time: returnData.contract.tx_date_time,
            tx_time: returnData.contract.tx_time
        });

    });

};

/**
 *
 * @param {Object} req
 * @param {Object} req.params
 * @param {String} req.params.contractBaseAddress
 * @param {Object} req.query
 * @param {String} req.query.format
 * @param {Object} res
 * @return {*}
 */
Src20Controller.prototype.getTotalSupply = function (req, res) {
    var self = this,
        contractBaseAddress = req.params.contractBaseAddress,
        dataFlow = {
            contract: null
        };

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContractByBaseAddress(contractBaseAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            dataFlow.contract = contract;

            return callback();

        });
    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        if (req.query.format && req.query.format === 'object') {
            return res.jsonp({
                total_supply: dataFlow.contract.total_supply
            });
        }

        return res.status(200).send(dataFlow.contract.total_supply);

    });

};

/**
 *
 * @param {Object} req
 * @param {Object} req.params
 * @param {String} req.params.contractBaseAddress
 * @param {String} req.params.accountAddress
 * @param {Object} req.query
 * @param {String} req.query.format
 * @param {Object} res
 * @return {*}
 */
Src20Controller.prototype.getAccountBalance = function (req, res) {

    var self = this,
        contractBaseAddress = req.params.contractBaseAddress,
        accountAddress = req.params.accountAddress,
        dataFlow = {
            contract: null
        };

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContractByBaseAddress(contractBaseAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            dataFlow.contract = contract;

            return callback();

        });
    }, function (callback) {
        return self.src20BalanceRepository.fetchBalanceByBaseAddressAndContract(accountAddress, contractBaseAddress, function (err, balance) {

            if (err) {
                return callback(err);
            }

            if (!balance) {
                return callback(new ResponseError('Not Found', 404));
            }

            return callback(err, balance);

        });
    }], function (err, balance) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        if (req.query.format && req.query.format === 'object') {
            return res.jsonp({
                balance: balance.amount
            });
        }

        return res.status(200).send(balance.amount);

    });

};

/**
 *
 * @param {Object} req
 * @param {Object} req.params
 * @param {String} req.params.contractBaseAddress
 * @param {String} req.params.accountAddress
 * @param {Number} req.query.offset
 * @param {Number} req.query.limit
 * @param {Number} req.query.from_block
 * @param {Number} req.query.to_block
 * @param {String} req.query.from_date_time
 * @param {String} req.query.to_date_time
 * @param {Array} req.query.addresses
 * @param {Object} res
 * @return {*}
 */
Src20Controller.prototype.getContractTransactions = function (req, res) {

    var self = this,
        contractBaseAddress = req.params.contractBaseAddress,
        offset = req.query.offset,
        limit = req.query.limit,
        from_block = req.query.from_block,
        to_block = req.query.to_block,
        from_date_time = req.query.from_date_time,
        to_date_time = req.query.to_date_time,
        addresses = req.query.addresses,
        queryOptions = self._formatQueryOptions({
            limit: limit,
            offset: offset,
            addresses: addresses,
            from_block: from_block,
            to_block: to_block,
            from_date_time: from_date_time,
            to_date_time: to_date_time
        }),
        dataFlow = {
            contract: null,
            countTransfers: 0,
            transfers: []
        };

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContractByBaseAddress(contractBaseAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            dataFlow.contract = contract;

            return callback();

        });
    }, function (callback) {

        return self.src20TransferRepository.getCountTransfers(dataFlow.contract.contract_address, queryOptions, function (err, count) {

            if (err) {
                return callback(err);
            }

            dataFlow.countTransfers = count;

            return callback();

        });

    }, function (callback) {

        if (!dataFlow.countTransfers) {
            return callback();
        }

        return self.src20TransferRepository.fetchTransfers(dataFlow.contract.contract_address, queryOptions, function (err, transfers) {

            if (err) {
                return callback(err);
            }

            dataFlow.transfers = transfers;

            return callback();

        });

    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            limit: queryOptions.limit,
            offset: queryOptions.offset,
            addresses: queryOptions.addresses,
            from_block: queryOptions.from_block,
            to_block: queryOptions.to_block,
            from_date_time: queryOptions.from_date_time,
            to_date_time: queryOptions.to_date_time,
            count: dataFlow.countTransfers,
            items: dataFlow.transfers.map(function (transfer) {
                return {
                    contract_address_base: transfer.contract_address_base,
                    block_height: transfer.block_height,
                    tx_hash: transfer.tx_hash,
                    from: transfer.from,
                    to: transfer.to,
                    value: transfer.value,
                    block_date_time: transfer.block_date_time
                };
            })
        });

    });

};

Src20Controller.prototype.getBalances = function (req, res) {
    var self = this,
        contractAddress = req.params.contractAddress,
        sort = {
            direction: 'desc',
            field: 'amount',
            allowFields: ['amount']
        },
        offset = req.query.offset,
        limit = req.query.limit,
        queryOptions = self._formatQueryOptions({
            limit: limit, offset: offset, addresses: [], sort: sort
        }),
        dataFlow = {
            contract: null,
            countBalances: 0,
            balances: []
        };


    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContract(contractAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            dataFlow.contract = contract;

            return callback();

        });
    }, function (callback) {

        return self.src20BalanceRepository.getCountBalances(dataFlow.contract.contract_address, queryOptions, function (err, count) {

            if (err) {
                return callback(err);
            }

            dataFlow.countBalances = count;

            return callback();

        });

    }, function (callback) {

        if (!dataFlow.countBalances) {
            return callback();
        }

        return self.src20BalanceRepository.fetchBalances(dataFlow.contract.contract_address, queryOptions, function (err, balances) {

            if (err) {
                return callback(err);
            }

            dataFlow.balances = balances;

            return callback();

        });

    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            limit: queryOptions.limit,
            offset: queryOptions.offset,
            count: dataFlow.countBalances,
            items: dataFlow.balances.map(function (balance) {
                return {
                    contract_address: balance.contract_address,
                    address: balance.address,
                    address_eth: balance.address_eth,
                    amount: balance.amount
                };
            })
        });

    });

};


/**
 *
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} req.query.balanceAddress
 * @param {String?} req.query.contractAddress
 * @param {Object} res
 * @return {*}
 */
Src20Controller.prototype.findBalancesByTransferAddress = function (req, res) {

    var self = this,
        balanceAddress = req.query.balanceAddress,
        contractAddress = req.query.contractAddress,
        dataFlow = {
            uniqueContracts: [],
            contracts: [],
            balances: []
        };

    if (contractAddress) {

        var symbolDataFlow = {};

        return async.waterfall([function (callback) {
            return self.src20ContractsRepository.fetchContract(contractAddress, function (err, result) {

                if (err) {
                    return callback(err);
                }

                if (!result) {
                    return callback(new ResponseError('Not Found', 404));
                }

                symbolDataFlow.contract = result;

                return callback();
            });
        }, function (callback) {

            var contract = symbolDataFlow.contract;

            return self.src20BalanceRepository.fetchBalanceByAddressAndContract(balanceAddress, contract.contract_address, function (err, balance) {

                if (err) {
                    return callback(err);
                }

                if (!balance) {
                    return callback(new ResponseError('Not Found', 404));
                }

                return callback(null, {
                    amount: balance.amount,
                    address: balance.address,
                    address_eth: balance.address_eth,
                    contract: contract
                });

            });

        }], function (err, result) {

            if (err) {
                return self.common.handleErrors(err, res);
            }

            return res.jsonp(result);

        });

    }

    return async.waterfall([function (callback) {

        return self.src20BalanceRepository.fetchBalancesByAddress(balanceAddress, function (err, balances) {

            if (err) {
                return callback(err);
            }

            if (!balances.length) {
                return callback();
            }

            dataFlow.balances = balances;

            return callback();

        });

    }, function (callback) {


        if (!dataFlow.balances.length) {
            return callback();
        }

        var contractsAddresses = [];

        dataFlow.balances.forEach(function (balance) {
            contractsAddresses.push(balance.contract_address);
        });

        return self.src20ContractsRepository.fetchContracts(contractsAddresses, function (err, results) {

            if (err) {
                return callback(err);
            }

            dataFlow.contracts = results;

            return callback();
        });

    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        var contractsHash = {};

        dataFlow.contracts.forEach(function (contract) {
            contractsHash[contract.contract_address] = contract;
        });

        var result = [];

        dataFlow.balances.forEach(function (balance) {
            result.push({
                amount: balance.amount,
                address: balance.address,
                address_eth: balance.address_eth,
                contract: contractsHash[balance.contract_address]
            });
        });

        return res.jsonp(result);
    });

};


/**
 *
 * @param {Object} req
 * @param {Object} req.query
 * @param {String} req.query.balanceAddress
 * @param {String?} req.query.contractAddress
 * @param {Object} res
 * @return {*}
 */
Src20Controller.prototype.listBalancesByAddresses = function (req, res) {

    var self = this,
        contractBaseAddress = req.params.contractAddress,
        dataFlow = {
            contractAddress: '',
            balances: []
        },
        tempContract=null;

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContract(contractBaseAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            tempContract = contract;

            return callback();

        });
    }, function (callback) {
        return self.src20BalanceRepository.fetchBalanceByManyAddressAndContract(req.addrs, contractBaseAddress, function (err, balance) {

            if (err) {
                return callback(err);
            }

            if (!balance) {
                return callback(new ResponseError('Not Found', 404));
            }

            return callback(err, balance);

        });
    }], function (err, balance) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        dataFlow.contractAddress = contractBaseAddress;
        balance.forEach(function (item) {
            dataFlow.balances.push({address:item.address,balance:item.amount/Math.pow(10, tempContract.decimals)});
        })
        return res.jsonp(dataFlow);

    });

};


Src20Controller.prototype.findSrc20Contracts = function (req, res) {

    var self = this,
        query = req.query.query;

    if (!query || !_.isString(query) || !query.trim() || query.length > 255) {
        return self.common.handleErrors(new ResponseError('Bad query', 422), res);
    }

    return self.src20ContractsRepository.findContract(query, {}, function (err, results) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            count: results.length, items: results.map(function (contract) {
                return contract;
            })
        });

    });

};

Src20Controller.prototype.getTransfers = function (req, res) {

    var self = this,
        contractAddress = req.params.contractAddress,
        offset = req.query.offset,
        limit = req.query.limit,
        addresses = req.query.addresses,
        queryOptions = self._formatQueryOptions({limit: limit, offset: offset, addresses: addresses}),
        dataFlow = {
            contract: null,
            countTransfers: 0,
            transfers: []
        };

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchContract(contractAddress, function (err, contract) {

            if (err) {
                return callback(err);
            }

            if (!contract) {
                return callback(new ResponseError('Not Found', 404));
            }

            dataFlow.contract = contract;

            return callback();

        });
    }, function (callback) {

        return self.src20TransferRepository.getCountTransfers(dataFlow.contract.contract_address, {addresses: queryOptions.addresses}, function (err, count) {

            if (err) {
                return callback(err);
            }

            dataFlow.countTransfers = count;

            return callback();

        });

    }, function (callback) {

        if (!dataFlow.countTransfers) {
            return callback();
        }

        return self.src20TransferRepository.fetchTransfers(dataFlow.contract.contract_address, queryOptions, function (err, transfers) {

            if (err) {
                return callback(err);
            }

            dataFlow.transfers = transfers;

            return callback();

        });

    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            limit: queryOptions.limit,
            offset: queryOptions.offset,
            count: dataFlow.countTransfers,
            items: dataFlow.transfers.map(function (transfer) {
                return {
                    contract_address: transfer.contract_address,
                    tx_hash: transfer.tx_hash,
                    tx_time: transfer.tx_time,
                    from: transfer.from,
                    from_eth: transfer.from_eth,
                    to: transfer.to,
                    to_eth: transfer.to_eth,
                    value: transfer.value
                };
            })
        });

    });

};

Src20Controller.prototype.getTransfersByAddress = function (req, res) {


    var self = this,
        offset = req.query.offset,
        limit = req.query.limit,
        addresses = req.query.address,
        contract_address = req.query.contractAddress,
        tx_hash = req.query.txHash,
        queryOptions = self._formatQueryOptions({
            limit: limit,
            offset: offset,
            addresses: addresses,
            contractAddress: contract_address,
            txHash: tx_hash
        }),
        dataFlow = {
            contracts: [],
            countTransfers: 0,
            transfers: []
        };


    console.log('queryOptions:' + JSON.stringify(queryOptions));
    return async.waterfall([function (callback) {

        return self.src20TransferRepository.getCountTransfersByAddress({
            addresses: queryOptions.addresses,
            contractAddress: queryOptions.contractAddress,
            tx_hash: queryOptions.tx_hash
        }, function (err, count) {

            if (err) {
                return callback(err);
            }

            dataFlow.countTransfers = count;

            return callback();

        });

    }, function (callback) {

        if (!dataFlow.countTransfers) {
            return callback();
        }

        return self.src20TransferRepository.fetchTransfersByAddress(queryOptions, function (err, transfers) {

            if (err) {
                return callback(err);
            }

            dataFlow.transfers = transfers;

            return callback();

        });

    }, function (callback) {

        if (!dataFlow.countTransfers) {
            return callback();
        }

        return self.src20ContractsRepository.fetchAllContracts(function (err, contracts) {

            if (err) {
                return callback(err);
            }

            var contractName = {};
            var contractDecimals = {};

            contracts.forEach(function (item) {
                contractName[item.contract_address] = item.symbol;
                contractDecimals[item.contract_address] = item.decimals;
            });

            dataFlow.transfers.forEach(function (transfer) {
                dataFlow.contracts.push({
                    contract_address: transfer.contract_address,
                    tx_hash: transfer.tx_hash,
                    tx_time: transfer.tx_time,
                    from: transfer.from,
                    from_eth: transfer.from_eth,
                    to: transfer.to,
                    to_eth: transfer.to_eth,
                    value: transfer.value,
                    decimals: contractDecimals[transfer.contract_address] ? contractDecimals[transfer.contract_address] : 8,
                    symbol: contractName[transfer.contract_address] ? contractName[transfer.contract_address] : 'SDC'
                });
            });

            return callback();

        });

    }], function (err) {

        if (err) {
            return self.common.handleErrors(err, res);
        }

        return res.jsonp({
            limit: queryOptions.limit,
            offset: queryOptions.offset,
            count: dataFlow.countTransfers,
            items: dataFlow.contracts
        })
    });

};

Src20Controller.prototype.getAllTokens = function (req, res) {


    var self = this,
        offset = req.query.offset,
        limit = req.query.limit,
        order = req.query.order,
        queryOptions = self._formatPageQueryOptions({limit: limit, offset: offset}),
        dataFlow = {
            contracts: [],
            allContracts: [],
            countHolders: [],
            tempCount: 0
        };

    //this.allTokensListService.getList(function (err, data) {});

    return async.waterfall([function (callback) {
        return self.src20ContractsRepository.fetchAllContracts(function (err, rows) {

            if (err) {
                return callback(err);
            }

            dataFlow.allContracts = rows;
            dataFlow.tempCount = dataFlow.allContracts.length;
            return callback();

        });
    }, function (callback) {
        return self.src20BalanceRepository.fetchContractsCountHolders(function (err, rows) {

            if (err) {
                return callback(err);
            }

            dataFlow.countHolders = rows;

            return callback();
        });
    }, function (callback) {

        var countHoldersHash = {};

        dataFlow.countHolders.forEach(function (item) {
            countHoldersHash[item._id] = item.count;
        });

        dataFlow.allContracts.forEach(function (contract) {
            dataFlow.contracts.push({
                count_holders: countHoldersHash[contract.contract_address] ? countHoldersHash[contract.contract_address] : 0,
                tx_hash: contract.tx_hash,
                vout_idx: contract.vout_idx,
                updated_at: contract.updated_at,
                block_height: contract.block_height,
                contract_address: contract.contract_address,
                contract_address_base: contract.contract_address_base,
                decimals: contract.decimals,
                name: contract.name,
                symbol: contract.symbol,
                total_supply: contract.total_supply,
                version: contract.version,
                exception: contract.exception,
                created_at: contract.created_at,
                description: contract.description ? contract.description : null,
                tx_date_time: contract.tx_date_time,
                tx_time: contract.tx_time
            });
        });


        if (order == 'time') {
            dataFlow.contracts.sort(function (a, b) {
                if (a.tx_time < b.tx_time) {
                    return 1;
                } else if (a.tx_time > b.tx_time) {
                    return -1;
                } else {
                    if (a.tx_time < b.tx_time) {
                        return -1;
                    } else if (a.tx_time > b.tx_time) {
                        return 1;
                    }
                    return 0;
                }
            });
        } else {
            //利用js中的sort方法
            dataFlow.contracts.sort(sortprice);
        }

        if (queryOptions.offset + queryOptions.limit > dataFlow.tempCount && queryOptions.offset <= dataFlow.tempCount) {
            dataFlow.contracts = dataFlow.contracts.slice(queryOptions.offset);
        } else if (queryOptions.offset > dataFlow.tempCount) {
            dataFlow.contracts = [];
        }
        else {
            dataFlow.contracts = dataFlow.contracts.slice(queryOptions.offset, queryOptions.offset + queryOptions.limit);
        }


        return callback();

    }], function (err) {

        if (err) {
            return self.common.log.error('[ALL TOKENS LIST Service] ERROR ', height);
        }
        return res.jsonp({
            limit: queryOptions.limit,
            offset: queryOptions.offset,
            count: dataFlow.tempCount,
            items: dataFlow.contracts
        });
    });


};

function sortprice(a, b) {
    return b.count_holders - a.count_holders;
};

Src20Controller.prototype._formatQueryOptions = function (options) {

    var limit = options.limit,
        offset = options.offset,
        queryAddresses = options.addresses,
        sort = options.sort,
        from_block = options.from_block,
        to_block = options.to_block,
        from_date_time = options.from_date_time,
        tx_hash = options.txHash,
        to_date_time = options.to_date_time;

    limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);

    if (isNaN(limit)) {
        limit = MAX_ITEMS_LIMIT;
    }

    if (isNaN(offset)) {
        offset = 0;
    }

    from_block = parseInt(from_block, 10);
    to_block = parseInt(to_block, 10);

    if (isNaN(from_block)) {
        from_block = null;
    }

    if (isNaN(to_block)) {
        to_block = null;
    }

    if (sort) {
        sort.direction = _.isString(sort.direction) && ['desc', 'asc'].indexOf(sort.direction) !== -1 ? sort.direction : null;
        sort.field = _.isString(sort.field) && sort.allowFields.indexOf(sort.field) !== -1 ? sort.field : null;

        if (!sort.direction || !sort.field) {
            sort = null;
        }

    }

    var addresses = [];


    limit = Math.abs(limit);
    offset = Math.abs(offset);

    if (limit > MAX_ITEMS_LIMIT) {
        limit = MAX_ITEMS_LIMIT;
    }

    if (queryAddresses && _.isArray(queryAddresses) && queryAddresses.length) {
        queryAddresses.forEach(function (address) {
            if (_.isString(address)) {
                addresses.push(address);
            }
        });
    } else if (queryAddresses && _.isString(queryAddresses)) {
        addresses.push(queryAddresses);
    }


    if (!from_date_time || !moment(from_date_time, moment.ISO_8601).isValid()) {
        from_date_time = null;
    }
    if (!to_date_time || !moment(to_date_time, moment.ISO_8601).isValid()) {
        to_date_time = null;
    }

    return {
        offset: offset,
        limit: limit,
        addresses: addresses,
        sort: sort,
        from_block: from_block,
        to_block: to_block,
        from_date_time: from_date_time,
        to_date_time: to_date_time,
        contractAddress: options.contractAddress,
        tx_hash: tx_hash
    };
};


Src20Controller.prototype._formatPageQueryOptions = function (options) {

    var limit = options.limit,
        offset = options.offset,

        limit = parseInt(limit, 10);
    offset = parseInt(offset, 10);

    if (isNaN(limit)) {
        limit = MAX_ITEMS_LIMIT;
    }

    if (isNaN(offset)) {
        offset = 0
    }


    limit = Math.abs(limit);
    offset = Math.abs(offset);

    if (limit > MAX_ITEMS_LIMIT) {
        limit = MAX_ITEMS_LIMIT;
    }


    return {
        offset: offset,
        limit: limit
    };
};


Src20Controller.prototype.convertContractAddress = function (req, res, next) {

    if (_.isString(req.params.contractAddress)) {
        req.params.contractAddress = req.params.contractAddress.replace(/^0x/, '');
    }

    return next();
};

module.exports = Src20Controller;