const mongoose = require('mongoose');

const src20ContractsSchema = new mongoose.Schema({
    block_height: {
        type: Number
    },
    tx_hash: {
        type: String,
        required: true
    },
    vout_idx: {
        type: Number,
        required: true
    },
    contract_address_base: {
        type: String,
        required: true
    },
    contract_address: {
        type: String,
        required: true
    },
    tx_date_time: {
        type: Date,
        required: true
    },
    tx_time: {
        type: Number,
        required: true
    },
    symbol: {
        type: String
    },
    decimals: {
        type: String
    },
    name: {
        type: String
    },
    version: {
        type: String
    },
    total_supply: {
        type: String
    },
    exception: {
        type: Boolean
    },
    description: {
        type: String,
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Src20Contracts = mongoose.model('Src20Contracts', src20ContractsSchema);

module.exports = Src20Contracts;