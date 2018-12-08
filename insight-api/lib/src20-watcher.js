'use strict';
var silubiumcore = require('silubiumcore-lib');
var async = require('async');
var Common = require('./common');
var ContractsHelper = require('../helpers/ContractsHelper');
var COIN_TYPE = 'SRC20_WATCHER';
var SRC20_ZERO_TOPIC_HASH = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
var SolidityCoder = require("web3/lib/solidity/coder.js");
var functionHashes = require("../data/contracts/src20/FunctionHashes.json");
var BigNumber = require('bignumber.js');
var lodash = require('lodash');

function Src20Watcher(node, options) {

    this.node = node;
    this.common = new Common({log: this.node.log});

    this.updateFromBlockHeight = options.updateFromBlockHeight;

    this.lastBlockRepository = options.lastBlockRepository;
    this.src20ContractsRepository = options.src20ContractsRepository;
    this.src20TransferRepository = options.src20TransferRepository;
    this.src20BalanceRepository = options.src20BalanceRepository;
    this.pushDeviceRepository = options.pushDeviceRepository;
    this.client = options.client;

    this.lastTipHeight = 0;
    this.lastTipInProcess = false;
    this.lastTipTimeout = false;
    this.lastCheckedBlock = 0;

    this.start();

}

/**
 *
 * @return {*}
 */
Src20Watcher.prototype.start = function () {

    var self = this;

    this.common.log.info('[SRC20WATCHER] Start...');

    return async.waterfall([function (callback) {
        return self.lastBlockRepository.setLastBlockType(COIN_TYPE, self.updateFromBlockHeight, function (err) {

            if (err) {

                self.common.log.error('[SRC20WATCHER] setLastBlockType Error', err);

                return callback(err)
            }

            self.common.log.info('[SRC20WATCHER] LastBlockType set');

            return callback();

        });
    }, function (callback) {
        return self.lastBlockRepository.getLastBlockByType(COIN_TYPE, function (err, existingType) {

            if (err) {

                self.common.log.error('[SRC20WATCHER] getLastBlockByType Error', err);

                return callback(err)
            }

            self.lastCheckedBlock = existingType.last_block_number;
            self.common.log.info('[SRC20WATCHER] getLastBlockByType set', self.lastCheckedBlock);
            return callback();

        })
    }, function (callback) {
        return self.node.getInfo(function (err, data) {

            if (err) {

                self.common.log.error('[SRC20WATCHER] getInfo Error', err);

                return callback(err);
            }

            if (data && data.blocks > self.lastTipHeight) {
                self.lastTipHeight = data.blocks;
            }

            self.common.log.info('[SRC20WATCHER] lastTipHeight = ', self.lastTipHeight);

            return callback();
        });
    }], function (err) {

        if (err) {
            return self.common.log.error('[SRC20WATCHER] start Error', err);
        }

        self._rapidProtectedUpdateTip(self.lastTipHeight);
        self.node.services.silubiumd.on('tip', self._rapidProtectedUpdateTip.bind(self));

    });

};

/**
 *
 * @param {Number} blockHeight
 * @param {Function} next
 * @return {*}
 */
Src20Watcher.prototype.processBlock = function (blockHeight, next) {

    var self = this;

    return self.node.getBlockOverview(blockHeight, function (err, block) {

        if (err) {
            return next(err);
        }

        return async.eachSeries(block.txids, function (txHash, callback) {

            return self.node.getJsonRawTransaction(txHash, function (err, transaction) {

                self.common.log.info('[SRC20WATCHER] TX:', txHash);

                var voutReceiptIterator = 0;
                var txTime = transaction.time;
                transaction.vout.forEach(function (vout) {
                    if (vout.scriptPubKey && ['call', 'create'].indexOf(vout.scriptPubKey.type) !== -1) {
                        vout.receiptIdx = voutReceiptIterator;
                        voutReceiptIterator++;
                    } else if(vout.scriptPubKey && 'pubkeyhash'.indexOf(vout.scriptPubKey.type) !== -1){
                        var address = vout.scriptPubKey.addresses[0];
                        self.pushDeviceRepository.findByAddress(address, function (err, data) {
                            if (err) {
                                self.common.log.info('find address from mongo error:', error);
                            }


                            /*if (data) {
                                data.forEach(function (device) {
                                    if (device.address && device.alias) {
                                        if (device.language === 'zh') {
                                            // 进行推送拉取数据的标识
                                            self.client.push().setPlatform('ios', 'android')
                                                .setAudience(jPush.JPushAsync.alias(device.alias))
                                                .setNotification('Silubium Team', jPush.JPushAsync.ios('收入金额 :' + vout.value + ' SLU'+',交易信息为：' + txHash), jPush.JPushAsync.android('收入金额 :' + vout.value + ' SLU'+',交易信息为：' + txHash, null, 1))
                                                //.setMessage(true,'update','application/json',null)
                                                .setOptions(null, 60)
                                                .send()
                                                .then(function (result) {
                                                    console.log(result)
                                                }).catch(function (err) {
                                                console.log(err)
                                            });
                                        } else {
                                            // 进行推送拉取数据的标识
                                            self.client.push().setPlatform('ios', 'android')
                                                .setAudience(jPush.JPushAsync.alias(device.alias))
                                                .setNotification('Silubium Team', jPush.JPushAsync.ios('amount :' + vout.value + ' SLU '+'new transaction : ' + txHash), jPush.JPushAsync.android('amount :' + vout.value + ' SLU '+'new transaction : ' + txHash, null, 1))
                                                //.setMessage(true,'update','application/json',null)
                                                .setOptions(null, 60)
                                                .send()
                                                .then(function (result) {
                                                    console.log(result)
                                                }).catch(function (err) {
                                                console.log(err)
                                            });
                                        }

                                    }
                                });
                            }*/
                        });
                    }
                });

                var createVouts = transaction.vout.filter(function (vout) {
                    return vout.scriptPubKey && vout.scriptPubKey.type === 'create' && ContractsHelper.isSrc20Contract(vout.scriptPubKey.hex);
                });

                var callVouts = transaction.vout.filter(function (vout) {
                    return vout.scriptPubKey && vout.scriptPubKey.type === 'call';
                });


                var receipt = null;

                return async.waterfall([function (callback) {
                    return self.node.getTransactionReceipt(txHash, function (err, response) {

                        if (err) {
                            return callback(err);
                        }

                        if (!response) {
                            return callback('Receipt error!');
                        }

                        receipt = response;

                        return callback();
                    });
                }, function (callback) {

                    /**
                     * create process
                     */

                    self.common.log.info('[SRC20WATCHER] receipt length:', receipt.length);

                    if (!receipt.length) {
                        return callback();
                    }

                    if (!createVouts.length) {
                        return async.setImmediate(function () {
                            return callback();
                        });
                    }

                    return self.processCreate(blockHeight, txHash, txTime, receipt, createVouts, function (err) {
                        return callback(err);
                    });

                }, function (callback) {

                    /**
                     * call process
                     */

                    if (!receipt.length) {
                        return callback();
                    }

                    if (!callVouts.length) {
                        return async.setImmediate(function () {
                            return callback();
                        });
                    }

                    return self.processCall(blockHeight, block, txHash, txTime, receipt, callVouts, function (err) {
                        return callback(err);
                    });

                }], function (err) {
                    return callback(err);
                });

            });

        }, function (err) {

            if (err) {
                return next(err);
            }

            return self.lastBlockRepository.updateOrAddLastBlock(block.height, COIN_TYPE, function (err) {
                return next(err);
            });

        });

    });

};

/**
 *
 * @param {Number} blockHeight
 * @param {String} txHash
 * @param {Object} block
 * @param {Object} receipt
 * @param {Object} callVouts
 * @param {Function} callback
 * @return {*}
 */
Src20Watcher.prototype.processCall = function (blockHeight, block, txHash, txTime, receipt, callVouts, callback) {

    var self = this;

    return async.waterfall([function (callback) {

        if (!receipt.length) {
            return callback();
        }

        return async.eachSeries(callVouts, function (callVout, callback) {

            return async.waterfall([function (callback) {

                if (!receipt || !receipt[callVout.receiptIdx] || !receipt[callVout.receiptIdx].log.length) {
                    return callback();
                }

                var contractAddresses = [receipt[callVout.receiptIdx].contractAddress];

                receipt[callVout.receiptIdx].log.forEach(function (logItem) {
                    if (logItem && logItem.topics && logItem.topics.length === 3 && logItem.topics[0] === SRC20_ZERO_TOPIC_HASH && logItem.address) {
                        contractAddresses.push(logItem.address);
                    }
                });

                contractAddresses = lodash.uniq(contractAddresses);

                return async.eachSeries(contractAddresses, function (contractAddress, callback) {
                    return self.src20ContractsRepository.fetchContract(contractAddress, function (err, src20Contract) {

                        if (src20Contract) {

                            self.common.log.info('[SRC20WATCHER] Src20Contract ' + contractAddress, src20Contract);


                            return self.node.callContract(contractAddress, functionHashes['totalSupply()'], {}, function (err, data) {

                                if (err) {
                                    return callback(err);
                                }

                                var total_supply = 0;

                                try {
                                    var totalSupplyArr = SolidityCoder.decodeParams(["uint256"], data.executionResult.output);
                                    total_supply = totalSupplyArr && totalSupplyArr.length ? totalSupplyArr[0].toString(10) : 0;
                                } catch (e) {
                                }

                                if (src20Contract.total_supply === total_supply) {
                                    return callback();
                                }

                                return self.src20ContractsRepository.updateTotalSupply(contractAddress, total_supply, function (err) {
                                    return callback(err);
                                });

                            });

                        } else {
                            return callback();
                        }
                    });
                }, function (err) {
                    return callback(err);
                });

            }], function (err) {
                return callback(err);
            });

        }, function (err) {
            return callback(err);
        });

    }, function (callback) {

        if (!receipt || !receipt.length) {
            return callback();
        }

        return self.processReceipt(receipt, txHash, txTime, block, function (err) {
            return callback(err);
        });

    }], function (err) {
        return callback(err);
    });

};

/**
 *
 * @param {Number} blockHeight
 * @param {String} txHash
 * @param {Object} receipt
 * @param {Object} createVouts
 * @param {Function} callback
 * @return {*}
 */
Src20Watcher.prototype.processCreate = function (blockHeight, txHash, txTime, receipt, createVouts, callback) {

    var self = this;

    return async.waterfall([function (callback) {

        return async.eachOfSeries(createVouts, function (vout, voutCreateIdx, callback) {
            if (vout.scriptPubKey && vout.scriptPubKey.type === 'create' && ContractsHelper.isSrc20Contract(vout.scriptPubKey.hex)) {

                var voutReceipt = receipt[vout.receiptIdx],
                    scriptHex = vout.scriptPubKey.hex,
                    contractAddress = ContractsHelper.getContractAddress(txHash, vout.n),
                    creatorAddress = voutReceipt.from,
                    src20Data = {
                        block_height: blockHeight,
                        tx_hash: txHash,
                        vout_idx: vout.n,
                        contract_address: contractAddress,
                        contract_address_base: ContractsHelper.getBitAddressFromContractAddress(contractAddress, self.node.network.pubkeyhash.toString(16)),
                        tx_time: txTime,
                        tx_date_time: new Date(txTime * 1000),
                        decimals: 0,
                        name: '',
                        symbol: '',
                        total_supply: 0,
                        version: '',
                        exception: false
                    };

                if (voutReceipt.contractAddress === '0000000000000000000000000000000000000000') {//contract doesn't create
                    src20Data.exception = true;
                    return self.src20ContractsRepository.createOrUpdateTx(src20Data, function (err, row) {

                        if (err) {
                            self.common.log.error('[SRC20WATCHER] error createOrUpdateTx', err);
                            return callback(err);
                        }

                        self.common.log.info('[SRC20WATCHER] createOrUpdateTx', row);
                        return callback();
                    });
                }

                return async.waterfall([function (callback) {
                    return self.node.callContract(contractAddress, functionHashes['totalSupply()'], {}, function (err, data) {

                        if (err) {
                            return callback(err);
                        }

                        try {
                            var totalSupplyArr = SolidityCoder.decodeParams(["uint256"], data.executionResult.output);
                            src20Data['total_supply'] = totalSupplyArr && totalSupplyArr.length ? totalSupplyArr[0].toString(10) : 0;
                        } catch (e) {
                        }

                        return callback();
                    });
                }, function (callback) {

                    if (!ContractsHelper.isContainDecimals(scriptHex)) {
                        return callback();
                    }

                    return self.node.callContract(contractAddress, functionHashes['decimals()'], {}, function (err, data) {

                        if (err) {
                            return callback(err);
                        }

                        try {
                            var decimalsArr = SolidityCoder.decodeParams(["uint8"], data.executionResult.output);
                            src20Data['decimals'] = decimalsArr && decimalsArr.length ? decimalsArr[0].toNumber() : 0;
                        } catch (e) {
                        }

                        return callback();
                    });

                }, function (callback) {

                    if (!ContractsHelper.isContainName(scriptHex)) {
                        return callback();
                    }

                    return self.node.callContract(contractAddress, functionHashes['name()'], {}, function (err, data) {
                        if (err) {
                            return callback(err);
                        }
                        try {
                            var nameArr = SolidityCoder.decodeParams(["string"], data.executionResult.output);
                            src20Data['name'] = nameArr && nameArr.length ? nameArr[0] : null;
                        } catch (e) {
                        }
                        return callback();
                    });
                }, function (callback) {

                    if (!ContractsHelper.isContainVersion(scriptHex)) {
                        return callback();
                    }

                    return self.node.callContract(contractAddress, functionHashes['version()'], {}, function (err, data) {

                        if (err) {
                            return callback(err);
                        }

                        try {
                            var versionArr = SolidityCoder.decodeParams(["string"], data.executionResult.output);
                            src20Data['version'] = versionArr && versionArr.length ? versionArr[0] : null;
                        } catch (e) {
                        }

                        return callback();

                    });

                }, function (callback) {

                    if (!ContractsHelper.isContainSymbol(scriptHex)) {
                        return callback();
                    }

                    return self.node.callContract(contractAddress, functionHashes['symbol()'], {}, function (err, data) {

                        if (err) {
                            return callback(err);
                        }

                        try {
                            var symbolArr = SolidityCoder.decodeParams(["string"], data.executionResult.output);
                            src20Data['symbol'] = symbolArr && symbolArr.length ? symbolArr[0] : null;
                        } catch (e) {
                        }

                        return callback();
                    });
                }, function (callback) {
                    console.log('creatorAddress ***' + creatorAddress);
                    var ethCreatorAddress = ContractsHelper.getEthAddressFromBitAddress(creatorAddress);
                    console.log('ethCreatorAddress **' + ethCreatorAddress);
                    return self.getAddressBalance(contractAddress, ethCreatorAddress, function (err, balance) {

                        if (err) {
                            return callback(err);
                        }

                        var src20BalanceObject = {
                            address_eth: ethCreatorAddress,
                            address: creatorAddress,
                            contract_address: contractAddress,
                            amount: balance,
                        };

                        return self.checkBalance(src20BalanceObject, function (err, row) {
                            return callback(err);
                        });

                    });

                }], function (err) {

                    if (err) {
                        self.common.log.error('[SRC20WATCHER] error processTx', err);
                        return callback(err);
                    }

                    return self.src20ContractsRepository.createOrUpdateTx(src20Data, function (err, row) {

                        if (err) {
                            self.common.log.error('[SRC20WATCHER] error createOrUpdateTx', err);
                            return callback(err);
                        }

                        self.common.log.info('[SRC20WATCHER] createOrUpdateTx', row);

                        return callback();
                    });

                });
            } else {
                return async.setImmediate(function () {
                    return callback();
                });
            }
        }, function (err) {
            return callback(err);
        });

    }], function (err) {
        return callback(err);
    });

};
/**
 *
 * @param {Object} receipt
 * @param {String} txHash
 * @param {Number} txTime
 * @param {Object} block
 * @param {Function} callback
 * @return {*}
 */
Src20Watcher.prototype.processReceipt = function (receipt, txHash, txTime, block, callback) {

    var self = this;

    return async.eachSeries(receipt, function (receiptItem, callback) {

        if (!receiptItem || !receiptItem.log || !receiptItem.log.length) {
            return async.setImmediate(function () {
                return callback();
            });
        }

        return async.eachOfSeries(receiptItem.log, function (logItem, logIdx, callback) {

            return self.src20ContractsRepository.fetchContract(logItem.address, function (err, src20Contract) {

                if (err) {
                    return callback(err);
                }

                if (!src20Contract) {
                    return callback();
                }

                if (logItem && logItem.topics && logItem.topics.length === 3 && logItem.topics[0] === SRC20_ZERO_TOPIC_HASH) {

                    var addressFrom = logItem.topics[1],
                        addressTo = logItem.topics[2],
                        src20TransferData = {
                            block_height: block.height,
                            block_time: block.time,
                            block_date_time: new Date(block.time * 1000),
                            tx_hash: txHash,
                            tx_time: txTime,
                            tx_date_time: new Date(txTime * 1000),
                            log_idx: logIdx,
                            contract_address: logItem.address,
                            contract_address_base: ContractsHelper.getBitAddressFromContractAddress(logItem.address, self.node.network.pubkeyhash.toString(16)),
                            from_eth: null,
                            to_eth: null,
                            from: addressFrom,
                            to: addressTo,
                            value: 0
                        };

                    try {
                        src20TransferData.from_eth = ContractsHelper.getEthAddressFromBitAddress(addressFrom);
                    } catch (e) {
                    }

                    try {

                        src20TransferData.to_eth = ContractsHelper.getEthAddressFromBitAddress(addressTo);
                    } catch (e) {
                    }

                    try {
                        var valueToArr = SolidityCoder.decodeParams(["uint"], logItem.data);
                        src20TransferData.value = valueToArr && valueToArr.length ? valueToArr[0].toString(10) : 0;
                    } catch (e) {
                    }

                    return async.waterfall([function (callback) {
                        return self.src20TransferRepository.createOrUpdateTx(src20TransferData, function (err) {

                            return callback(err);
                        });
                    }, function (callback) {

                        if (!src20TransferData.from || !src20TransferData.to) {
                            return callback();
                        }

                        return self.updateBalances(src20TransferData, function (err) {
                            return callback(err);
                        });

                    }], function (err) {

                        self.common.log.info('[SRC20WATCHER] src20TransferData', src20TransferData);

                        // @todo  添加代币信息通知

                        var address = src20TransferData.to;
                        self.pushDeviceRepository.findByAddress(address, function (err, data) {
                            if (err) {
                                self.common.log.err('find address from mongo error:', error);
                            }

                            /*if (data) {
                                data.forEach(function (device) {
                                    if (device.address && device.alias) {
                                        if (device.language === 'zh') {
                                            // 进行推送拉取数据的标识
                                            self.client.push().setPlatform('ios', 'android')
                                                .setAudience(jPush.JPushAsync.alias(device.alias))
                                                .setNotification('Silubium Team', jPush.JPushAsync.ios('代币金额 :' + self.convertDecimals(src20TransferData.value,src20Contract.decimals) + ' ' + src20Contract.symbol+', 代币交易为：' + txHash),
                                                    jPush.JPushAsync.android('代币金额 :' + self.convertDecimals(src20TransferData.value,src20Contract.decimals) + ' ' + src20Contract.symbol+', 代币交易为：' + txHash, null, 1))
                                                //.setMessage(true,'update','application/json',null)
                                                .setOptions(null, 60)
                                                .send()
                                                .then(function (result) {
                                                    console.log(result)
                                                }).catch(function (err) {
                                                console.log(err)
                                            });
                                        } else {
                                            self.common.log.info('en push:', device);
                                            self.common.log.info('jPush.JPushAsync.alias(device.alias):', jPush.JPushAsync.alias(device.alias));
                                            // 进行推送拉取数据的标识
                                            self.client.push().setPlatform('ios', 'android')
                                                .setAudience(jPush.JPushAsync.alias(device.alias))
                                                .setNotification('Silubium Team', jPush.JPushAsync.ios('amount :' + self.convertDecimals(src20TransferData.value,src20Contract.decimals) + ' ' + src20Contract.symbol+',new token transaction : ' + txHash),
                                                    jPush.JPushAsync.android('amount :' + self.convertDecimals(src20TransferData.value,src20Contract.decimals) + ' ' + src20Contract.symbol+',new token transaction : ' + txHash, null, 1))
                                                //.setMessage(true,'update','application/json',null)
                                                .setOptions(null, 60)
                                                .send()
                                                .then(function (result) {
                                                    console.log(result)
                                                }).catch(function (err) {
                                                console.log(err)
                                            });
                                        }

                                    }
                                });
                            }*/
                        });


                        return callback(err);
                    });

                } else {
                    return callback();
                }

            });

        }, function (err) {
            return callback(err);
        });

    }, function (err) {
        return callback(err);
    });

};


Src20Watcher.prototype.convertDecimals = function (amount, decimals) {

    if (!amount) {
        return 0;
    }

    var valueBN = new BigNumber(amount);

    return valueBN.dividedBy('1e' + (decimals ? decimals : 0)).toString(10);
};


/**
 *
 * @param {Object} src20TransferData
 * @param {Function} callback
 */
Src20Watcher.prototype.updateBalances = function (src20TransferData, callback) {

    var self = this,
        dataFlow = {
            to: null,
            from: null
        };

    return async.waterfall([function (callback) {
        return self.src20BalanceRepository.findBalanceByEthAddress(src20TransferData.contract_address, src20TransferData.from_eth, function (err, result) {

            if (err) {
                return callback(err);
            }

            var from;

            if (!result) {
                from = {
                    contract_address: src20TransferData.contract_address,
                    address_eth: src20TransferData.from_eth,
                    address: src20TransferData.from,
                    amount: 0
                };
            } else {
                from = {
                    contract_address: result.contract_address,
                    address_eth: result.address_eth,
                    address: result.address,
                    amount: result.amount
                };
            }

            dataFlow.from = from;

            return callback();

        });
    }, function (callback) {
        return self.src20BalanceRepository.findBalanceByEthAddress(src20TransferData.contract_address, src20TransferData.to_eth, function (err, result) {

            if (err) {
                return callback(err);
            }

            var to;

            if (!result) {
                to = {
                    contract_address: src20TransferData.contract_address,
                    address_eth: src20TransferData.to_eth,
                    address: src20TransferData.to,
                    amount: 0
                };
            } else {
                to = {
                    contract_address: result.contract_address,
                    address_eth: result.address_eth,
                    address: result.address,
                    amount: result.amount
                };
            }

            dataFlow.to = to;

            return callback();

        });
    }, function (callback) {

        return async.waterfall([function (callback) {
            return self.getAddressBalance(src20TransferData.contract_address, dataFlow.from.address_eth, function (err, balance) {

                if (err) {
                    return callback(err);
                }

                dataFlow.from.amount = balance;

                return callback();

            });
        }, function (callback) {
            return self.getAddressBalance(src20TransferData.contract_address, dataFlow.to.address_eth, function (err, balance) {

                if (err) {
                    return callback(err);
                }

                dataFlow.to.amount = balance;

                return callback();
            })
        }], function (err) {
            return callback(err);
        });

    }, function (callback) {

        return async.waterfall([function (callback) {

            return self.checkBalance(dataFlow.from, function (err) {
                return callback(err);
            });

        }, function (callback) {

            return self.checkBalance(dataFlow.to, function (err) {
                return callback(err);
            });

        }], function (err) {
            return callback(err);
        });

    }], function (err) {
        return callback(err);
    });

};

/**
 *
 * @param {Object} balanceItem
 * @param {Function} callback
 */
Src20Watcher.prototype.checkBalance = function (balanceItem, callback) {
    var self = this;
    var amountBN = new BigNumber(balanceItem.amount);

    if (amountBN.gt(0)) {

        var maxCountSymbols = "0000000000000000000000000000000000000000000000000000000000000000";

        balanceItem.amount_hex = (maxCountSymbols + amountBN.toString(16)).substr(-maxCountSymbols.length);
        balanceItem.contract_address_base = ContractsHelper.getBitAddressFromContractAddress(balanceItem.contract_address, self.node.network.pubkeyhash.toString(16));

        return self.src20BalanceRepository.createOrUpdateBalance(balanceItem, function (err) {
            return callback(err);
        });

    } else {
        return self.src20BalanceRepository.removeBalance(balanceItem, function (err) {
            return callback(err);
        });
    }
};

/**
 *
 * @param {String} contractAddress
 * @param {String} address
 * @param {Function} callback
 * @return {*}
 */
Src20Watcher.prototype.getAddressBalance = function (contractAddress, address, callback) {
    var self = this;
    try {
        if (!address.startsWith('0x')) {
            address = '0x' + address;
        }
        var payload = SolidityCoder.encodeParam('address', address);

        return self.node.callContract(contractAddress, functionHashes['balanceOf(address)'] + payload, {}, function (err, data) {

            if (err) {
                return callback(err);
            }

            if (data && data.executionResult) {

                try {

                    var decodedBalance = SolidityCoder.decodeParam("uint256", data.executionResult.output);

                    return callback(null, decodedBalance.toString(10));

                } catch (e) {
                }

            }


            return callback(null, 0);


        });
    } catch (e) {
        return async.setImmediate(function () {
            return callback(null, 0);
        });
    }

};
/**
 *
 * @param {number} height
 * @param {function} next
 * @return {*}
 * @private
 */
Src20Watcher.prototype._processLastBlocks = function (height, next) {

    var self = this,
        blocks = [];

    for (var i = self.lastCheckedBlock + 1; i <= height; i++) {
        blocks.push(i);
    }

    return async.eachSeries(blocks, function (blockHeight, callback) {
        return self.processBlock(blockHeight, function (err) {
            if (err) {
                return callback(err);
            }

            self.lastCheckedBlock = blockHeight;

            return callback();

        });
    }, function (err) {

        if (err) {
            self.common.log.error('[SRC20WATCHER] Update Error', err);
            return next(err);
        }

        return next();
    });
};

/**
 *
 * @param {number} height
 * @returns {boolean}
 * @private
 */
Src20Watcher.prototype._rapidProtectedUpdateTip = function (height) {

    var self = this;

    if (height > this.lastTipHeight) {
        this.lastTipHeight = height;
    }


    if (this.lastTipInProcess) {
        return false;
    }

    this.lastTipInProcess = true;

    self.common.log.info('[SRC20WATCHER] start upd from ', self.lastCheckedBlock + 1, ' to ', height);

    return this._processLastBlocks(height, function (err) {

        self.lastTipInProcess = false;

        if (err) {
            return false;
        }

        self.common.log.info('[SRC20WATCHER] updated to ', height);

        if (self.lastTipHeight !== height) {
            self._rapidProtectedUpdateTip(self.lastTipHeight);
        }

    });

};

module.exports = Src20Watcher;