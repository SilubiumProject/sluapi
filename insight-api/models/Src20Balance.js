const mongoose = require('mongoose');

const src20BalanceSchema = new mongoose.Schema({
    contract_address_base: {
        type: String,
        required: true
    },
    contract_address: {
        type: String,
        required: true
    },
    address_eth: {
        type: String
    },
    address: {
        type: String
    },
    amount: {
        type: String
    },
    amount_hex: {
        type: String
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

const Src20Balance = mongoose.model('Src20Balance', src20BalanceSchema);

module.exports = Src20Balance;